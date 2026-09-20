import { demoRooms } from "./demo-rooms";
import type {
  AcademicPolicy,
  AvailabilitySlot,
  Course,
  Goal,
  PolicyEvidence,
  Room,
  Session,
  SessionSyncBrief,
  SessionSyncCheckin,
  User,
} from "@/lib/domain/types";

export type CourseRow = { id: string; code: string; name: string; school: string };
export type GoalRow = {
  id: string;
  owner_id: string;
  course_id: string;
  type: Goal["type"];
  title: string;
  description: string;
  target_date: string;
  duration_minutes: number;
  created_at: string;
};
export type SessionSyncCheckinRow = {
  session_id: string;
  user_id: string;
  progress: SessionSyncCheckin["progress"];
  today_goal: string;
  work_style: SessionSyncCheckin["workStyle"];
  blocker: string | null;
  updated_at: string;
};
export type SessionSyncBriefRow = {
  session_id: string;
  content: string;
  model_name: string;
  generated_at: string;
};
export type ProfileRow = {
  id: string;
  display_name: string;
  initials: string;
  can_help: string[] | null;
  needs_help: string[] | null;
};
export type RoomRow = {
  id: string;
  building: string;
  name: string;
  capacity: number;
  distance_minutes: number;
  booking_url: string;
};
export type PolicyRow = {
  id: string;
  collaboration_allowed: boolean | null;
  discussion_allowed: boolean | null;
  solution_sharing_allowed: boolean | null;
  individual_submission_required: boolean | null;
  comparing_final_answers: AcademicPolicy["comparingFinalAnswers"];
  summary: string;
  evidence: unknown;
  confidence: number | string;
  needs_instructor_review: boolean;
};
export type SessionRow = {
  id: string;
  course_id: string;
  creator_id: string;
  type: Session["type"];
  title: string;
  topic: string;
  min_people: number;
  max_people: number;
  duration_minutes: number;
  status: Session["status"];
  proposed_slots: unknown;
  confirmed_start: string | null;
  confirmed_end: string | null;
  room_id: string | null;
  policy_id: string | null;
  goal_id?: string | null;
};

function isAvailabilitySlot(value: unknown): value is AvailabilitySlot {
  if (!value || typeof value !== "object") return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.start === "string" && typeof slot.end === "string";
}

function isPolicyEvidence(value: unknown): value is PolicyEvidence {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Record<string, unknown>;
  return (
    typeof evidence.quote === "string" &&
    typeof evidence.source === "string" &&
    (typeof evidence.page === "number" || evidence.page === null)
  );
}

export const mapCourse = (row: CourseRow): Course => ({ ...row });

export const mapGoal = (row: GoalRow): Goal => ({
  id: row.id,
  ownerId: row.owner_id,
  courseId: row.course_id,
  type: row.type,
  title: row.title,
  description: row.description,
  targetDate: row.target_date,
  durationMinutes: row.duration_minutes,
  createdAt: row.created_at,
});

export const mapSessionSyncCheckin = (row: SessionSyncCheckinRow): SessionSyncCheckin => ({
  sessionId: row.session_id,
  userId: row.user_id,
  progress: row.progress,
  todayGoal: row.today_goal,
  workStyle: row.work_style,
  blocker: row.blocker ?? undefined,
  updatedAt: row.updated_at,
});

export const mapSessionSyncBrief = (row: SessionSyncBriefRow): SessionSyncBrief => ({
  sessionId: row.session_id,
  content: row.content,
  modelName: row.model_name,
  generatedAt: row.generated_at,
});

export const mapProfile = (row: ProfileRow): User => ({
  id: row.id,
  name: row.display_name,
  initials: row.initials,
  canHelp: row.can_help ?? [],
  needsHelp: row.needs_help ?? [],
});

export const mapRoom = (row: RoomRow): Room => ({
  facilities: demoRooms.find(room => room.id === row.id)?.facilities,
  isDemo: demoRooms.some(room => room.id === row.id),
  id: row.id,
  building: row.building,
  name: row.name,
  capacity: row.capacity,
  distanceMinutes: row.distance_minutes,
  bookingUrl: row.booking_url,
});

export const mapPolicy = (row: PolicyRow): AcademicPolicy => ({
  id: row.id,
  collaborationAllowed: row.collaboration_allowed,
  discussionAllowed: row.discussion_allowed,
  solutionSharingAllowed: row.solution_sharing_allowed,
  individualSubmissionRequired: row.individual_submission_required,
  comparingFinalAnswers: row.comparing_final_answers,
  summary: row.summary,
  evidence: Array.isArray(row.evidence) ? row.evidence.filter(isPolicyEvidence) : [],
  confidence: Number(row.confidence),
  needsInstructorReview: row.needs_instructor_review,
});

export const mapSession = (row: SessionRow): Session => {
  const proposedSlots = Array.isArray(row.proposed_slots)
    ? row.proposed_slots.filter(isAvailabilitySlot)
    : [];
  const confirmedSlot =
    row.confirmed_start && row.confirmed_end
      ? { start: row.confirmed_start, end: row.confirmed_end }
      : undefined;

  return {
    id: row.id,
    courseId: row.course_id,
    creatorId: row.creator_id,
    type: row.type,
    title: row.title,
    topic: row.topic,
    minPeople: row.min_people,
    maxPeople: row.max_people,
    durationMinutes: row.duration_minutes,
    status: row.status,
    memberIds: [],
    proposedSlots,
    confirmedSlot,
    roomId: row.room_id ?? undefined,
    policyId: row.policy_id ?? undefined,
    goalId: row.goal_id ?? undefined,
  };
};
