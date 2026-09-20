import { canMatchTime, policyAllowsCollaboration } from "@/lib/domain/policy-workflow";
import type {
  CreateSessionInput,
  SessionFilters,
  StudySyncRepository,
} from "@/lib/data/contracts";
import { getSupabaseServerClient } from "@/lib/data/supabase-client";
import {
  mapCourse,
  mapPolicy,
  mapProfile,
  mapRoom,
  mapSession,
  type CourseRow,
  type PolicyRow,
  type ProfileRow,
  type RoomRow,
  type SessionRow,
} from "@/lib/data/supabase-mappers";
import type {
  AvailabilitySlot,
  Course,
  Session,
  SessionWithDetails,
  User,
} from "@/lib/domain/types";
import { calculateBestOverlap, matchedSessionState } from "@/lib/services/availability";

type MemberRow = { session_id: string; user_id: string; checked_in_at?: string | null; policy_acknowledged_at?: string | null };
type AvailabilityRow = { user_id: string; starts_at: string; ends_at: string };

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown Supabase error"}`);
}

async function hydrateSessions(rows: SessionRow[]): Promise<SessionWithDetails[]> {
  if (rows.length === 0) return [];

  const client = getSupabaseServerClient();
  const sessionIds = rows.map((row) => row.id);
  const courseIds = [...new Set(rows.map((row) => row.course_id))];
  const roomIds = [...new Set(rows.flatMap((row) => (row.room_id ? [row.room_id] : [])))];
  const policyIds = [...new Set(rows.flatMap((row) => (row.policy_id ? [row.policy_id] : [])))];

  const [coursesResult, membersResult, roomsResult, policiesResult, coursePoliciesResult] = await Promise.all([
    client.from("courses").select("id, code, name, school").in("id", courseIds),
    client.from("session_members").select("*").in("session_id", sessionIds),
    roomIds.length
      ? client
          .from("rooms")
          .select("id, building, name, capacity, distance_minutes, booking_url")
          .in("id", roomIds)
      : Promise.resolve({ data: [], error: null }),
    policyIds.length
      ? client
          .from("academic_policies")
          .select(
            "id, created_at, collaboration_allowed, discussion_allowed, solution_sharing_allowed, individual_submission_required, comparing_final_answers, summary, evidence, confidence, needs_instructor_review",
          )
          .in("id", policyIds)
      : Promise.resolve({ data: [], error: null }),
    client.from("academic_policies").select("*").in("course_id", courseIds).eq("prompt_version", "course-policy-v1").order("created_at", { ascending: false }),
  ]);

  if (coursesResult.error) fail("Could not load courses", coursesResult.error);
  if (membersResult.error) fail("Could not load session members", membersResult.error);
  if (roomsResult.error) fail("Could not load rooms", roomsResult.error);
  if (coursePoliciesResult.error) fail("Could not load course policies", coursePoliciesResult.error);
  if (policiesResult.error) fail("Could not load academic policies", policiesResult.error);

  const memberRows = (membersResult.data ?? []) as MemberRow[];
  const userIds = [
    ...new Set([...rows.map((row) => row.creator_id), ...memberRows.map((row) => row.user_id)]),
  ];
  const profilesResult = await client
    .from("profiles")
    .select("id, display_name, initials, can_help, needs_help")
    .in("id", userIds);
  if (profilesResult.error) fail("Could not load profiles", profilesResult.error);

  const courses = new Map(
    ((coursesResult.data ?? []) as CourseRow[]).map((row) => [row.id, mapCourse(row)]),
  );
  const profiles = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, mapProfile(row)]),
  );
  const rooms = new Map(
    ((roomsResult.data ?? []) as RoomRow[]).map((row) => [row.id, mapRoom(row)]),
  );
  const policies = new Map(
    ((policiesResult.data ?? []) as PolicyRow[]).map((row) => [row.id, mapPolicy(row)]),
  );

  const memberIdsBySession = new Map<string, string[]>();
  for (const member of memberRows) {
    const ids = memberIdsBySession.get(member.session_id) ?? [];
    ids.push(member.user_id);
    memberIdsBySession.set(member.session_id, ids);
  }

  return rows.map((row) => {
    const session = mapSession(row);
    const course = courses.get(row.course_id);
    const creator = profiles.get(row.creator_id);
    if (!course || !creator) {
      throw new Error(`Session ${row.id} has missing course or creator data`);
    }

    const memberIds = memberIdsBySession.get(row.id) ?? [];
    const policyRow = ((policiesResult.data ?? []) as (PolicyRow & { created_at: string })[]).find(policy => policy.id === row.policy_id);
    // The legacy timestamp column stores the exact policy version's creation time.
    // Comparing it for equality prevents an in-flight old confirmation from approving a replacement policy.
    const policyAcknowledgements = Object.fromEntries(memberRows.filter(member => member.session_id === row.id && policyRow && member.policy_acknowledged_at === policyRow.created_at).map(member => [member.user_id, policyRow!.id]));
    const coursePolicy = (coursePoliciesResult.data ?? []).find(policy => policy.course_id === row.course_id);
    const details: SessionWithDetails = {
      ...session,
      memberIds,
      policyAcknowledgements,
      checkIns: Object.fromEntries(memberRows.filter(member => member.session_id === row.id && member.checked_in_at).map(member => [member.user_id, member.checked_in_at!])),
      course,
      creator,
      members: memberIds.map((id) => profiles.get(id)).filter((user): user is User => Boolean(user)),
      room: row.room_id ? rooms.get(row.room_id) : undefined,
      policy: coursePolicy ? mapPolicy(coursePolicy as PolicyRow) : session.type === "assignment" ? undefined : row.policy_id ? policies.get(row.policy_id) : undefined,
      coursePolicyConfirmed: !!coursePolicy,
    };
    if (!canMatchTime(details)) Object.assign(details, matchedSessionState(details, null), { room: undefined });
    return details;
  });
}

