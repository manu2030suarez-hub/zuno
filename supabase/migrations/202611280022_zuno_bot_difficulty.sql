-- Add a per-bot conversation difficulty that controls writing complexity, not identity.
alter table public.zuno_bots
  add column if not exists difficulty text not null default 'normal'
  check (difficulty in ('novato','normal','inteligente'));

create or replace function public.admin_set_bot_difficulty(
  p_bot_id uuid,
  p_difficulty text
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

  if p_difficulty not in ('novato','normal','inteligente') then
    raise exception 'La dificultad indicada no es válida';
  end if;

  update public.zuno_bots
  set difficulty = p_difficulty, updated_at = now()
  where id = p_bot_id;

  if not found then
    raise exception 'No se encontró el bot';
  end if;
end;
$$;

revoke all on function public.admin_set_bot_difficulty(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_bot_difficulty(uuid,text) to authenticated;
