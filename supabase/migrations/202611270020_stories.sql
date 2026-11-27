-- ZUNO Stories: ephemeral photo/video stories with private media storage.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 240),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint stories_media_path_unique unique (media_path)
);

create index if not exists stories_active_created_idx
  on public.stories (expires_at desc, created_at desc);
create index if not exists stories_user_active_idx
  on public.stories (user_id, expires_at desc);

alter table public.stories enable row level security;
revoke all on public.stories from anon, authenticated;
grant select, insert, delete on public.stories to authenticated;

drop policy if exists "Authenticated users can view active unblocked stories" on public.stories;
create policy "Authenticated users can view active unblocked stories"
  on public.stories for select to authenticated
  using (
    expires_at > now()
    and not public.zuno_is_blocked_between(auth.uid(), user_id)
  );

drop policy if exists "Users can create their own stories" on public.stories;
create policy "Users can create their own stories"
  on public.stories for insert to authenticated
  with check (
    auth.uid() = user_id
    and expires_at > now()
    and expires_at <= now() + interval '24 hours 5 minutes'
    and media_path like auth.uid()::text || '/%'
  );

drop policy if exists "Users can delete their own stories" on public.stories;
create policy "Users can delete their own stories"
  on public.stories for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

create index if not exists story_views_story_idx on public.story_views(story_id, viewed_at desc);
alter table public.story_views enable row level security;
revoke all on public.story_views from anon, authenticated;
grant select, insert on public.story_views to authenticated;

drop policy if exists "Viewers can record their own story views" on public.story_views;
create policy "Viewers can record their own story views"
  on public.story_views for insert to authenticated
  with check (
    viewer_id = auth.uid()
    and exists (
      select 1 from public.stories s
      where s.id = story_id
        and s.expires_at > now()
        and not public.zuno_is_blocked_between(auth.uid(), s.user_id)
    )
  );

drop policy if exists "Viewers and story owners can see story views" on public.story_views;
create policy "Viewers and story owners can see story views"
  on public.story_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zuno-stories', 'zuno-stories', false, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Story owners can upload story media" on storage.objects;
create policy "Story owners can upload story media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'zuno-stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can view active story media" on storage.objects;
create policy "Users can view active story media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'zuno-stories'
    and exists (
      select 1 from public.stories s
      where s.media_path = name
        and s.expires_at > now()
        and not public.zuno_is_blocked_between(auth.uid(), s.user_id)
    )
  );

drop policy if exists "Story owners can delete their media" on storage.objects;
create policy "Story owners can delete their media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'zuno-stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.stories replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;
