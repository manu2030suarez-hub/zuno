-- ZUNO story likes: one like per account and story, with private visibility for the liker and story owner.
create table if not exists public.story_likes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint story_likes_story_user_unique unique (story_id, user_id)
);
create index if not exists story_likes_story_idx on public.story_likes(story_id, created_at desc);
alter table public.story_likes enable row level security;
revoke all on public.story_likes from anon, authenticated;
grant select, insert, delete on public.story_likes to authenticated;
drop policy if exists "Users can see own story likes and likes on their stories" on public.story_likes;
create policy "Users can see own story likes and likes on their stories"
on public.story_likes for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())
);
drop policy if exists "Users can like active stories" on public.story_likes;
create policy "Users can like active stories"
on public.story_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id
      and s.expires_at > now()
      and s.archived_at is null
      and s.user_id <> auth.uid()
      and not public.zuno_is_blocked_between(auth.uid(), s.user_id)
  )
);
drop policy if exists "Users can remove their own story likes" on public.story_likes;
create policy "Users can remove their own story likes"
on public.story_likes for delete to authenticated
using (user_id = auth.uid());
alter table public.story_likes replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'story_likes'
  ) then
    alter publication supabase_realtime add table public.story_likes;
  end if;
end $$;
