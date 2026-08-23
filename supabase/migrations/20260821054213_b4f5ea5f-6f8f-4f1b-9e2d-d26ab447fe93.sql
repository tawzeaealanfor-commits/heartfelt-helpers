-- 1. account status enum
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('active','suspended','disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. profiles extra columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS call_center_id uuid REFERENCES public.call_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles admin management
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
CREATE POLICY user_roles_insert_admin ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
CREATE POLICY user_roles_update_admin ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;
CREATE POLICY user_roles_delete_admin ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 3. activity log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  acting_for_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_select ON public.activity_log;
CREATE POLICY activity_log_select ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR actor_id = auth.uid() OR acting_for_id = auth.uid());
DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_acting_for_idx ON public.activity_log (acting_for_id);

-- 4. permissions catalog + role permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'عام'
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissions_read ON public.permissions;
CREATE POLICY permissions_read ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
GRANT SELECT, INSERT, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS role_permissions_admin_write ON public.role_permissions;
CREATE POLICY role_permissions_admin_write ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS role_permissions_admin_delete ON public.role_permissions;
CREATE POLICY role_permissions_admin_delete ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.permissions (key, label, category) VALUES
  ('users.view','عرض المستخدمين','إدارة المستخدمين'),
  ('users.edit','تعديل المستخدمين','إدارة المستخدمين'),
  ('users.status','تغيير حالة الحساب','إدارة المستخدمين'),
  ('users.security','إدارة الأمان وكلمات المرور','إدارة المستخدمين'),
  ('users.impersonate','الدخول نيابة عن المستخدم','إدارة المستخدمين'),
  ('employees.manage','إدارة الموظفين','إدارة المستخدمين'),
  ('roles.manage','إدارة الأدوار والصلاحيات','إدارة المستخدمين'),
  ('activity.view','عرض سجل النشاطات','إدارة المستخدمين'),
  ('sellers.view','عرض البائعين','التشغيل'),
  ('callcenters.view','عرض مراكز الاتصال','التشغيل'),
  ('dashboard.view','عرض لوحة التحكم','التشغيل')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission)
SELECT 'admin'::public.app_role, key FROM public.permissions
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role, permission)
SELECT 'management'::public.app_role, key FROM public.permissions
WHERE key IN ('users.view','sellers.view','callcenters.view','dashboard.view','activity.view')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  )
$$;

-- 5. signup handling per portal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  has_admin boolean;
  acct text;
  new_role public.app_role;
  v_seller_id uuid;
  v_cc_id uuid;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1));
  acct := coalesce(new.raw_user_meta_data->>'account_type', '');

  select exists(select 1 from public.user_roles where role = 'admin') into has_admin;

  if acct = 'seller' then
    new_role := 'seller';
    insert into public.sellers (name, category) values (v_name, coalesce(new.raw_user_meta_data->>'category','غير محدد'))
    returning id into v_seller_id;
  elsif acct = 'call_center' then
    new_role := 'call_center';
    insert into public.call_centers (name, code) values (v_name, 'CC-' || upper(substr(replace(new.id::text,'-',''),1,6)))
    returning id into v_cc_id;
  elsif acct = 'management' then
    new_role := 'management';
  elsif not has_admin then
    new_role := 'admin';
  else
    new_role := 'user';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, phone, seller_id, call_center_id)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.raw_user_meta_data->>'phone',
    v_seller_id,
    v_cc_id
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, new_role)
  on conflict do nothing;
  return new;
end; $$;

-- 6. admin users list (reads auth metadata safely)
CREATE OR REPLACE FUNCTION public.admin_users_list()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]'::jsonb) into result
  from (
    select p.id,
           p.full_name,
           p.email,
           p.phone,
           p.avatar_url,
           p.status::text as status,
           p.force_password_change,
           p.seller_id,
           p.call_center_id,
           p.created_at,
           coalesce(au.last_sign_in_at, p.last_sign_in_at) as last_sign_in_at,
           coalesce((select r.role::text from public.user_roles r where r.user_id = p.id order by
              case r.role when 'admin' then 1 when 'management' then 2 when 'employee' then 3
                          when 'seller' then 4 when 'call_center' then 5 else 6 end limit 1), 'user') as account_type
    from public.profiles p
    left join auth.users au on au.id = p.id
  ) u;

  return result;
end; $$;

-- 7. per-user detail (profile + role + stats source ids)
CREATE OR REPLACE FUNCTION public.admin_user_detail(_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'profile', (
      select to_jsonb(x) from (
        select p.id, p.full_name, p.email, p.phone, p.avatar_url, p.status::text as status,
               p.force_password_change, p.seller_id, p.call_center_id, p.created_at,
               coalesce(au.last_sign_in_at, p.last_sign_in_at) as last_sign_in_at,
               coalesce((select r.role::text from public.user_roles r where r.user_id = p.id order by
                  case r.role when 'admin' then 1 when 'management' then 2 when 'employee' then 3
                              when 'seller' then 4 when 'call_center' then 5 else 6 end limit 1), 'user') as account_type
        from public.profiles p left join auth.users au on au.id = p.id where p.id = _id
      ) x
    ),
    'roles', (select coalesce(jsonb_agg(r.role::text), '[]'::jsonb) from public.user_roles r where r.user_id = _id),
    'seller', (
      select case when p.seller_id is null then null else (
        select jsonb_build_object(
          'id', s.id, 'name', s.name, 'category', s.category, 'status', s.status::text,
          'balance', s.balance, 'score', s.score,
          'orders_count', (select count(*) from public.orders o where o.seller_id = s.id),
          'confirmed_count', (select count(*) from public.orders o where o.seller_id = s.id and o.status='confirmed'),
          'total_amount', coalesce((select round(sum(o.amount),2) from public.orders o where o.seller_id = s.id),0)
        ) from public.sellers s where s.id = p.seller_id) end
      from public.profiles p where p.id = _id
    ),
    'call_center', (
      select case when p.call_center_id is null then null else (
        select jsonb_build_object(
          'id', c.id, 'name', c.name, 'code', c.code, 'status', c.status::text, 'score', c.score,
          'orders_count', (select count(*) from public.orders o where o.call_center_id = c.id),
          'confirmed_count', (select count(*) from public.orders o where o.call_center_id = c.id and o.status='confirmed'),
          'calls_count', (select count(*) from public.calls cl where cl.call_center_id = c.id)
        ) from public.call_centers c where c.id = p.call_center_id) end
      from public.profiles p where p.id = _id
    ),
    'activity', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (select l.id, l.action, l.entity_type, l.entity_id, l.details, l.created_at, l.actor_id, l.acting_for_id
            from public.activity_log l where l.actor_id = _id or l.acting_for_id = _id
            order by l.created_at desc limit 100) a
    )
  ) into result;

  return result;
end; $$;

-- 8. activity log listing with names
CREATE OR REPLACE FUNCTION public.admin_activity_log(_limit int DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'FORBIDDEN';
  end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) into result
  from (
    select l.id, l.action, l.entity_type, l.entity_id, l.details, l.created_at,
           l.actor_id, l.acting_for_id,
           pa.full_name as actor_name, pa.email as actor_email,
           pt.full_name as target_name, pt.email as target_email
    from public.activity_log l
    left join public.profiles pa on pa.id = l.actor_id
    left join public.profiles pt on pt.id = l.acting_for_id
    order by l.created_at desc
    limit _limit
  ) a;
  return result;
end; $$;

REVOKE EXECUTE ON FUNCTION public.admin_users_list() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;