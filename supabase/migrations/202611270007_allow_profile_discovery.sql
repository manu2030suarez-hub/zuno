-- Allow signed-in ZUNO members to discover other public profiles.
-- Column-level grants remain restricted to the public profile fields.
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can discover public profiles"
  on public.profiles;

create policy "Authenticated users can discover public profiles"
  on public.profiles
  for select
  to authenticated
  using (true);
