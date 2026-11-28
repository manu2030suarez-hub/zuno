begin;

create table if not exists public.zuno_platform_settings (
  singleton boolean primary key default true check (singleton),
  platform_name text not null default 'ZUNO',
  platform_description text not null default 'Conectá, chateá y descubrí personas.',
  registration_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'Estamos realizando mejoras. Volvé a intentarlo en unos minutos.',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.zuno_platform_settings enable row level security;
revoke all on table public.zuno_platform_settings from public, anon, authenticated;
insert into public.zuno_platform_settings(singleton) values (true)
on conflict (singleton) do nothing;

create or replace function public.zuno_get_platform_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'platform_name', s.platform_name,
    'platform_description', s.platform_description,
    'registration_enabled', s.registration_enabled,
    'maintenance_mode', s.maintenance_mode,
    'maintenance_message', s.maintenance_message,
    'updated_at', s.updated_at
  )
  from public.zuno_platform_settings s
  where s.singleton = true;
$function$;

create or replace function public.admin_get_platform_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;
  return public.zuno_get_platform_settings();
end;
$function$;

create or replace function public.admin_update_platform_settings(
  p_platform_name text,
  p_platform_description text,
  p_registration_enabled boolean,
  p_maintenance_mode boolean,
  p_maintenance_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_settings jsonb;
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;
  if nullif(btrim(p_platform_name), '') is null or length(btrim(p_platform_name)) > 60 then
    raise exception 'El nombre debe tener entre 1 y 60 caracteres.';
  end if;
  if length(coalesce(p_platform_description, '')) > 180 then
    raise exception 'La descripción no puede superar 180 caracteres.';
  end if;
  if length(coalesce(p_maintenance_message, '')) > 500 then
    raise exception 'El mensaje de mantenimiento no puede superar 500 caracteres.';
  end if;

  update public.zuno_platform_settings
  set platform_name = btrim(p_platform_name),
      platform_description = coalesce(p_platform_description, ''),
      registration_enabled = coalesce(p_registration_enabled, true),
      maintenance_mode = coalesce(p_maintenance_mode, false),
      maintenance_message = coalesce(p_maintenance_message, ''),
      updated_at = now(),
      updated_by = auth.uid()
  where singleton = true;

  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (auth.uid(), 'platform_settings_updated', jsonb_build_object(
    'registration_enabled', coalesce(p_registration_enabled, true),
    'maintenance_mode', coalesce(p_maintenance_mode, false)
  ));
  v_settings := public.zuno_get_platform_settings();
  return v_settings;
end;
$function$;

revoke all on function public.zuno_get_platform_settings() from public;
grant execute on function public.zuno_get_platform_settings() to anon, authenticated;
revoke all on function public.admin_get_platform_settings() from public, anon;
grant execute on function public.admin_get_platform_settings() to authenticated;
revoke all on function public.admin_update_platform_settings(text,text,boolean,boolean,text) from public, anon;
grant execute on function public.admin_update_platform_settings(text,text,boolean,boolean,text) to authenticated;

create or replace function public.zuno_guard_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1 from public.zuno_platform_settings
    where singleton = true and registration_enabled = false
  ) then
    raise exception 'ZUNO no está aceptando nuevos registros en este momento.';
  end if;
  return new;
end;
$function$;

drop trigger if exists zuno_registration_enabled_guard on auth.users;
create trigger zuno_registration_enabled_guard
before insert on auth.users
for each row execute function public.zuno_guard_new_auth_user();

commit;
