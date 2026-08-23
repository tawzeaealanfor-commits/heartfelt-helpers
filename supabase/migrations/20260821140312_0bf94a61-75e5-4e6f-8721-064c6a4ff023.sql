REVOKE EXECUTE ON FUNCTION public.admin_orders_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_order_detail(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_orders_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_detail(uuid) TO authenticated;