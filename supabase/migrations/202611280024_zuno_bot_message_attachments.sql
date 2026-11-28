alter table public.zuno_bot_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_path text;

alter table public.zuno_bot_messages
  drop constraint if exists zuno_bot_messages_message_type_check;

alter table public.zuno_bot_messages
  add constraint zuno_bot_messages_message_type_check
  check (message_type in ('text','image','audio','location'));