async function listCourses(): Promise<Course[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("courses")
    .select("id, code, name, school")
    .order("code");
  if (error) fail("Could not list courses", error);
  return ((data ?? []) as CourseRow[]).map(mapCourse);
}

async function listSessions(filters?: SessionFilters): Promise<SessionWithDetails[]> {
  let query = getSupabaseServerClient()
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.courseId) query = query.eq("course_id", filters.courseId);
  if (filters?.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) fail("Could not list sessions", error);
  return hydrateSessions((data ?? []) as SessionRow[]);
}

async function getSession(id: string): Promise<SessionWithDetails | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("Could not load session", error);
  if (!data) return null;
  return (await hydrateSessions([data as SessionRow]))[0] ?? null;
}

async function createSession(input: CreateSessionInput): Promise<Session> {
  const { data, error } = await getSupabaseServerClient()
    .rpc("create_session_with_creator", {
      p_course_id: input.courseId,
      p_creator_id: input.creatorId,
      p_type: input.type,
      p_title: input.title,
      p_topic: input.topic,
      p_min_people: input.minPeople,
      p_max_people: input.maxPeople,
      p_duration_minutes: input.durationMinutes,
      p_proposed_slots: input.proposedSlots,
    })
    .single();
  if (error) fail("Could not create session", error);
  const policy = await supabaseRepository.getCoursePolicy(input.courseId);
  if (policy && input.type === "assignment") {
    const { error: policyError } = await getSupabaseServerClient().from("sessions").update({ policy_id: policy.id }).eq("id", (data as SessionRow).id);
    if (policyError) fail("Could not link course policy", policyError);
  }
  return { ...mapSession(data as SessionRow), memberIds: [input.creatorId] };
}

