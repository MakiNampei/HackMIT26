create table public.goal_journeys (
  id text primary key default gen_random_uuid()::text,
  owner_id text not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id),
  type text not null check (type in ('review', 'preview', 'project', 'homework')),
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 2 and 500),
  target_date date not null,
  duration_minutes smallint not null default 60 check (
    duration_minutes between 30 and 240 and duration_minutes % 15 = 0
  ),
  created_at timestamptz not null default now()
);

alter table public.sessions
  add column goal_id text references public.goal_journeys(id) on delete set null;

create index goal_journeys_owner_created_idx
  on public.goal_journeys(owner_id, created_at desc);
create index sessions_goal_idx on public.sessions(goal_id);

grant select, insert on public.goal_journeys to authenticated;
grant all privileges on public.goal_journeys to service_role;

alter table public.goal_journeys enable row level security;

create policy "users can read their own goals"
  on public.goal_journeys for select to authenticated
  using (owner_id = auth.uid()::text);

create policy "users can create their own goals"
  on public.goal_journeys for insert to authenticated
  with check (owner_id = auth.uid()::text);

create or replace function public.link_session_to_goal(
  p_session_id text,
  p_goal_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.uid()::text;
begin
  if auth.role() is distinct from 'service_role' and current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.sessions
    where id = p_session_id
      and (auth.role() = 'service_role' or creator_id = current_user_id)
  ) then
    raise exception 'session_not_owned';
  end if;

  if not exists (
    select 1 from public.goal_journeys
    where id = p_goal_id
      and (auth.role() = 'service_role' or owner_id = current_user_id)
  ) then
    raise exception 'goal_not_owned';
  end if;

  if not exists (
    select 1
    from public.sessions s
    join public.goal_journeys g on g.id = p_goal_id
    where s.id = p_session_id and s.course_id = g.course_id
  ) then
    raise exception 'goal_course_mismatch';
  end if;

  update public.sessions set goal_id = p_goal_id where id = p_session_id;
end;
$$;

revoke all on function public.link_session_to_goal(text, text) from public;
grant execute on function public.link_session_to_goal(text, text)
  to authenticated, service_role;
