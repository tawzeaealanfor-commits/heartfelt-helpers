-- Demo seller / call center with fixed IDs used by the admin preview links
INSERT INTO public.sellers (id, name, category, status, balance, score)
VALUES ('11111111-1111-4111-8111-111111111111', 'متجر تجريبي (Demo)', 'إلكترونيات', 'active', 12450.75, 87)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, category = EXCLUDED.category, status = EXCLUDED.status,
      balance = EXCLUDED.balance, score = EXCLUDED.score;

INSERT INTO public.call_centers (id, name, code, status, score)
VALUES ('22222222-2222-4222-8222-222222222222', 'كول سنتر تجريبي (Demo)', 'CC-DEMO1', 'active', 91)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, code = EXCLUDED.code, status = EXCLUDED.status, score = EXCLUDED.score;

-- Demo orders (deterministic IDs so re-running is idempotent)
INSERT INTO public.orders (id, seller_id, call_center_id, status, handled, amount,
                           attempts_count, target_response_minutes, first_attempt_at, closed_at, created_at)
SELECT
  ('33333333-3333-4333-8333-' || lpad(g::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  (ARRAY['confirmed','confirmed','confirmed','rejected','in_progress','new','cancelled'])[1 + (g % 7)]::order_status,
  (g % 3 <> 0),
  round((250 + (g * 37) % 1800)::numeric, 2),
  1 + (g % 4),
  60,
  now() - ((g % 20) * interval '1 day') + interval '25 minutes',
  CASE WHEN g % 7 IN (1,2,3) THEN now() - ((g % 20) * interval '1 day') + interval '3 hours' ELSE NULL END,
  now() - ((g % 20) * interval '1 day')
FROM generate_series(1, 40) g
ON CONFLICT (id) DO NOTHING;

-- Demo calls linked to the demo orders
INSERT INTO public.calls (id, order_id, call_center_id, started_at, ended_at)
SELECT
  ('44444444-4444-4444-8444-' || lpad(g::text, 12, '0'))::uuid,
  ('33333333-3333-4333-8333-' || lpad(g::text, 12, '0'))::uuid,
  '22222222-2222-4222-8222-222222222222',
  now() - ((g % 20) * interval '1 day') + interval '30 minutes',
  now() - ((g % 20) * interval '1 day') + interval '30 minutes' + ((90 + (g * 13) % 300) * interval '1 second')
FROM generate_series(1, 40) g
ON CONFLICT (id) DO NOTHING;

-- A couple of demo complaints
INSERT INTO public.complaints (id, order_id, subject, status)
VALUES
  ('55555555-5555-4555-8555-000000000001', '33333333-3333-4333-8333-000000000004', 'تأخر في التواصل مع العميل', 'open'),
  ('55555555-5555-4555-8555-000000000002', '33333333-3333-4333-8333-000000000011', 'خطأ في بيانات الطلب', 'resolved')
ON CONFLICT (id) DO NOTHING;

-- Demo financial transactions
INSERT INTO public.transactions (id, type, status, amount, seller_id, call_center_id)
VALUES
  ('66666666-6666-4666-8666-000000000001', 'deposit', 'completed', 5000, '11111111-1111-4111-8111-111111111111', NULL),
  ('66666666-6666-4666-8666-000000000002', 'seller_payout', 'pending', 1800, '11111111-1111-4111-8111-111111111111', NULL),
  ('66666666-6666-4666-8666-000000000003', 'callcenter_payout', 'pending', 950, NULL, '22222222-2222-4222-8222-222222222222'),
  ('66666666-6666-4666-8666-000000000004', 'incentive', 'completed', 400, NULL, '22222222-2222-4222-8222-222222222222'),
  ('66666666-6666-4666-8666-000000000005', 'platform_fee', 'completed', 730, '11111111-1111-4111-8111-111111111111', NULL)
ON CONFLICT (id) DO NOTHING;