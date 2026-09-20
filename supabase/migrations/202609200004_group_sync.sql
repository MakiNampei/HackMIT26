create table public.session_sync_checkins (
  session_id text not null references public.sessions(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  progress text not null check (progress in ('starting', 'in_progress', 'comfortable', 'ahead')),
  today_goal text not null check (char_length(today_goal) between 2 and 160),
  work_style text not null check (work_style in ('together', 'independent_then_regroup', 'explain', 'example')),
  blocker text check (blocker is null or char_length(blocker) <= 160),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table public.session_sync_briefs (
  session_id text primary key references public.sessions(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 16000),
  model_name text not null,
  generated_by text not null references public.profiles(id),
  generated_at timestamptz not null default now()
);

grant select, insert, update on public.session_sync_checkins to authenticated;
grant select on public.session_sync_briefs to authenticated;
grant all privileges on public.session_sync_checkins, public.session_sync_briefs to service_role;

alter table public.session_sync_checkins enable row level security;
alter table public.session_sync_briefs enable row level security;

create policy "session members can read sync check-ins"
on public.session_sync_checkins for select to authenticated
using (exists (
  select 1 from public.session_members
  where session_members.session_id = session_sync_checkins.session_id
    and session_members.user_id = auth.uid()::text
));

create policy "session members can add their sync check-in"
on public.session_sync_checkins for insert to authenticated
with check (
  user_id = auth.uid()::text and exists (
    select 1 from public.session_members
    where session_members.session_id = session_sync_checkins.session_id
      and session_members.user_id = auth.uid()::text
  )
);

create policy "session members can update their sync check-in"
on public.session_sync_checkins for update to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

create policy "session members can read sync briefs"
on public.session_sync_briefs for select to authenticated
using (exists (
  select 1 from public.session_members
  where session_members.session_id = session_sync_briefs.session_id
    and session_members.user_id = auth.uid()::text
));

create policy "linked session members can read goals"
on public.goal_journeys for select to authenticated
using (
  owner_id = auth.uid()::text or exists (
    select 1
    from public.sessions
    join public.session_members on session_members.session_id = sessions.id
    where sessions.goal_id = goal_journeys.id
      and session_members.user_id = auth.uid()::text
  )
);