async function joinSession(sessionId: string, userId: string): Promise<Session> {
  const { data, error } = await getSupabaseServerClient()
    .rpc("join_session", { p_session_id: sessionId, p_user_id: userId })
    .single();
  if (error) fail("Could not join session", error);

  const { data: members, error: membersError } = await getSupabaseServerClient()
    .from("session_members")
    .select("user_id")
    .eq("session_id", sessionId);
  if (membersError) fail("Could not load joined members", membersError);
  if ((data as SessionRow).type === "assignment") await refreshMatchedTime(sessionId);
  return {
    ...mapSession(data as SessionRow),
    memberIds: (members ?? []).map((member) => member.user_id as string),
  };
}

async function leaveSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseServerClient().rpc("leave_session", {
    p_session_id: sessionId,
    p_user_id: userId,
  });
  if (error) fail("Could not leave session", error);
  if ((await getSession(sessionId))?.type === "assignment") await refreshMatchedTime(sessionId);
}

async function submitAvailability(
  sessionId: string,
  userId: string,
  slots: AvailabilitySlot[],
): Promise<void> {
  const { error } = await getSupabaseServerClient().rpc("replace_availability", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_slots: slots.map((slot) => ({ start_at: slot.start, end_at: slot.end })),
  });
  if (error) fail("Could not save availability", error);
  await refreshMatchedTime(sessionId);
}

async function refreshMatchedTime(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return;
  const result = await calculateBestTime(sessionId);
  const state = matchedSessionState(session, result);
  let update = getSupabaseServerClient().from("sessions").update({
    status: state.status,
    confirmed_start: state.confirmedSlot?.start ?? null,
    confirmed_end: state.confirmedSlot?.end ?? null,
    room_id: state.roomId ?? null,
  }).eq("id", sessionId);

  update = session.policyId ? update.eq("policy_id", session.policyId) : update.is("policy_id", null);
  const { error: updateError } = await update;
  if (updateError) fail("Availability saved, but could not update the matched time", updateError);
}

async function calculateBestTime(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session || !canMatchTime(session)) return null;
  const client = getSupabaseServerClient();
  const [sessionResult, membersResult, availabilityResult] = await Promise.all([
    client.from("sessions").select("duration_minutes, min_people").eq("id", sessionId).maybeSingle(),
    client.from("session_members").select("user_id").eq("session_id", sessionId),
    client
      .from("availability")
      .select("user_id, starts_at, ends_at")
      .eq("session_id", sessionId),
  ]);
  if (sessionResult.error) fail("Could not load session duration", sessionResult.error);
  if (membersResult.error) fail("Could not load session members", membersResult.error);
  if (availabilityResult.error) fail("Could not load availability", availabilityResult.error);
  if (!sessionResult.data) return null;

  const availabilityByUser: Record<string, AvailabilitySlot[]> = {};
  for (const member of membersResult.data ?? []) availabilityByUser[member.user_id as string] = [];
  for (const row of (availabilityResult.data ?? []) as AvailabilityRow[]) {
    availabilityByUser[row.user_id] ??= [];
    availabilityByUser[row.user_id].push({ start: row.starts_at, end: row.ends_at });
  }
  return calculateBestOverlap(
    availabilityByUser,
    sessionResult.data.duration_minutes as number,
    sessionResult.data.min_people as number,
  );
}

