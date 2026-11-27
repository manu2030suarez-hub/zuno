-- Biblioteca privada de fotos reutilizables para ZUNO Direct.
create table if not exists public.chat_media_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_media_library enable row level security;

drop policy if exists "Users can view their chat media library" on public.chat_media_library;
create policy "Users can view their chat media library"
on public.chat_media_library for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can add to their chat media library" on public.chat_media_library;
create policy "Users can add to their chat media library"
on public.chat_media_library for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can delete from their chat media library" on public.chat_media_library;
create policy "Users can delete from their chat media library"
on public.chat_media_library for delete to authenticated
using (user_id = auth.uid());

grant select, insert, delete on public.chat_media_library to authenticated;

-- Incorporar a la biblioteca las fotos enviadas antes de esta actualización.
insert into public.chat_media_library (user_id, storage_path, mime_type)
select distinct
  sender_id,
  media_path,
  case lower(split_part(media_path, '.', -1))
    when 'png' then 'image/png'
    when 'webp' then 'image/webp'
    when 'gif' then 'image/gif'
    else 'image/jpeg'
  end
from public.messages
where message_type = 'image' and media_path is not null
on conflict (storage_path) do nothing;

-- Una foto privada puede abrirse si pertenece a la biblioteca del usuario
-- o si está adjunta a un mensaje de una conversación de la que forma parte.
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
        and m.message_type = 'image'
        and auth.uid() in (c.member_one, c.member_two)
    )
  )
);

-- Permitir reenviar una foto propia de la biblioteca a otra conversación.
drop policy if exists "Members can send messages in their conversations" on public.messages;
create policy "Members can send messages in their conversations"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.member_one, c.member_two)
  )
  and (
    (
      message_type = 'text'
      and media_path is null
      and body is not null
    )
    or
    (
      message_type = 'image'
      and media_path is not null
      and (
        media_path like conversation_id::text || '/' || auth.uid()::text || '/%'
        or exists (
          select 1 from public.chat_media_library lib
          where lib.storage_path = media_path and lib.user_id = auth.uid()
        )
      )
    )
  )
);
