create extension if not exists pgcrypto;

create type public.session_type as enum ('study', 'assignment', 'exam_review');
create type public.session_status as enum (
  'open',
  'group_formed',
  'time_matched',
  'policy_verified',
  'room_selected',
  'confirmed'
);

-- IDs are text so the seeded hackathon identities (for example, user-maki) and
-- future Supabase Auth UUIDs can use the same repository contract.
create table public.profiles (
  id text primary key,
  display_name text not null check (char_length(display_name) between 1 and 80),
  initials text not null check (char_length(initials) between 1 and 4),
  school text not null default 'Washington University in St. Louis',
  can_help text[] not null default '{}',
  needs_help text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.courses (
  id text primary key default gen_random_uuid()::text,
  code text not null,
  name text not null,
  school text not null,
  created_at timestamptz not null default now(),
  unique (school, code)
);

create table public.rooms (
  id text primary key default gen_random_uuid()::text,
  building text not null,
  name text not null,
  capacity smallint not null check (capacity > 0),
  distance_minutes smallint not null check (distance_minutes >= 0),
  booking_url text not null,
  created_at timestamptz not null default now()
);

create table public.academic_policies (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id) on delete cascade,
  source_name text not null,
  document_hash text,
  collaboration_allowed boolean,
  discussion_allowed boolean,
  solution_sharing_allowed boolean,
  individual_submission_required boolean,
  comparing_final_answers text not null default 'unclear'
    check (comparing_final_answers in ('allowed', 'not_allowed', 'unclear')),
  summary text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  needs_instructor_review boolean not null default false,
  model_name text,
  prompt_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique nulls not distinct (course_id, document_hash, prompt_version)
);

create table public.sessions (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses(id),
  creator_id text not null references public.profiles(id),
  type public.session_type not null,
  title text not null check (char_length(title) between 3 and 100),
  topic text not null check (char_length(topic) between 2 and 160),
  min_people smallint not null check (min_people between 2 and 12),
  max_people smallint not null check (max_people between min_people and 20),
  duration_minutes smallint not null check (
    duration_minutes between 30 and 240 and duration_minutes % 15 = 0
  ),
  status public.session_status not null default 'open',
  proposed_slots jsonb not null default '[]'::jsonb
    check (jsonb_typeof(proposed_slots) = 'array'),
  confirmed_start timestamptz,
  confirmed_end timestamptz,
  room_id text references public.rooms(id),
  policy_id text references public.academic_policies(id),
  created_at timestamptz not null default now(),
  check (
    (confirmed_start is null and confirmed_end is null)
    or (confirmed_start is not null and confirmed_end > confirmed_start)
  )
);

create table public.session_members (
  session_id text not null references public.sessions(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  policy_acknowledged_at timestamptz,
  primary key (session_id, user_id)
);

create table public.availability (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references public.sessions(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (session_id, user_id, starts_at, ends_at)
);

create index sessions_course_status_idx on public.sessions(course_id, status);
create index session_members_user_idx on public.session_members(user_id);
create index availability_session_time_idx on public.availability(session_id, starts_at, ends_at);
create index rooms_capacity_distance_idx on public.rooms(capacity, distance_minutes);
create index academic_policies_course_idx on public.academic_policies(course_id);

-- Create the session and its creator membership atomically.
create or replace function public.create_session_with_creator(
  p_course_id text,
  p_creator_id text,
  p_type public.session_type,
  p_title text,
  p_topic text,
  p_min_people smallint,
  p_max_people smallint,
  p_duration_minutes smallint,
  p_proposed_slots jsonb
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.sessions;
begin
  if auth.role() <> 'service_role' and p_creator_id <> auth.uid()::text then
    raise exception 'cannot_create_for_another_user';
  end if;

  insert into public.sessions (
    course_id, creator_id, type, title, topic, min_people, max_people,
    duration_minutes, proposed_slots
  ) values (
    p_course_id, p_creator_id, p_type, p_title, p_topic, p_min_people,
    p_max_people, p_duration_minutes, p_proposed_slots
  ) returning * into created;

  insert into public.session_members (session_id, user_id)
  values (created.id, p_creator_id);

  return created;
end;
$$;

-- Joining is atomic and locks the session row so concurrent joins cannot exceed capacity.
create or replace function public.join_session(p_session_id text, p_user_id text)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.sessions;
  member_count integer;
begin
  if auth.role() <> 'service_role' and p_user_id <> auth.uid()::text then
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

  if member_count + 1 >= target.min_people and target.status = 'open' then
    update public.sessions set status = 'group_formed'
    where id = p_session_id returning * into target;
  end if;

  return target;
end;
$$;

-- Availability replacement is one transaction, avoiding a half-deleted schedule.
create or replace function public.replace_availability(
  p_session_id text,
  p_user_id text,
  p_slots jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and p_user_id <> auth.uid()::text then
    raise exception 'cannot_edit_another_users_availability';
  end if;

  if not exists (
    select 1 from public.session_members
    where session_id = p_session_id and user_id = p_user_id
  ) then
    raise exception 'not_a_session_member';
  end if;

  delete from public.availability
  where session_id = p_session_id and user_id = p_user_id;

  insert into public.availability (session_id, user_id, starts_at, ends_at)
  select p_session_id, p_user_id, slot.start_at, slot.end_at
  from jsonb_to_recordset(p_slots) as slot(start_at timestamptz, end_at timestamptz);
end;
$$;

revoke all on function public.create_session_with_creator(
  text, text, public.session_type, text, text, smallint, smallint, smallint, jsonb
) from public;
revoke all on function public.join_session(text, text) from public;
revoke all on function public.replace_availability(text, text, jsonb) from public;
grant execute on function public.create_session_with_creator(
  text, text, public.session_type, text, text, smallint, smallint, smallint, jsonb
) to authenticated, service_role;
grant execute on function public.join_session(text, text) to authenticated, service_role;
grant execute on function public.replace_availability(text, text, jsonb) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.rooms enable row level security;
alter table public.academic_policies enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.availability enable row level security;

create policy "authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()::text) with check (id = auth.uid()::text);
create policy "authenticated users can read courses"
  on public.courses for select to authenticated using (true);
create policy "authenticated users can read rooms"
  on public.rooms for select to authenticated using (true);
create policy "authenticated users can read policies"
  on public.academic_policies for select to authenticated using (true);
create policy "authenticated users can read sessions"
  on public.sessions for select to authenticated using (true);
create policy "users can create their own sessions"
  on public.sessions for insert to authenticated with check (creator_id = auth.uid()::text);
create policy "session creators can update sessions"
  on public.sessions for update to authenticated using (creator_id = auth.uid()::text);
create policy "authenticated users can read memberships"
  on public.session_members for select to authenticated using (true);
create policy "users can join as themselves"
  on public.session_members for insert to authenticated with check (user_id = auth.uid()::text);
create policy "members can read session availability"
  on public.availability for select to authenticated using (
    exists (
      select 1 from public.session_members sm
      where sm.session_id = availability.session_id and sm.user_id = auth.uid()::text
    )
  );
create policy "users manage their own availability"
  on public.availability for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
