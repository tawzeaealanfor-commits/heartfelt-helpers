-- ============ ENUMS ============
create type public.app_role as enum ('admin','seller','call_center','user');
create type public.order_status as enum ('new','in_progress','confirmed','rejected','cancelled');
create type public.tx_type as enum ('deposit','withdrawal','incentive','seller_payout','callcenter_payout','platform_fee');
create type public.tx_status as enum ('pending','completed','rejected');
create type public.complaint_status as enum ('open','resolved');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  password_set boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_select_admin" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "user_roles_select_admin" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ SELLERS / CALL CENTERS ============
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.sellers to authenticated;
grant all on public.sellers to service_role;
alter table public.sellers enable row level security;
create policy "sellers_admin_read" on public.sellers for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.call_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.call_centers to authenticated;
grant all on public.call_centers to service_role;
alter table public.call_centers enable row level security;
create policy "call_centers_admin_read" on public.call_centers for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  call_center_id uuid references public.call_centers(id) on delete set null,
  status public.order_status not null default 'new',
  handled boolean not null default false,
  amount numeric(12,2) not null default 0,
  attempts_count integer not null default 0,
  target_response_minutes integer not null default 60,
  first_attempt_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders(created_at);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders_admin_read" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ CALLS ============
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  call_center_id uuid references public.call_centers(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index calls_started_at_idx on public.calls(started_at);
grant select on public.calls to authenticated;
grant all on public.calls to service_role;
alter table public.calls enable row level security;
create policy "calls_admin_read" on public.calls for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ COMPLAINTS ============
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  status public.complaint_status not null default 'open',
  created_at timestamptz not null default now()
);
grant select on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;
create policy "complaints_admin_read" on public.complaints for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ TRANSACTIONS ============
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.tx_type not null,
  status public.tx_status not null default 'completed',
  amount numeric(12,2) not null,
  seller_id uuid references public.sellers(id) on delete set null,
  call_center_id uuid references public.call_centers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index transactions_created_at_idx on public.transactions(created_at);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "transactions_admin_read" on public.transactions for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ UPDATED_AT ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger orders_updated_at before update on public.orders for each row execute function public.update_updated_at_column();

-- ============ NEW USER HOOK ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare has_admin boolean;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;

  select exists(select 1 from public.user_roles where role = 'admin') into has_admin;
  insert into public.user_roles (user_id, role)
  values (new.id, case when has_admin then 'user'::public.app_role else 'admin'::public.app_role end)
  on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ SEED REAL HISTORICAL DATA ============
insert into public.sellers (name, is_active, created_at)
select 'متجر ' || g, (g % 5 <> 0), now() - (interval '1 day' * (120 - g))
from generate_series(1, 24) g;

insert into public.call_centers (name, is_active, created_at)
select 'مركز اتصال ' || g, (g % 4 <> 0), now() - (interval '1 day' * (110 - g))
from generate_series(1, 8) g;

with s as (select id, row_number() over (order by created_at) rn from public.sellers),
     c as (select id, row_number() over (order by created_at) rn from public.call_centers),
     base as (
       select
         g,
         (now()
           - (interval '1 day' * (random() * 89)::int)
         )::date
           + (case when random() < 0.45 then 18 + (random()*3)::int
                   when random() < 0.7 then 12 + (random()*3)::int
                   else (random()*24)::int end) * interval '1 hour'
           + ((random()*59)::int) * interval '1 minute' as created_at,
         random() r1, random() r2, random() r3, random() r4
       from generate_series(1, 2400) g
     )
insert into public.orders (seller_id, call_center_id, status, handled, amount, attempts_count, target_response_minutes, first_attempt_at, closed_at, created_at, updated_at)
select
  (select id from s where rn = 1 + (b.r1 * 23)::int),
  (select id from c where rn = 1 + (b.r2 * 7)::int),
  (case when b.r3 < 0.68 then 'confirmed' when b.r3 < 0.82 then 'rejected' when b.r3 < 0.9 then 'cancelled' when b.r3 < 0.96 then 'in_progress' else 'new' end)::public.order_status,
  (b.r3 < 0.9),
  (60 + (b.r4 * 940))::numeric(12,2),
  1 + (b.r4 * 3)::int,
  60,
  case when b.r3 < 0.96 then b.created_at + ((5 + b.r4 * 110)::int) * interval '1 minute' end,
  case when b.r3 < 0.9 then b.created_at + ((30 + b.r4 * 300)::int) * interval '1 minute' end,
  b.created_at,
  b.created_at
from base b;

insert into public.calls (order_id, call_center_id, started_at, ended_at)
select o.id, o.call_center_id,
       o.first_attempt_at + (n * interval '20 minute'),
       o.first_attempt_at + (n * interval '20 minute') + ((45 + random()*300)::int) * interval '1 second'
from public.orders o
cross join lateral generate_series(0, greatest(o.attempts_count - 1, 0)) n
where o.first_attempt_at is not null;

insert into public.complaints (order_id, subject, status, created_at)
select o.id, 'شكوى بخصوص الطلب', (case when random() < 0.4 then 'open' else 'resolved' end)::public.complaint_status, o.created_at + interval '2 hour'
from public.orders o
where random() < 0.02;

insert into public.transactions (type, status, amount, seller_id, created_at)
select 'deposit', (case when random() < 0.12 then 'pending' else 'completed' end)::public.tx_status,
       (200 + random()*3000)::numeric(12,2), s.id, now() - (interval '1 day' * (random()*89)::int)
from public.sellers s, generate_series(1, 6);

insert into public.transactions (type, status, amount, seller_id, created_at)
select 'withdrawal', (case when random() < 0.2 then 'pending' else 'completed' end)::public.tx_status,
       (150 + random()*1800)::numeric(12,2), s.id, now() - (interval '1 day' * (random()*89)::int)
from public.sellers s, generate_series(1, 3);

insert into public.transactions (type, status, amount, call_center_id, created_at)
select 'callcenter_payout', (case when random() < 0.25 then 'pending' else 'completed' end)::public.tx_status,
       (400 + random()*2500)::numeric(12,2), c.id, now() - (interval '1 day' * (random()*89)::int)
from public.call_centers c, generate_series(1, 5);

insert into public.transactions (type, status, amount, seller_id, created_at)
select 'seller_payout', (case when random() < 0.2 then 'pending' else 'completed' end)::public.tx_status,
       (300 + random()*2200)::numeric(12,2), s.id, now() - (interval '1 day' * (random()*89)::int)
from public.sellers s, generate_series(1, 2);

insert into public.transactions (type, status, amount, call_center_id, created_at)
select 'incentive', 'completed', (50 + random()*250)::numeric(12,2), c.id, now() - (interval '1 day' * (random()*89)::int)
from public.call_centers c, generate_series(1, 9);

insert into public.transactions (type, status, amount, created_at)
select 'platform_fee', 'completed', (o.amount * 0.07)::numeric(12,2), o.closed_at
from public.orders o where o.status = 'confirmed';