-- Keep a private rolling memory for each user's conversation with each individual bot.
alter table public.zuno_bot_conversations
  add column if not exists context_summary text not null default '';

comment on column public.zuno_bot_conversations.context_summary is
  'Private AI memory summary scoped to this exact user_id + bot_id conversation. Never shared across bots.';
