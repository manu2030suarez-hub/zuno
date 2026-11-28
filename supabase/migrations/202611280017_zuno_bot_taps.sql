-- Allow authenticated users to send a fire tap to a ZUNO bot.
create table if not exists public.zuno_bot_taps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id uuid not null references public.zuno_bots(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.zuno_bot_taps enable row level security;
revoke all on table public.zuno_bot_taps from public, anon, authenticated;
grant select, insert on table public.zuno_bot_taps to authenticated;

drop policy if exists "zuno_users_read_own_bot_taps" on public.zuno_bot_taps;
create policy "zuno_users_read_own_bot_taps"
on public.zuno_bot_taps for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "zuno_users_send_bot_taps" on public.zuno_bot_taps;
create policy "zuno_users_send_bot_taps"
on public.zuno_bot_taps for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.zuno_bots b where b.id = bot_id and b.is_active = true)
);

create index if not exists zuno_bot_taps_user_created_idx
on public.zuno_bot_taps (user_id, created_at desc);
