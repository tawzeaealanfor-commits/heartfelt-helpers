-- Demo (preview) data for seller & call center portals
INSERT INTO public.sellers (id, name, category, status, balance, score, is_active)
VALUES ('11111111-1111-4111-8111-111111111111', 'متجر تجريبي (Demo)', 'ملابس', 'active', 12450, 87, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.call_centers (id, name, code, status, score, is_active)
VALUES ('22222222-2222-4222-8222-222222222222', 'كول سنتر تجريبي (Demo)', 'DEMO-CC', 'active', 91, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orders (id, seller_id, call_center_id, status, handled, amount, attempts_count, target_response_minutes, first_attempt_at, closed_at, created_at)
VALUES
 ('33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','confirmed', true, 850, 1, 60, now() - interval '9 days', now() - interval '9 days', now() - interval '9 days'),
 ('33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','confirmed', true, 1250, 2, 60, now() - interval '7 days', now() - interval '7 days', now() - interval '7 days'),
 ('33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','rejected', true, 430, 3, 60, now() - interval '6 days', now() - interval '6 days', now() - interval '6 days'),
 ('33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','in_progress', false, 990, 1, 60, now() - interval '2 days', NULL, now() - interval '2 days'),
 ('33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','new', false, 1500, 0, 60, NULL, NULL, now() - interval '1 day'),
 ('33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','confirmed', true, 2100, 1, 60, now() - interval '12 hours', now() - interval '10 hours', now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.calls (id, order_id, call_center_id, started_at, ended_at)
VALUES
 ('44444444-4444-4444-8444-000000000001','33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-222222222222', now() - interval '9 days', now() - interval '9 days' + interval '3 minutes'),
 ('44444444-4444-4444-8444-000000000002','33333333-3333-4333-8333-000000000002','22222222-2222-4222-8222-222222222222', now() - interval '7 days', now() - interval '7 days' + interval '2 minutes'),
 ('44444444-4444-4444-8444-000000000003','33333333-3333-4333-8333-000000000003','22222222-2222-4222-8222-222222222222', now() - interval '6 days', now() - interval '6 days' + interval '90 seconds'),
 ('44444444-4444-4444-8444-000000000004','33333333-3333-4333-8333-000000000006','22222222-2222-4222-8222-222222222222', now() - interval '12 hours', now() - interval '12 hours' + interval '4 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, type, status, amount, seller_id, call_center_id, created_at)
VALUES
 ('55555555-5555-4555-8555-000000000001','deposit','completed', 5000, '11111111-1111-4111-8111-111111111111', NULL, now() - interval '10 days'),
 ('55555555-5555-4555-8555-000000000002','seller_payout','pending', 1200, '11111111-1111-4111-8111-111111111111', NULL, now() - interval '3 days'),
 ('55555555-5555-4555-8555-000000000003','callcenter_payout','completed', 800, NULL, '22222222-2222-4222-8222-222222222222', now() - interval '4 days'),
 ('55555555-5555-4555-8555-000000000004','incentive','completed', 250, NULL, '22222222-2222-4222-8222-222222222222', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.complaints (id, order_id, subject, status, created_at)
VALUES ('66666666-6666-4666-8666-000000000001','33333333-3333-4333-8333-000000000003','تأخر في الرد على العميل','open', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;