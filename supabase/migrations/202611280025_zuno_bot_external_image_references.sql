alter table public.zuno_bot_messages
  add column if not exists external_media_url text,
  add column if not exists media_source_url text;

comment on column public.zuno_bot_messages.external_media_url is
  'HTTPS image URL hosted by an approved external reference catalogue; never copied into ZUNO storage.';
comment on column public.zuno_bot_messages.media_source_url is
  'Required visible source link for externally hosted reference images.';
