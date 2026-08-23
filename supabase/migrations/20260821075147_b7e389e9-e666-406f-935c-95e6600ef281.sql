-- Permission catalogue by module
INSERT INTO public.permissions (key, label, category) VALUES
  ('Orders.View','عرض الطلبات','الطلبات'),
  ('Orders.Create','إنشاء طلب','الطلبات'),
  ('Orders.Edit','تعديل طلب','الطلبات'),
  ('Orders.Delete','حذف طلب','الطلبات'),
  ('Orders.Assign','إسناد طلب','الطلبات'),
  ('Sellers.View','عرض البائعين','البائعون'),
  ('Sellers.Create','إنشاء بائع','البائعون'),
  ('Sellers.Edit','تعديل بائع','البائعون'),
  ('Sellers.Suspend','إيقاف بائع','البائعون'),
  ('CallCenters.View','عرض مراكز الاتصال','الكول سنتر'),
  ('CallCenters.Create','إنشاء مركز اتصال','الكول سنتر'),
  ('CallCenters.Edit','تعديل مركز اتصال','الكول سنتر'),
  ('CallCenters.Suspend','إيقاف مركز اتصال','الكول سنتر'),
  ('Complaints.View','عرض الشكاوى','الشكاوى'),
  ('Complaints.Manage','إدارة الشكاوى','الشكاوى'),
  ('Wallet.View','عرض المحفظة','المالية'),
  ('Wallet.Manage','إدارة المحفظة','المالية'),
  ('Reports.View','عرض التقارير','التقارير'),
  ('Settings.View','عرض الإعدادات','الإعدادات'),
  ('Settings.Edit','تعديل الإعدادات','الإعدادات'),
  ('Users.View','عرض المستخدمين','إدارة المستخدمين'),
  ('Users.Manage','إدارة المستخدمين','إدارة المستخدمين'),
  ('Roles.View','عرض الأدوار','إدارة المستخدمين'),
  ('Roles.Manage','إدارة الأدوار والصلاحيات','إدارة المستخدمين'),
  ('Activity.View','عرض سجل النشاطات','إدارة المستخدمين')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category;

-- Staff roles
CREATE TYPE public.staff_role_status AS ENUM ('active','disabled');

CREATE TABLE public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status public.staff_role_status NOT NULL DEFAULT 'active',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.staff_roles(id) ON DELETE CASCADE,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_role_permissions TO authenticated;
GRANT ALL ON public.staff_role_permissions TO service_role;
ALTER TABLE public.staff_role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN staff_role_id uuid REFERENCES public.staff_roles(id) ON DELETE RESTRICT;

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER staff_roles_updated_at BEFORE UPDATE ON public.staff_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Effective permission check
CREATE OR REPLACE FUNCTION public.has_perm(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.staff_roles r ON r.id = p.staff_role_id
      WHERE p.id = _user_id AND r.is_system AND r.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.permission = _perm AND up.granted
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.staff_roles r ON r.id = p.staff_role_id AND r.status = 'active'
        JOIN public.staff_role_permissions rp ON rp.role_id = r.id
        WHERE p.id = _user_id AND rp.permission = _perm
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = _user_id AND up.permission = _perm AND NOT up.granted
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(k.key), '{}')
  FROM public.permissions k
  WHERE public.has_perm(auth.uid(), k.key)
$$;

CREATE POLICY staff_roles_read ON public.staff_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY staff_roles_insert ON public.staff_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_perm(auth.uid(),'Roles.Manage'));
CREATE POLICY staff_roles_update ON public.staff_roles FOR UPDATE TO authenticated
  USING (public.has_perm(auth.uid(),'Roles.Manage') AND NOT is_system)
  WITH CHECK (public.has_perm(auth.uid(),'Roles.Manage') AND NOT is_system);
CREATE POLICY staff_roles_delete ON public.staff_roles FOR DELETE TO authenticated
  USING (public.has_perm(auth.uid(),'Roles.Manage') AND NOT is_system
         AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.staff_role_id = staff_roles.id));

CREATE POLICY srp_read ON public.staff_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY srp_insert ON public.staff_role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm(auth.uid(),'Roles.Manage')
    AND NOT EXISTS (SELECT 1 FROM public.staff_roles r WHERE r.id = role_id AND r.is_system));
CREATE POLICY srp_delete ON public.staff_role_permissions FOR DELETE TO authenticated
  USING (public.has_perm(auth.uid(),'Roles.Manage')
    AND NOT EXISTS (SELECT 1 FROM public.staff_roles r WHERE r.id = role_id AND r.is_system));

CREATE POLICY user_permissions_read ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_perm(auth.uid(),'Roles.Manage'));
CREATE POLICY user_permissions_write ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm(auth.uid(),'Roles.Manage'));
CREATE POLICY user_permissions_update ON public.user_permissions FOR UPDATE TO authenticated
  USING (public.has_perm(auth.uid(),'Roles.Manage')) WITH CHECK (public.has_perm(auth.uid(),'Roles.Manage'));
CREATE POLICY user_permissions_delete ON public.user_permissions FOR DELETE TO authenticated
  USING (public.has_perm(auth.uid(),'Roles.Manage'));

-- Seed initial roles
INSERT INTO public.staff_roles (name, description, is_system) VALUES
  ('Super Admin','صلاحيات كاملة على النظام', true),
  ('Operations Manager','إدارة الطلبات والبائعين ومراكز الاتصال', false),
  ('Support','متابعة الطلبات والشكاوى', false),
  ('Finance','إدارة المحفظة والتقارير المالية', false);

INSERT INTO public.staff_role_permissions (role_id, permission)
SELECT r.id, p.key FROM public.staff_roles r, public.permissions p
WHERE r.name = 'Operations Manager'
  AND p.key IN ('Orders.View','Orders.Create','Orders.Edit','Orders.Assign','Sellers.View','Sellers.Edit',
                'CallCenters.View','CallCenters.Edit','Complaints.View','Complaints.Manage','Reports.View','Users.View');

INSERT INTO public.staff_role_permissions (role_id, permission)
SELECT r.id, p.key FROM public.staff_roles r, public.permissions p
WHERE r.name = 'Support'
  AND p.key IN ('Orders.View','Complaints.View','Complaints.Manage','Sellers.View','CallCenters.View');

INSERT INTO public.staff_role_permissions (role_id, permission)
SELECT r.id, p.key FROM public.staff_roles r, public.permissions p
WHERE r.name = 'Finance'
  AND p.key IN ('Wallet.View','Wallet.Manage','Reports.View','Orders.View');

-- Role overview RPC
CREATE OR REPLACE FUNCTION public.staff_roles_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'name', r.name, 'description', r.description,
    'status', r.status::text, 'is_system', r.is_system,
    'created_at', r.created_at, 'updated_at', r.updated_at,
    'employees_count', (SELECT count(*) FROM public.profiles p WHERE p.staff_role_id = r.id),
    'permissions_count', CASE WHEN r.is_system THEN (SELECT count(*) FROM public.permissions)
                              ELSE (SELECT count(*) FROM public.staff_role_permissions rp WHERE rp.role_id = r.id) END
  ) ORDER BY r.is_system DESC, r.name), '[]'::jsonb)
  FROM public.staff_roles r
$$;