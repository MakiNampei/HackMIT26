-- Lock the same row as join/leave so capacity cannot shrink below concurrent joins.
create or replace function public.update_session_capacity(
  p_session_id text, p_user_id text, p_min_people integer, p_max_people integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sessions;
  member_count integer;
  reset_time boolean;
  reset_room boolean;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() is null or p_user_id is distinct from auth.uid()::text) then
    raise exception 'creator_only';
  end if;
  select * into target from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;
  if target.creator_id is distinct from p_user_id then raise exception 'creator_only'; end if;
  if p_min_people is null or p_max_people is null
     or p_min_people not between 2 and 12 or p_max_people not between 2 and 20
     or p_max_people < p_min_people then raise exception 'invalid_capacity'; end if;
  select count(*) into member_count from public.session_members where session_id = p_session_id;
  if p_max_people < member_count then raise exception 'capacity_below_members'; end if;
  if p_min_people = target.min_people and p_max_people = target.max_people then return; end if;
  reset_time := p_min_people > target.min_people or member_count < p_min_people;
  reset_room := exists (select 1 from public.rooms where id = target.room_id and capacity < p_max_people);
  update public.sessions set
    min_people = p_min_people,
    max_people = p_max_people,
    confirmed_start = case when reset_time then null else confirmed_start end,
    confirmed_end = case when reset_time then null else confirmed_end end,
    room_id = case when reset_time or reset_room then null else room_id end,
    status = case
      when reset_time then (case when member_count >= p_min_people then 'group_formed' else 'open' end)::public.session_status
      when reset_room then (case when confirmed_start is not null then 'time_matched' when member_count >= p_min_people then 'group_formed' else 'open' end)::public.session_status
      when status = 'open' and member_count >= p_min_people then 'group_formed'
      else status end
  where id = p_session_id;
end;
$$;

revoke all on function public.update_session_capacity(text, text, integer, integer) from public;
grant execute on function public.update_session_capacity(text, text, integer, integer) to authenticated, service_role;
