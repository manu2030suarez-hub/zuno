-- Make private-album responses idempotent so old notifications do not show false errors.
create or replace function public.zuno_respond_private_album_request(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.private_album_access_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debés iniciar sesión para responder la solicitud.';
  end if;

  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'La respuesta no es válida.';
  end if;

  select *
    into v_request
    from public.private_album_access_requests
   where id = p_request_id
     and owner_id = v_user_id
   for update;

  if not found then
    raise exception 'No encontramos esta solicitud o no te pertenece.';
  end if;

  -- If another screen/session already handled it, return its real status.
  if v_request.status <> 'pending' then
    return jsonb_build_object('success', true, 'status', v_request.status, 'already_decided', true);
  end if;

  update public.private_album_access_requests
     set status = p_status,
         updated_at = now()
   where id = p_request_id;

  perform public.zuno_create_activity_notification(
    v_request.requester_id,
    v_user_id,
    'album_access_decision',
    v_request.id,
    case when p_status = 'approved'
      then 'Solicitud aceptada'
      else 'Solicitud rechazada'
    end,
    case when p_status = 'approved'
      then 'Te aceptaron la solicitud para ver el álbum privado'
      else 'Te rechazaron la solicitud para ver el álbum privado'
    end
  );

  return jsonb_build_object('success', true, 'status', p_status, 'already_decided', false);
end;
$$;

revoke all on function public.zuno_respond_private_album_request(uuid, text) from public, anon;
grant execute on function public.zuno_respond_private_album_request(uuid, text) to authenticated;
