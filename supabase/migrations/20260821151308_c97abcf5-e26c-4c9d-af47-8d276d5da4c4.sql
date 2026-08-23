
create table public.order_comments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.order_comments to authenticated;
grant all on public.order_comments to service_role;
alter table public.order_comments enable row level security;
create policy "order_comments_read" on public.order_comments for select to authenticated using (true);
create policy "order_comments_insert" on public.order_comments for insert to authenticated with check (author_id = auth.uid());
create policy "order_comments_update_own" on public.order_comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "order_comments_delete_own" on public.order_comments for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create index order_comments_order_idx on public.order_comments(order_id, created_at desc);
create trigger order_comments_updated_at before update on public.order_comments
  for each row execute function public.update_updated_at_column();

create table public.order_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  rating smallint not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, author_id)
);
grant select, insert, update, delete on public.order_ratings to authenticated;
grant all on public.order_ratings to service_role;
alter table public.order_ratings enable row level security;
create policy "order_ratings_read" on public.order_ratings for select to authenticated using (true);
create policy "order_ratings_insert" on public.order_ratings for insert to authenticated with check (author_id = auth.uid());
create policy "order_ratings_update_own" on public.order_ratings for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "order_ratings_delete_own" on public.order_ratings for delete to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create trigger order_ratings_updated_at before update on public.order_ratings
  for each row execute function public.update_updated_at_column();

create table public.order_comment_reads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  last_read_at timestamptz not null default now(),
  unique (order_id, user_id)
);
grant select, insert, update, delete on public.order_comment_reads to authenticated;
grant all on public.order_comment_reads to service_role;
alter table public.order_comment_reads enable row level security;
create policy "order_comment_reads_own" on public.order_comment_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.order_comments_unread()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(t.order_id::text, t.cnt), '{}'::jsonb)
  from (
    select c.order_id, count(*) cnt
    from public.order_comments c
    left join public.order_comment_reads r
      on r.order_id = c.order_id and r.user_id = auth.uid()
    where c.author_id <> auth.uid()
      and (r.last_read_at is null or c.created_at > r.last_read_at)
    group by c.order_id
  ) t
$$;

create or replace function public.mark_order_comments_read(_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.order_comment_reads (order_id, user_id, last_read_at)
  values (_order_id, auth.uid(), now())
  on conflict (order_id, user_id) do update set last_read_at = now();
$$;

create or replace function public.mark_all_order_comments_read()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.order_comment_reads (order_id, user_id, last_read_at)
  select o.id, auth.uid(), now() from public.orders o
  on conflict (order_id, user_id) do update set last_read_at = now();
$$;

create or replace function public.order_comments_list(_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'body', c.body, 'created_at', c.created_at,
    'author_id', c.author_id,
    'author_name', coalesce(p.full_name, p.email, 'مستخدم'),
    'rating', (select r.rating from public.order_ratings r where r.order_id = c.order_id and r.author_id = c.author_id)
  ) order by c.created_at desc), '[]'::jsonb)
  from public.order_comments c
  left join public.profiles p on p.id = c.author_id
  where c.order_id = _order_id
$$;
