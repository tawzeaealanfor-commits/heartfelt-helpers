DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'callcenter_status') THEN
    CREATE TYPE public.callcenter_status AS ENUM ('active','inactive','disabled');
  END IF;
END $$;

ALTER TABLE public.call_centers
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS status public.callcenter_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS score numeric NOT NULL DEFAULT 0;

UPDATE public.call_centers c
SET code = 'CC-' || lpad((row_number_val)::text, 4, '0')
FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS row_number_val FROM public.call_centers) s
WHERE s.id = c.id AND c.code IS NULL;

ALTER TABLE public.call_centers ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS call_centers_code_key ON public.call_centers (code);

UPDATE public.call_centers SET status = CASE WHEN is_active THEN 'active'::public.callcenter_status ELSE 'inactive'::public.callcenter_status END
WHERE status = 'active' AND is_active = false;

WITH m AS (
  SELECT o.call_center_id AS id,
         count(*) FILTER (WHERE o.status = 'confirmed')::numeric / GREATEST(count(*), 1) AS rate
  FROM public.orders o WHERE o.call_center_id IS NOT NULL GROUP BY o.call_center_id
)
UPDATE public.call_centers c SET score = round(LEAST(100, m.rate * 100), 1)
FROM m WHERE m.id = c.id AND c.score = 0;

CREATE OR REPLACE FUNCTION public.call_centers_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH call_agg AS (
    SELECT cl.call_center_id, cl.order_id,
           sum(EXTRACT(EPOCH FROM (cl.ended_at - cl.started_at))) AS call_seconds
    FROM public.calls cl
    WHERE cl.ended_at IS NOT NULL
    GROUP BY cl.call_center_id, cl.order_id
  ),
  order_metrics AS (
    SELECT o.id, o.call_center_id, o.status,
           EXTRACT(EPOCH FROM (o.first_attempt_at - o.created_at)) / 60 AS response_minutes,
           EXTRACT(EPOCH FROM (o.closed_at - o.created_at)) / 60 AS finish_minutes,
           ca.call_seconds
    FROM public.orders o
    LEFT JOIN call_agg ca ON ca.order_id = o.id
    WHERE o.call_center_id IS NOT NULL
  ),
  complaint_counts AS (
    SELECT o.call_center_id,
           count(*) AS total_complaints,
           count(*) FILTER (WHERE cp.status = 'open') AS open_complaints
    FROM public.complaints cp
    JOIN public.orders o ON o.id = cp.order_id
    WHERE o.call_center_id IS NOT NULL
    GROUP BY o.call_center_id
  ),
  per_center AS (
    SELECT c.id, c.name, c.code, c.status::text AS status, c.score,
           COALESCE(count(om.id), 0) AS orders_received,
           ROUND(COALESCE(count(om.id) FILTER (WHERE om.status = 'confirmed')::numeric * 100 / NULLIF(count(om.id), 0), 0), 1) AS confirm_rate,
           ROUND(COALESCE(avg(om.response_minutes), 0), 1) AS avg_response_minutes,
           ROUND(COALESCE(avg(om.finish_minutes), 0), 1) AS avg_finish_minutes,
           ROUND(COALESCE(avg(om.call_seconds), 0), 1) AS avg_call_seconds,
           ROUND(GREATEST(COALESCE(avg(om.finish_minutes), 0) - COALESCE(avg(om.call_seconds), 0) / 60, 0), 1) AS avg_idle_minutes,
           COALESCE(max(cc.total_complaints), 0) AS total_complaints,
           COALESCE(max(cc.open_complaints), 0) AS open_complaints
    FROM public.call_centers c
    LEFT JOIN order_metrics om ON om.call_center_id = c.id
    LEFT JOIN complaint_counts cc ON cc.call_center_id = c.id
    GROUP BY c.id, c.name, c.code, c.status, c.score
  )
  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'total', (SELECT count(*) FROM per_center),
      'active', (SELECT count(*) FROM per_center WHERE status = 'active'),
      'active_rate', (SELECT ROUND(COALESCE(count(*) FILTER (WHERE status = 'active')::numeric * 100 / NULLIF(count(*), 0), 0), 1) FROM per_center),
      'total_orders', (SELECT COALESCE(sum(orders_received), 0) FROM per_center),
      'confirm_rate', (SELECT ROUND(COALESCE(count(*) FILTER (WHERE status = 'confirmed')::numeric * 100 / NULLIF(count(*), 0), 0), 1) FROM order_metrics),
      'avg_response_minutes', (SELECT ROUND(COALESCE(avg(response_minutes), 0), 1) FROM order_metrics),
      'avg_finish_minutes', (SELECT ROUND(COALESCE(avg(finish_minutes), 0), 1) FROM order_metrics),
      'avg_call_seconds', (SELECT ROUND(COALESCE(avg(call_seconds), 0), 1) FROM order_metrics),
      'avg_idle_minutes', (SELECT ROUND(GREATEST(COALESCE(avg(finish_minutes), 0) - COALESCE(avg(call_seconds), 0) / 60, 0), 1) FROM order_metrics),
      'avg_score', (SELECT ROUND(COALESCE(avg(score), 0), 1) FROM per_center),
      'total_complaints', (SELECT COALESCE(sum(total_complaints), 0) FROM per_center),
      'open_complaints', (SELECT COALESCE(sum(open_complaints), 0) FROM per_center)
    ),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.name), '[]'::jsonb) FROM per_center p)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_centers_overview() TO authenticated;