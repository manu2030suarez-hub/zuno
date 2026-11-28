-- ZUNO · Seguridad y auditoría administrativa
begin;

create or replace function public.admin_get_security_overview()
returns table (
  admin_count bigint,
  active_sanctions bigint,
  moderation_events bigint,
  access_events bigint,
  retained_access_events bigint,
  administrators jsonb
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (auth.uid(), 'security_overview_view', jsonb_build_object('viewed_at', now()));

  return query
  select
    (select count(*)::bigint from public.admin_users),
    (select count(*)::bigint from public.account_sanctions s
      where s.revoked_at is null and (s.is_permanent or s.expires_at > now())),
    (select count(*)::bigint from public.admin_moderation_audit),
    (select count(*)::bigint from public.admin_access_audit),
    (select count(*)::bigint from public.retained_chat_access_audit),
    (select coalesce(
      jsonb_agg(jsonb_build_object('user_id', a.user_id, 'created_at', a.created_at) order by a.created_at),
      '[]'::jsonb
    ) from public.admin_users a);
end;
$function$;

create or replace function public.admin_list_security_audit(
  p_source text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  event_id text,
  source text,
  admin_user_id uuid,
  action text,
  details jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  if coalesce(p_source, 'all') not in ('all', 'moderation', 'access', 'retained') then
    raise exception 'Filtro de auditoría no válido.';
  end if;

  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (auth.uid(), 'security_audit_view', jsonb_build_object('source', coalesce(p_source, 'all')));

  return query
  select e.event_id, e.source, e.admin_user_id, e.action, e.details, e.created_at
  from (
    select
      m.id::text as event_id,
      'moderation'::text as source,
      m.admin_user_id,
      m.action,
      coalesce(m.details, '{}'::jsonb) as details,
      m.created_at
    from public.admin_moderation_audit m
    where coalesce(p_source, 'all') in ('all', 'moderation')

    union all

    select
      a.id::text,
      'access'::text,
      a.admin_id,
      a.action,
      coalesce(a.details, '{}'::jsonb),
      a.created_at
    from public.admin_access_audit a
    where coalesce(p_source, 'all') in ('all', 'access')

    union all

    select
      r.id::text,
      'retained'::text,
      r.admin_user_id,
      r.action,
      jsonb_build_object('retained_message_id', r.retained_message_id),
      r.accessed_at
    from public.retained_chat_access_audit r
    where coalesce(p_source, 'all') in ('all', 'retained')
  ) e
  order by e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

revoke all on function public.admin_get_security_overview() from public, anon;
grant execute on function public.admin_get_security_overview() to authenticated;

revoke all on function public.admin_list_security_audit(text, integer, integer) from public, anon;
grant execute on function public.admin_list_security_audit(text, integer, integer) to authenticated;

commit;
