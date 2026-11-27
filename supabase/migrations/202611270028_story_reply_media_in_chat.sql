-- ZUNO: allow story replies to include the original photo or video in the chat.
-- Media remains private and visible only to the conversation members.

drop policy if exists "Members can send messages in their conversations" on public.messages;
create policy "Members can send messages in their conversations"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.member_one, c.member_two)
  )
  and (
    (message_type = 'text' and media_path is null and body is not null)
    or
    (message_type in ('image','video') and media_path is not null
      and media_path like conversation_id::text || '/' || auth.uid()::text || '/%')
    or
    (message_type = 'audio' and media_path is not null
      and media_path like conversation_id::text || '/' || auth.uid()::text || '/%')
  )
);

drop policy if exists "Chat members can view chat media" on storage.objects;
create policy "Chat members can view chat media"
on storage.objects for select to authenticated
using (
  bucket_id = 'zuno-chat-media'
  and (
    exists (
      select 1 from public.chat_media_library lib
      where lib.storage_path = name and lib.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.media_path = name
        and m.message_type in ('image','video','audio')
        and auth.uid() in (c.member_one, c.member_two)
    )
  )
);

drop policy if exists "Conversation members can upload chat media" on storage.objects;
create policy "Conversation members can upload chat media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'zuno-chat-media'
  and (storage.foldername(name))[1] in (
    select c.id::text from public.conversations c
    where auth.uid() in (c.member_one, c.member_two)
  )
  and (storage.foldername(name))[2] = auth.uid()::text
);

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime)
  from unnest(coalesce(allowed_mime_types, array[]::text[]) || array['video/mp4','video/webm','video/quicktime']) as mime
)
where id = 'zuno-chat-media';
