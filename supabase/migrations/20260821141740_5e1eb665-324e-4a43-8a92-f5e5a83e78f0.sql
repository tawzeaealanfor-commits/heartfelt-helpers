CREATE OR REPLACE FUNCTION public.admin_orders_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _items jsonb;
  _stats jsonb;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_perm(auth.uid(),'Orders.View')) then
    raise exception 'FORBIDDEN';
  end if;

  with base as (
    select o.id,
           o.order_no,
           o.customer_name,
           o.product_name,
           o.amount,
           o.status::text as status,
           o.call_status,
           o.handled,
           o.created_at,
           o.attempts_count,
           (now() > o.created_at + (o.target_response_minutes * interval '1 minute')
             and o.status in ('new','in_progress')) as is_late,
           s.name as seller_name,
           c.name as call_center_name,
           case when c.id is null then null
                else round(least(10, greatest(1, c.score / 10.0))::numeric, 1)
           end as call_center_rating,
           (select count(*) from public.calls cl where cl.order_id = o.id and cl.recording_url is not null) as recordings_count,
           (select count(*) from public.calls cl where cl.order_id = o.id and cl.screenshot_url is not null) as screenshots_count
    from public.orders o
    left join public.sellers s on s.id = o.seller_id
    left join public.call_centers c on c.id = o.call_center_id
  )
  select
    coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc), '[]'::jsonb),
    jsonb_build_object(
      'total', count(*),
      'new', count(*) filter (where status = 'new'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'confirmed', count(*) filter (where status = 'confirmed'),
      'rejected', count(*) filter (where status = 'rejected'),
      'unconfirmed', count(*) filter (where status <> 'confirmed'),
      'unhandled', count(*) filter (where handled = false),
      'late', count(*) filter (where is_late)
    )
  into _items, _stats
  from base b;

  return jsonb_build_object('items', _items, 'stats', _stats);
end;
$function$;