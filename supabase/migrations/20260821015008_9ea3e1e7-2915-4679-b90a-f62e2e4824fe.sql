create or replace function public.admin_dashboard(_from timestamptz, _to timestamptz)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_days numeric;
  v_total int;
  v_confirmed int;
  v_late int;
  v_result jsonb;
  v_peak_start int;
  v_peak_avg numeric;
  v_today int;
  v_avg_daily numeric;
  v_late_rate numeric;
  v_status text;
  v_reason text;
begin
  v_days := greatest(extract(epoch from (_to - _from)) / 86400.0, 1);

  select count(*),
         count(*) filter (where status = 'confirmed'),
         count(*) filter (where coalesce(first_attempt_at, now()) > created_at + (target_response_minutes * interval '1 minute'))
    into v_total, v_confirmed, v_late
  from public.orders where created_at >= _from and created_at < _to;

  v_avg_daily := round(v_total / v_days, 1);
  v_late_rate := case when v_total > 0 then round(v_late * 100.0 / v_total, 1) else 0 end;

  select count(*) into v_today from public.orders where created_at >= date_trunc('day', now());

  -- peak window (3 hours) across full history
  with hourly as (
    select extract(hour from created_at)::int h, count(*)::numeric c
    from public.orders group by 1
  ), win as (
    select h,
           coalesce((select sum(c) from hourly x where x.h between hh.h and hh.h + 2), 0) total3
    from (select generate_series(0,21) h) hh
  )
  select h into v_peak_start from win order by total3 desc limit 1;

  select round(avg(cnt), 0) into v_peak_avg from (
    select created_at::date d, count(*) cnt
    from public.orders
    where extract(hour from created_at)::int between coalesce(v_peak_start,0) and coalesce(v_peak_start,0) + 2
    group by 1
  ) t;

  if v_late_rate > 15 then
    v_status := 'late'; v_reason := 'نسبة الطلبات المتأخرة تجاوزت الحد المقبول.';
  elsif v_avg_daily > 0 and v_today > v_avg_daily * 1.2 then
    v_status := 'pressure'; v_reason := 'حجم الطلبات الحالي أعلى من المتوسط.';
  else
    v_status := 'normal'; v_reason := 'الطلبات تسير ضمن المعدل الطبيعي.';
  end if;

  select jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to, 'days', round(v_days, 1)),
    'platform_status', jsonb_build_object('status', v_status, 'reason', v_reason),
    'attention', (
      select jsonb_build_object(
        'late_orders', (select count(*) from public.orders where status in ('new','in_progress') and now() > created_at + (target_response_minutes * interval '1 minute')),
        'unhandled_orders', (select count(*) from public.orders where handled = false),
        'pending_withdrawals', (select count(*) from public.transactions where type = 'withdrawal' and status = 'pending'),
        'pending_deposits', (select count(*) from public.transactions where type = 'deposit' and status = 'pending'),
        'open_complaints', (select count(*) from public.complaints where status = 'open')
      )
    ),
    'key_numbers', jsonb_build_object(
      'total_orders', v_total,
      'avg_daily_orders', v_avg_daily,
      'success_rate', case when v_total > 0 then round(v_confirmed * 100.0 / v_total, 1) else 0 end,
      'avg_first_attempt_minutes', coalesce((select round(avg(extract(epoch from (first_attempt_at - created_at))/60.0), 1) from public.orders where created_at >= _from and created_at < _to and first_attempt_at is not null), 0),
      'avg_call_seconds', coalesce((select round(avg(extract(epoch from (ended_at - started_at))), 0) from public.calls where started_at >= _from and started_at < _to and ended_at is not null), 0),
      'avg_attempts', coalesce((select round(avg(attempts_count), 1) from public.orders where created_at >= _from and created_at < _to), 0),
      'late_response_rate', v_late_rate,
      'total_incentives', coalesce((select round(sum(amount), 2) from public.transactions where type = 'incentive' and status = 'completed' and created_at >= _from and created_at < _to), 0),
      'calls_done', (select count(*) from public.calls where started_at >= _from and started_at < _to)
    ),
    'sellers', jsonb_build_object(
      'total', (select count(*) from public.sellers),
      'active', (select count(*) from public.sellers where is_active),
      'active_rate', case when (select count(*) from public.sellers) > 0 then round((select count(*) from public.sellers where is_active) * 100.0 / (select count(*) from public.sellers), 1) else 0 end,
      'avg_orders_per_seller', case when (select count(*) from public.sellers) > 0 then round(v_total::numeric / (select count(*) from public.sellers), 1) else 0 end
    ),
    'call_centers', jsonb_build_object(
      'total', (select count(*) from public.call_centers),
      'active', (select count(*) from public.call_centers where is_active),
      'active_rate', case when (select count(*) from public.call_centers) > 0 then round((select count(*) from public.call_centers where is_active) * 100.0 / (select count(*) from public.call_centers), 1) else 0 end,
      'avg_calls_per_center_daily', case when (select count(*) from public.call_centers) > 0 then round((select count(*) from public.calls where started_at >= _from and started_at < _to)::numeric / ((select count(*) from public.call_centers) * v_days), 1) else 0 end
    ),
    'finance', jsonb_build_object(
      'seller_dues', coalesce((select round(sum(amount),2) from public.transactions where type = 'seller_payout' and status = 'pending'), 0),
      'callcenter_dues', coalesce((select round(sum(amount),2) from public.transactions where type = 'callcenter_payout' and status = 'pending'), 0),
      'platform_balance', coalesce((select round(sum(case when type = 'deposit' then amount else -amount end), 2) from public.transactions where status = 'completed' and type in ('deposit','withdrawal','seller_payout','callcenter_payout','incentive')), 0),
      'platform_profit', coalesce((select round(sum(amount),2) from public.transactions where type = 'platform_fee' and status = 'completed' and created_at >= _from and created_at < _to), 0),
      'total_incentives', coalesce((select round(sum(amount),2) from public.transactions where type = 'incentive' and status = 'completed' and created_at >= _from and created_at < _to), 0)
    ),
    'peak', jsonb_build_object(
      'start_hour', v_peak_start,
      'end_hour', case when v_peak_start is null then null else v_peak_start + 3 end,
      'avg_orders', coalesce(v_peak_avg, 0)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated, service_role;