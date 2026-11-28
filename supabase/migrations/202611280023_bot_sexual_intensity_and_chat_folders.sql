-- Per-bot adult intimacy intensity and per-user bot conversation folders.
alter table public.zuno_bots
  add column if not exists sexual_intensity text not null default 'normal'
  check (sexual_intensity in ('poco','normal','mucho','demasiado'));

create or replace function public.admin_set_bot_sexual_intensity(
  p_bot_id uuid,
  p_sexual_intensity text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.zuno_is_admin() then
    raise exception 'Admin access required';
  end if;
  if p_sexual_intensity not in ('poco','normal','mucho','demasiado') then
    raise exception 'La intensidad sexual indicada no es válida';
  end if;
  update public.zuno_bots
  set sexual_intensity = p_sexual_intensity, updated_at = now()
  where id = p_bot_id;
  if not found then raise exception 'No se encontró el bot'; end if;
end;
$$;
revoke all on function public.admin_set_bot_sexual_intensity(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_bot_sexual_intensity(uuid,text) to authenticated;

alter table public.zuno_bot_conversations
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

grant update on table public.zuno_bot_conversations to authenticated;
