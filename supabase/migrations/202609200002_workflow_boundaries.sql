-- Serialize membership changes with join_session and remove stale availability.
create or replace function public.leave_session(p_session_id text, p_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sessions;
  successor text;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()::text) then
    raise exception 'cannot_leave_for_another_user';
  end if;

  select * into target from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  delete from public.availability where session_id = p_session_id and user_id = p_user_id;
  delete from public.session_members where session_id = p_session_id and user_id = p_user_id;

  if target.creator_id = p_user_id then
    select user_id into successor from public.session_members
    where session_id = p_session_id order by joined_at, user_id limit 1;
    if successor is not null then
      update public.sessions set creator_id = successor where id = p_session_id;
    end if;
  end if;

  if (select count(*) from public.session_members where session_id = p_session_id) < target.min_people then
    update public.sessions
    set status = 'open', confirmed_start = null, confirmed_end = null, room_id = null
    where id = p_session_id;
  end if;
end;
$$;

revoke all on function public.leave_session(text, text) from public;
grant execute on function public.leave_session(text, text) to authenticated, service_role;

create or replace function public.join_session(p_session_id text, p_user_id text)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sessions;
  member_count integer;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()::text) then
    raise exception 'cannot_join_for_another_user';
  end if;

  select * into target from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if exists (
    select 1 from public.session_members
    where session_id = p_session_id and user_id = p_user_id
  ) then
    return target;
  end if;

  select count(*) into member_count
  from public.session_members where session_id = p_session_id;
  if member_count >= target.max_people then raise exception 'session_full'; end if;

  insert into public.session_members (session_id, user_id)
  values (p_session_id, p_user_id);

  if member_count = 0 then
    update public.sessions set creator_id = p_user_id
    where id = p_session_id returning * into target;
  end if;

  if member_count + 1 >= target.min_people and target.status = 'open' then
    update public.sessions set status = 'group_formed'
    where id = p_session_id returning * into target;
  end if;

  return target;
end;
$$;

revoke all on function public.join_session(text, text) from public;
grant execute on function public.join_session(text, text) to authenticated, service_role;

-- The schedule update and attendance reset commit together. A repeated
-- calculation of the same interval preserves existing check-ins.
create or replace function public.reset_check_ins_on_reschedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.confirmed_start is distinct from new.confirmed_start
     or old.confirmed_end is distinct from new.confirmed_end then
    update public.session_members set checked_in_at = null
    where session_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.reset_check_ins_on_reschedule() from public;
create trigger reset_session_check_ins
  after update of confirmed_start, confirmed_end on public.sessions
  for each row execute function public.reset_check_ins_on_reschedule();
