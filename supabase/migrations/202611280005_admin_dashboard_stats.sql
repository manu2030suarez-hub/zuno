-- ZUNO: protected dashboard statistics
create or replace function public.admin_get_dashboard_stats()
returns table (
  total_users bigint,
  active_visible_5m bigint,
  active_visible_24h bigint,
  registrations_today bigint,
  registrations_7d bigint,
  total_reports bigint,
  pending_reports bigint,
  active_sanctions bigint,
  total_sanctions bigint,
  registrations_by_day jsonb
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
  values (auth.uid(), 'dashboard_stats_view', jsonb_build_object('viewed_at', now()));

  return query
  with days as (
    select generate_series(current_date - 6, current_date, interval '1 day')::date as day
  )
  select
    (select count(*)::bigint from public.profiles),
    (select count(*)::bigint from public.profiles where last_seen_at >= now() - interval '5 minutes' and coalesce(show_online, true)),
    (select count(*)::bigint from public.profiles where last_seen_at >= now() - interval '24 hours' and coalesce(show_online, true)),
    (select count(*)::bigint from public.profiles where created_at >= date_trunc('day', now())),
    (select count(*)::bigint from public.profiles where created_at >= now() - interval '7 days'),
    (select count(*)::bigint from public.user_reports),
    (select count(*)::bigint from public.user_reports where status = 'pending'),
    (select count(*)::bigint from public.account_sanctions where revoked_at is null and (is_permanent or expires_at > now())),
    (select count(*)::bigint from public.account_sanctions),
    (select coalesce(
      jsonb_agg(jsonb_build_object('day', to_char(days.day, 'Dy DD'), 'count', coalesce(daily.total, 0)) order by days.day),
      '[]'::jsonb
    )
     from days
     left join (
       select created_at::date as day, count(*)::bigint as total
       from public.profiles
       where created_at >= current_date - 6
       group by created_at::date
     ) daily on daily.day = days.day
    );
end;
$function$;

revoke all on function public.admin_get_dashboard_stats() from public, anon;
grant execute on function public.admin_get_dashboard_stats() to authenticated;
