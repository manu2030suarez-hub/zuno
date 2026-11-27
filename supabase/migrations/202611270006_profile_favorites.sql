-- ZUNO: private per-user favorites.
create table if not exists public.profile_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, favorite_user_id),
  constraint profile_favorites_not_self check (user_id <> favorite_user_id)
);
alter table public.profile_favorites enable row level security;
drop policy if exists "Users can view their own favorites" on public.profile_favorites;
create policy "Users can view their own favorites"
  on public.profile_favorites for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can add their own favorites" on public.profile_favorites;
create policy "Users can add their own favorites"
  on public.profile_favorites for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own favorites" on public.profile_favorites;
create policy "Users can remove their own favorites"
  on public.profile_favorites for delete to authenticated
  using (auth.uid() = user_id);
grant select, insert, delete on public.profile_favorites to authenticated;
