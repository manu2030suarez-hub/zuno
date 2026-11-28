-- ZUNO · Archivado automático global de mensajes vencidos
-- Ejecuta cada minuto; conserva el contenido y sus rutas de Storage por 90 días.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.archive_expired_chat_messages_batch(p_batch_size integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_message record;
  v_archived integer := 0;
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 500), 1000));
begin
  for v_message in
    select m.id, m.conversation_id, m.sender_id, m.body, m.message_type,
           m.media_path, m.created_at, m.expires_at
    from public.messages m
    where m.expires_at is not null
      and m.expires_at <= now()
    order by m.expires_at asc
    limit v_batch_size
    for update of m skip locked
  loop
    insert into public.retained_chat_messages (
      original_message_id, conversation_id, sender_id, body, message_type,
      media_path, original_created_at, expired_at, deletion_reason, retention_until
    ) values (
      v_message.id, v_message.conversation_id, v_message.sender_id,
      v_message.body, v_message.message_type, v_message.media_path,
      v_message.created_at, v_message.expires_at, 'expired',
      v_message.expires_at + interval '90 days'
    )
    on conflict (original_message_id) do nothing;

    -- Solo se retira el mensaje después de confirmar que existe su copia retenida.
    if exists (
      select 1 from public.retained_chat_messages r
      where r.original_message_id = v_message.id
    ) then
      delete from public.messages m where m.id = v_message.id;
      if found then
        v_archived := v_archived + 1;
      end if;
    end if;
  end loop;

  return v_archived;
end;
$function$;

revoke all on function public.archive_expired_chat_messages_batch(integer) from public, anon, authenticated;
grant execute on function public.archive_expired_chat_messages_batch(integer) to postgres;

-- Reemplaza el job si la migración se vuelve a ejecutar.
select cron.unschedule(jobid)
from cron.job
where jobname = 'zuno-archive-expired-chat-messages';

select cron.schedule(
  'zuno-archive-expired-chat-messages',
  '* * * * *',
  'select public.archive_expired_chat_messages_batch(500);'
);
