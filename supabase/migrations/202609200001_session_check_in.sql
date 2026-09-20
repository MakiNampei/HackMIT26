alter table public.session_members
  add column if not exists checked_in_at timestamptz;

-- Database time is authoritative; repeat requests preserve the first check-in.
create or replace function public.check_in_session(p_session_id text, p_user_id text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sessions;
  checked_at timestamptz;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()::text) then
    raise exception 'cannot_check_in_for_another_user';
  end if;

  select * into target from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;
  if not exists (select 1 from public.session_members where session_id = p_session_id and user_id = p_user_id) then
    raise exception 'not_a_session_member';
  end if;
  if target.confirmed_start is null or target.confirmed_start > now() then
    raise exception 'check_in_not_open';
  end if;

  update public.session_members
  set checked_in_at = coalesce(checked_in_at, now())
  where session_id = p_session_id and user_id = p_user_id
  returning checked_in_at into checked_at;
  return checked_at;
end;
$$;

revoke all on function public.check_in_session(text, text) from public;
grant execute on function public.check_in_session(text, text) to authenticated, service_role;
