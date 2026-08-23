CREATE OR REPLACE FUNCTION public.seller_dashboard(_seller_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare
  result jsonb;
  allowed boolean;
begin
  select public.has_role(auth.uid(),'admin')
      or exists(select 1 from public.profiles p where p.id = auth.uid() and p.seller_id = _seller_id)
    into allowed;
  if not allowed then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'seller', (select jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category,
                 'status', s.status::text, 'balance', s.balance, 'score', s.score)
               from public.sellers s where s.id = _seller_id),
    'stats', (
      select jsonb_build_object(
        'total_orders', count(*),
        'confirmed', count(*) filter (where o.status='confirmed'),
        'rejected', count(*) filter (where o.status='rejected'),
        'in_progress', count(*) filter (where o.status in ('new','in_progress')),
        'confirm_rate', case when count(*) > 0 then round(count(*) filter (where o.status='confirmed')::numeric*100/count(*),1) else 0 end,
        'total_amount', coalesce(round(sum(o.amount),2),0)
      ) from public.orders o where o.seller_id = _seller_id
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (select o.id, o.status::text as status, o.amount, o.handled, o.created_at
            from public.orders o where o.seller_id = _seller_id
            order by o.created_at desc limit 20) x
    )
  ) into result;
  return result;
end; $$;

CREATE OR REPLACE FUNCTION public.callcenter_dashboard(_cc_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare
  result jsonb;
  allowed boolean;
begin
  select public.has_role(auth.uid(),'admin')
      or exists(select 1 from public.profiles p where p.id = auth.uid() and p.call_center_id = _cc_id)
    into allowed;
  if not allowed then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'call_center', (select jsonb_build_object('id', c.id, 'name', c.name, 'code', c.code,
                      'status', c.status::text, 'score', c.score)
                    from public.call_centers c where c.id = _cc_id),
    'stats', (
      select jsonb_build_object(
        'total_orders', count(*),
        'confirmed', count(*) filter (where o.status='confirmed'),
        'rejected', count(*) filter (where o.status='rejected'),
        'in_progress', count(*) filter (where o.status in ('new','in_progress')),
        'confirm_rate', case when count(*) > 0 then round(count(*) filter (where o.status='confirmed')::numeric*100/count(*),1) else 0 end,
        'calls_count', (select count(*) from public.calls cl where cl.call_center_id = _cc_id),
        'avg_call_seconds', coalesce((select round(avg(extract(epoch from (cl.ended_at - cl.started_at))),0)
                                      from public.calls cl where cl.call_center_id = _cc_id and cl.ended_at is not null),0)
      ) from public.orders o where o.call_center_id = _cc_id
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (select o.id, o.status::text as status, o.amount, o.handled, o.created_at
            from public.orders o where o.call_center_id = _cc_id
            order by o.created_at desc limit 20) x
    )
  ) into result;
  return result;
end; $$;

REVOKE EXECUTE ON FUNCTION public.seller_dashboard(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.callcenter_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.callcenter_dashboard(uuid) TO authenticated;