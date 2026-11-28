-- ZUNO · Centro de denuncias y moderación administrativa
begin;

create table if not exists public.admin_moderation_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  report_id uuid,
  target_user_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_moderation_audit enable row level security;
revoke all on public.admin_moderation_audit from public, anon, authenticated;
grant all on public.admin_moderation_audit to service_role;

create or replace function public.admin_list_user_reports(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  report_id uuid,
  reporter_id uuid,
  reported_user_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reporter_username text,
  reporter_display_name text,
  reported_username text,
  reported_display_name text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (v_admin, 'reports_list_view', jsonb_build_object('status_filter', p_status));

  return query
  select r.id, r.reporter_id, r.reported_user_id, r.reason, r.details, r.status, r.created_at,
         reporter.username, reporter.display_name,
         reported.username, reported.display_name
  from public.user_reports r
  left join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles reported on reported.id = r.reported_user_id
  where p_status is null or r.status = p_status
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 200))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

create or replace function public.admin_update_user_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_target uuid;
begin
  if v_admin is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;
  if p_status not in ('pending','reviewed','resolved','dismissed') then
    raise exception 'Estado de denuncia no permitido.';
  end if;

  update public.user_reports
  set status = p_status
  where id = p_report_id
  returning reported_user_id into v_target;

  if not found then
    raise exception 'No se encontró la denuncia.';
  end if;

  insert into public.admin_moderation_audit(admin_user_id, report_id, target_user_id, action, details)
  values (
    v_admin, p_report_id, v_target, 'report_status_changed',
    jsonb_build_object('status', p_status, 'admin_note', nullif(left(coalesce(p_admin_note,''),1000),''))
  );
end;
$function$;

revoke all on function public.admin_list_user_reports(text, integer, integer) from public, anon;
revoke all on function public.admin_update_user_report(uuid, text, text) from public, anon;
grant execute on function public.admin_list_user_reports(text, integer, integer) to authenticated;
grant execute on function public.admin_update_user_report(uuid, text, text) to authenticated;

commit;
