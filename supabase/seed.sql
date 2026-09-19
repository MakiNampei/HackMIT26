insert into public.profiles (id, display_name, initials, can_help, needs_help) values
  ('user-maki', 'Maki', 'MK', array['Graph algorithms'], array['Dynamic programming']),
  ('user-alex', 'Alex', 'AL', array['Dynamic programming'], array['Graph algorithms']),
  ('user-ryan', 'Ryan', 'RY', array['Proof writing'], array['Recurrences']),
  ('user-sophia', 'Sophia', 'SP', array['Greedy algorithms'], array['Dynamic programming'])
on conflict (id) do update set
  display_name = excluded.display_name,
  initials = excluded.initials,
  can_help = excluded.can_help,
  needs_help = excluded.needs_help;

insert into public.courses (id, code, name, school) values
  ('course-cse347', 'CSE 347', 'Analysis of Algorithms', 'Washington University in St. Louis'),
  ('course-cse330', 'CSE 330', 'Rapid Prototype Development', 'Washington University in St. Louis')
on conflict (id) do update set code = excluded.code, name = excluded.name, school = excluded.school;

insert into public.rooms (id, building, name, capacity, distance_minutes, booking_url) values
  ('room-olin-204', 'Olin Library', 'Group Study Room 204', 6, 3, 'https://library.wustl.edu/'),
  ('room-bauer-210', 'Bauer Hall', 'Collaboration Room 210', 4, 6, 'https://olin.wustl.edu/EN-US/Resources/Pages/Room-Reservations.aspx'),
  ('room-whispers', 'Olin Library', 'Whispers Cafe Table', 8, 4, 'https://library.wustl.edu/')
on conflict (id) do update set
  building = excluded.building,
  name = excluded.name,
  capacity = excluded.capacity,
  distance_minutes = excluded.distance_minutes,
  booking_url = excluded.booking_url;

insert into public.academic_policies (
  id, course_id, source_name, document_hash, collaboration_allowed,
  discussion_allowed, solution_sharing_allowed, individual_submission_required,
  comparing_final_answers, summary, evidence, confidence, needs_instructor_review
) values (
  'policy-cse347-hw4',
  'course-cse347',
  'CSE347-syllabus.pdf',
  'demo-cse347-v1',
  true,
  true,
  false,
  true,
  'unclear',
  'Students may discuss approaches and concepts, but completed solutions cannot be shared and each student must submit independent work.',
  '[{"quote":"You may discuss general approaches with classmates. Submitted solutions must be written independently.","source":"CSE347-syllabus.pdf","page":4}]'::jsonb,
  0.930,
  false
)
on conflict (id) do update set
  summary = excluded.summary,
  evidence = excluded.evidence,
  confidence = excluded.confidence;

insert into public.sessions (
  id, course_id, creator_id, type, title, topic, min_people, max_people,
  duration_minutes, status, proposed_slots, confirmed_start, confirmed_end,
  room_id, policy_id
) values
  (
    'demo-session-1', 'course-cse347', 'user-alex', 'assignment',
    'Homework 4 study group', 'Dynamic programming', 2, 5, 90,
    'room_selected',
    '[{"start":"2026-09-22T22:00:00.000Z","end":"2026-09-23T02:00:00.000Z"}]'::jsonb,
    '2026-09-22T23:00:00.000Z', '2026-09-23T00:30:00.000Z',
    'room-olin-204', 'policy-cse347-hw4'
  ),
  (
    'demo-session-2', 'course-cse330', 'user-maki', 'exam_review',
    'Midterm review sprint', 'React patterns and web security', 2, 6, 60,
    'open',
    '[{"start":"2026-09-23T20:00:00.000Z","end":"2026-09-23T23:00:00.000Z"}]'::jsonb,
    null, null, null, null
  )
on conflict (id) do update set
  title = excluded.title,
  topic = excluded.topic,
  status = excluded.status,
  proposed_slots = excluded.proposed_slots,
  confirmed_start = excluded.confirmed_start,
  confirmed_end = excluded.confirmed_end,
  room_id = excluded.room_id,
  policy_id = excluded.policy_id;

insert into public.session_members (session_id, user_id) values
  ('demo-session-1', 'user-alex'),
  ('demo-session-1', 'user-maki'),
  ('demo-session-1', 'user-ryan'),
  ('demo-session-1', 'user-sophia'),
  ('demo-session-2', 'user-maki')
on conflict (session_id, user_id) do nothing;

insert into public.availability (session_id, user_id, starts_at, ends_at) values
  ('demo-session-1', 'user-maki', '2026-09-22T23:00:00.000Z', '2026-09-23T02:00:00.000Z'),
  ('demo-session-1', 'user-alex', '2026-09-22T22:00:00.000Z', '2026-09-23T02:00:00.000Z'),
  ('demo-session-1', 'user-ryan', '2026-09-22T22:30:00.000Z', '2026-09-23T00:30:00.000Z'),
  ('demo-session-1', 'user-sophia', '2026-09-22T23:00:00.000Z', '2026-09-23T01:30:00.000Z')
on conflict (session_id, user_id, starts_at, ends_at) do nothing;