export const supabaseRepository: StudySyncRepository = {
  async getCoursePolicy(courseId) {
    const { data, error } = await getSupabaseServerClient().from("academic_policies").select("*").eq("course_id", courseId).eq("prompt_version", "course-policy-v1").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) fail("Could not load course policy", error);
    return data ? mapPolicy(data as PolicyRow) : null;
  },
  async saveCoursePolicy(courseId, policy, sourceName) {
    const client = getSupabaseServerClient();
    const { error } = await client.from("academic_policies").insert({
      id: policy.id, course_id: courseId, source_name: sourceName, document_hash: policy.id, prompt_version: "course-policy-v1",
      collaboration_allowed: policy.collaborationAllowed, discussion_allowed: policy.discussionAllowed,
      solution_sharing_allowed: policy.solutionSharingAllowed, individual_submission_required: policy.individualSubmissionRequired,
      comparing_final_answers: policy.comparingFinalAnswers, summary: policy.summary, evidence: policy.evidence,
      confidence: policy.confidence, needs_instructor_review: policy.needsInstructorReview,
    });
    if (error) fail("Could not save course policy", error);
    const { data: sessions, error: sessionsError } = await client.from("sessions").update({ policy_id: policy.id, confirmed_start: null, confirmed_end: null, room_id: null, status: "open" }).eq("course_id", courseId).eq("type", "assignment").select("id");
    if (sessionsError) fail("Course policy saved, but sessions could not be updated", sessionsError);
    for (const session of sessions ?? []) await refreshMatchedTime(session.id);
  },
  async savePolicy(sessionId, userId, policy, sourceName) {
    const session = await getSession(sessionId);
    if (!session || session.creatorId !== userId || !session.memberIds.includes(userId)) throw new Error("creator_only");
    const client = getSupabaseServerClient();
    const { error } = await client.from("academic_policies").insert({
      id: policy.id, course_id: session.courseId, source_name: sourceName,
      document_hash: policy.id,
      collaboration_allowed: policy.collaborationAllowed, discussion_allowed: policy.discussionAllowed,
      solution_sharing_allowed: policy.solutionSharingAllowed, individual_submission_required: policy.individualSubmissionRequired,
      comparing_final_answers: policy.comparingFinalAnswers, summary: policy.summary,
      evidence: policy.evidence, confidence: policy.confidence, needs_instructor_review: policy.needsInstructorReview,
    });
    if (error) fail("Could not save policy", error);
    const { error: linkError } = await client.from("sessions").update({
      policy_id: policy.id, confirmed_start: null, confirmed_end: null, room_id: null,
      status: session.memberIds.length >= session.minPeople ? "group_formed" : "open",
    }).eq("id", sessionId).eq("creator_id", userId);
    if (linkError) fail("Could not attach policy", linkError);
  },
  async acknowledgePolicy(sessionId, userId, policyId) {
    const session = await getSession(sessionId);
    if (!session?.memberIds.includes(userId)) throw new Error("not_a_session_member");
    if (session.policyId !== policyId) throw new Error("policy_changed");
    if (!policyAllowsCollaboration(session.policy)) throw new Error("policy_needs_clarification");
    const client = getSupabaseServerClient();
    const { data: policy, error } = await client.from("academic_policies").select("created_at").eq("id", policyId).single();
    if (error) fail("Could not load policy version", error);
    const { error: ackError } = await client.from("session_members").update({ policy_acknowledged_at: policy.created_at }).eq("session_id", sessionId).eq("user_id", userId);
    if (ackError) fail("Could not confirm policy", ackError);
    const current = await getSession(sessionId);
    if (current?.policyId !== policyId) throw new Error("policy_changed");
    await refreshMatchedTime(sessionId);
  },
  async checkIn(sessionId, userId) {
    const { data, error } = await getSupabaseServerClient().rpc("check_in_session", {
      p_session_id: sessionId, p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    if (typeof data !== "string") throw new Error("invalid_check_in_response");
    return data;
  },
  async updateCapacity(sessionId, userId, minPeople, maxPeople) {
    const { error } = await getSupabaseServerClient().rpc("update_session_capacity", {
      p_session_id: sessionId, p_user_id: userId,
      p_min_people: minPeople, p_max_people: maxPeople,
    });
    if (error) fail("Could not update session capacity", error);
  },
  listCourses,
  listSessions,
  getSession,
  createSession,
  joinSession,
  leaveSession,
  async getAvailability(sessionId, userId) {
    const { data, error } = await getSupabaseServerClient().from("availability")
      .select("starts_at, ends_at").eq("session_id", sessionId).eq("user_id", userId).order("starts_at");
    if (error) fail("Could not load your availability", error);
    return (data ?? []).map(row => ({ start: row.starts_at as string, end: row.ends_at as string }));
  },
  submitAvailability,
  calculateBestTime,
};
