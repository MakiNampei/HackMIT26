-- Run against a disposable database with all migrations applied.
begin;
insert into public.profiles (id, display_name, initials) values
  ('audit-owner', 'Owner', 'OW'), ('audit-next', 'Next', 'NE'), ('audit-last', 'Last', 'LA');
insert into public.courses (id, code, name, school) values ('audit-course', 'AUDIT', 'Audit', 'Test');
insert into public.sessions (id, course_id, creator_id, type, title, topic, min_people, max_people, duration_minutes)
values ('audit-session', 'audit-course', 'audit-owner', 'study', 'Audit session', 'Graphs', 2, 5, 60);
insert into public.session_members (session_id, user_id, joined_at) values
  ('audit-session', 'audit-owner', '2026-01-01Z'),
  ('audit-session', 'audit-next', '2026-01-02Z'),
  ('audit-session', 'audit-last', '2026-01-03Z');
select set_config('request.jwt.claim.role', 'service_role', true);
select public.leave_session('audit-session', 'audit-owner');
do $$ begin
  assert (select creator_id = 'audit-next' from public.sessions where id = 'audit-session'), 'ownership not transferred';
end $$;
update public.sessions set confirmed_start = '2026-09-22T20:00Z', confirmed_end = '2026-09-22T21:00Z' where id = 'audit-session';
update public.session_members set checked_in_at = '2026-09-22T20:05Z' where session_id = 'audit-session';
update public.sessions set confirmed_start = confirmed_start, confirmed_end = confirmed_end where id = 'audit-session';
do $$ begin
  assert (select count(*) = 2 from public.session_members where session_id = 'audit-session' and checked_in_at is not null), 'unchanged schedule lost attendance';
end $$;
update public.sessions set confirmed_end = '2026-09-22T21:30Z' where id = 'audit-session';
do $$ begin
  assert not exists (select 1 from public.session_members where session_id = 'audit-session' and checked_in_at is not null), 'reschedule retained attendance';
end $$;
select public.leave_session('audit-session', 'audit-next');
select public.leave_session('audit-session', 'audit-last');
select public.join_session('audit-session', 'audit-owner');
do $$ begin
  assert (select creator_id = 'audit-owner' from public.sessions where id = 'audit-session'), 'empty group did not acquire organizer';
end $$;
rollback;
