-- Fix bot chat upsert permissions and add user-owned bot favorites/blocks.
grant select, insert, update on table public.zuno_bot_conversations to authenticated;

create table if not exists public.zuno_bot_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id uuid not null references public.zuno_bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, bot_id)
);
create table if not exists public.zuno_bot_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id uuid not null references public.zuno_bots(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, bot_id)
);

alter table public.zuno_bot_favorites enable row level security;
alter table public.zuno_bot_blocks enable row level security;
revoke all on table public.zuno_bot_favorites, public.zuno_bot_blocks from anon, authenticated;
grant select, insert, delete on table public.zuno_bot_favorites, public.zuno_bot_blocks to authenticated;

drop policy if exists "zuno_users_manage_own_bot_favorites" on public.zuno_bot_favorites;
create policy "zuno_users_manage_own_bot_favorites"
on public.zuno_bot_favorites for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.zuno_bots b where b.id = bot_id and b.is_active = true
));

drop policy if exists "zuno_users_manage_own_bot_blocks" on public.zuno_bot_blocks;
create policy "zuno_users_manage_own_bot_blocks"
on public.zuno_bot_blocks for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.zuno_bots b where b.id = bot_id and b.is_active = true
));
