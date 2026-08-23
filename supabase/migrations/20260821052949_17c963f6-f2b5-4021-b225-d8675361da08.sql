CREATE OR REPLACE FUNCTION public.sellers_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _items jsonb;
  _stats jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH agg AS (
    SELECT s.id,
           s.name,
           s.category,
           s.status,
           s.balance,
           s.score,
           COUNT(o.id) AS orders_count,
           COUNT(o.id) FILTER (WHERE o.status = 'confirmed') AS confirmed_count
    FROM public.sellers s
    LEFT JOIN public.orders o ON o.seller_id = s.id
    GROUP BY s.id
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'category', category,
      'status', status,
      'balance', balance,
      'score', score,
      'orders_count', orders_count,
      'confirmed_count', confirmed_count,
      'confirm_rate', CASE WHEN orders_count > 0 THEN ROUND((confirmed_count::numeric * 100) / orders_count, 1) ELSE 0 END
    ) ORDER BY name), '[]'::jsonb),
    jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE status = 'active'),
      'inactive', COUNT(*) FILTER (WHERE status <> 'active'),
      'total_orders', COALESCE(SUM(orders_count), 0)
    )
  INTO _items, _stats
  FROM agg;

  RETURN jsonb_build_object('items', _items, 'stats', _stats);
END;
$$;

REVOKE ALL ON FUNCTION public.sellers_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sellers_overview() TO authenticated;