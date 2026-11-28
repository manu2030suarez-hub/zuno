-- Permite que cada usuario consulte y gestione solamente sus propias notificaciones.
alter table public.notifications enable row level security;

grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists "zuno_users_read_own_notifications" on public.notifications;
create policy "zuno_users_read_own_notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists "zuno_users_update_own_notifications" on public.notifications;
create policy "zuno_users_update_own_notifications"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

drop policy if exists "zuno_users_delete_own_notifications" on public.notifications;
create policy "zuno_users_delete_own_notifications"
on public.notifications for delete to authenticated
using (recipient_id = (select auth.uid()));
