-- 1) إزالة النظام القديم (role_permissions + has_permission) لمنع التكرار
DROP POLICY IF EXISTS role_permissions_admin_delete ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_admin_write ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
DROP TABLE IF EXISTS public.role_permissions;
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);

-- 2) حذف مفاتيح الصلاحيات القديمة المكررة
DELETE FROM public.staff_role_permissions
 WHERE permission IN ('users.view','users.edit','users.status','users.security','users.impersonate',
                      'employees.manage','roles.manage','activity.view','sellers.view','callcenters.view','dashboard.view');
DELETE FROM public.user_permissions
 WHERE permission IN ('users.view','users.edit','users.status','users.security','users.impersonate',
                      'employees.manage','roles.manage','activity.view','sellers.view','callcenters.view','dashboard.view');
DELETE FROM public.permissions
 WHERE key IN ('users.view','users.edit','users.status','users.security','users.impersonate',
               'employees.manage','roles.manage','activity.view','sellers.view','callcenters.view','dashboard.view');

-- 3) منع تصعيد الصلاحيات عند تعديل صلاحيات الأدوار
DROP POLICY IF EXISTS srp_insert ON public.staff_role_permissions;
CREATE POLICY srp_insert ON public.staff_role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_perm(auth.uid(), 'Roles.Manage')
    AND public.has_perm(auth.uid(), permission)
    AND NOT EXISTS (SELECT 1 FROM public.staff_roles r WHERE r.id = role_id AND r.is_system)
  );

-- 4) فرض الصلاحيات فعليًا على مستوى قاعدة البيانات (قراءة بيانات التشغيل)
CREATE POLICY orders_perm_read ON public.orders
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'Orders.View'));
CREATE POLICY sellers_perm_read ON public.sellers
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'Sellers.View'));
CREATE POLICY call_centers_perm_read ON public.call_centers
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'CallCenters.View'));
CREATE POLICY complaints_perm_read ON public.complaints
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'Complaints.View'));
CREATE POLICY calls_perm_read ON public.calls
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'Orders.View'));
CREATE POLICY transactions_perm_read ON public.transactions
  FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'Wallet.View'));

-- 5) حماية Super Admin: لا يمكن تعطيله أو تعديله
CREATE OR REPLACE FUNCTION public.protect_system_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'SYSTEM_ROLE_PROTECTED';
  end if;
  if tg_op = 'UPDATE' and old.is_system and (new.status <> old.status or new.is_system <> old.is_system) then
    raise exception 'SYSTEM_ROLE_PROTECTED';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

DROP TRIGGER IF EXISTS staff_roles_protect_system ON public.staff_roles;
CREATE TRIGGER staff_roles_protect_system
  BEFORE UPDATE OR DELETE ON public.staff_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_role();