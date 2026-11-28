-- ZUNO: admin account sanctions
create table if not exists public.account_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id),
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  is_permanent boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  check ((is_permanent and expires_at is null) or (not is_permanent and expires_at is not null))
);
create index if not exists account_sanctions_user_active_idx
  on public.account_sanctions(user_id, created_at desc)
  where revoked_at is null;
alter table public.account_sanctions enable row level security;
revoke all on public.account_sanctions from anon, authenticated;

create or replace function public.zuno_get_my_account_status()
returns table(is_blocked boolean, is_permanent boolean, reason text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select true, s.is_permanent, s.reason, s.expires_at
  from public.account_sanctions s
  where s.user_id = auth.uid()
    and s.revoked_at is null
    and (s.is_permanent or s.expires_at > now())
  order by s.is_permanent desc, s.created_at desc
  limit 1
$$;
revoke all on function public.zuno_get_my_account_status() from public, anon;
grant execute on function public.zuno_get_my_account_status() to authenticated;

create or replace function public.admin_apply_user_sanction(
  p_user_id uuid,
  p_duration_days integer,
  p_permanent boolean,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_expires timestamptz;
begin
  if v_admin is null or not public.zuno_is_admin() then raise exception 'No autorizado.'; end if;
  if p_user_id is null or p_user_id = v_admin then raise exception 'No podés sancionar tu propia cuenta.'; end if;
  if char_length(v_reason) < 3 or char_length(v_reason) > 1000 then raise exception 'El motivo debe tener entre 3 y 1000 caracteres.'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then raise exception 'No se encontró la cuenta.'; end if;
  if coalesce(p_permanent, false) then
    v_expires := null;
  else
    if p_duration_days not in (1,7,30) then raise exception 'Duración no permitida.'; end if;
    v_expires := now() + make_interval(days => p_duration_days);
  end if;

  update public.account_sanctions
  set revoked_at = now(), revoked_by = v_admin
  where user_id = p_user_id and revoked_at is null
    and (is_permanent or expires_at > now());

  insert into public.account_sanctions(user_id, admin_user_id, reason, is_permanent, expires_at)
  values (p_user_id, v_admin, v_reason, coalesce(p_permanent,false), v_expires)
  returning id into v_id;

  insert into public.notifications(recipient_id, actor_id, notification_type, entity_id, title, body, metadata)
  values (p_user_id, v_admin, 'account_sanction', v_id,
    case when p_permanent then 'Cuenta desactivada' else 'Cuenta suspendida' end,
    case when p_permanent then 'Tu cuenta fue desactivada permanentemente. Motivo: ' || v_reason
         else 'Tu cuenta fue suspendida hasta ' || to_char(v_expires at time zone 'UTC','DD/MM/YYYY HH24:MI') || ' UTC. Motivo: ' || v_reason end,
    jsonb_build_object('sanction_id', v_id, 'is_permanent', coalesce(p_permanent,false), 'expires_at', v_expires));
  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (v_admin, 'user_sanction_applied', jsonb_build_object('user_id',p_user_id,'sanction_id',v_id,'permanent',coalesce(p_permanent,false)));
  return v_id;
end;
$$;
revoke all on function public.admin_apply_user_sanction(uuid,integer,boolean,text) from public, anon;
grant execute on function public.admin_apply_user_sanction(uuid,integer,boolean,text) to authenticated;

create or replace function public.admin_revoke_user_sanction(p_sanction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin uuid := auth.uid(); v_user uuid;
begin
  if v_admin is null or not public.zuno_is_admin() then raise exception 'No autorizado.'; end if;
  update public.account_sanctions
  set revoked_at = now(), revoked_by = v_admin
  where id = p_sanction_id and revoked_at is null
  returning user_id into v_user;
  if v_user is null then raise exception 'No se encontró una medida activa.'; end if;
  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (v_admin, 'user_sanction_revoked', jsonb_build_object('user_id',v_user,'sanction_id',p_sanction_id));
  insert into public.notifications(recipient_id, actor_id, notification_type, entity_id, title, body, metadata)
  values (v_user, v_admin, 'account_sanction', p_sanction_id, 'Medida administrativa levantada',
    'La restricción administrativa de tu cuenta fue levantada. Ya podés volver a usar ZUNO.',
    jsonb_build_object('sanction_id',p_sanction_id,'revoked',true));
end;
$$;
revoke all on function public.admin_revoke_user_sanction(uuid) from public, anon;
grant execute on function public.admin_revoke_user_sanction(uuid) to authenticated;

create or replace function public.admin_list_user_sanctions(p_user_id uuid)
returns table(id uuid, reason text, is_permanent boolean, created_at timestamptz, expires_at timestamptz, revoked_at timestamptz, active boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.zuno_is_admin() then raise exception 'No autorizado.'; end if;
  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (auth.uid(), 'user_sanctions_view', jsonb_build_object('user_id',p_user_id));
  return query
  select s.id, s.reason, s.is_permanent, s.created_at, s.expires_at, s.revoked_at,
    (s.revoked_at is null and (s.is_permanent or s.expires_at > now()))
  from public.account_sanctions s
  where s.user_id = p_user_id
  order by s.created_at desc limit 50;
end;
$$;
revoke all on function public.admin_list_user_sanctions(uuid) from public, anon;
grant execute on function public.admin_list_user_sanctions(uuid) to authenticated;
