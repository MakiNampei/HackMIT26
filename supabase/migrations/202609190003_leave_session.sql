-- Serialize membership changes with join_session and remove stale availability.
create or replace function public.leave_session(p_session_id text, p_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sessions;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()::text) then
    raise exception 'cannot_leave_for_another_user';
  end if;

  select * into target from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  delete from public.availability where session_id = p_session_id and user_id = p_user_id;
  delete from public.session_members where session_id = p_session_id and user_id = p_user_id;

  if (select count(*) from public.session_members where session_id = p_session_id) < target.min_people then
    update public.sessions
    set status = 'open', confirmed_start = null, confirmed_end = null, room_id = null
    where id = p_session_id;
  end if;
end;
$$;

revoke all on function public.leave_session(text, text) from public;
grant execute on function public.leave_session(text, text) to authenticated, service_role;
