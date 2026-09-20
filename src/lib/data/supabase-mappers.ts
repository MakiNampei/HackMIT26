import { demoRooms } from "./demo-rooms";
import type {
  AcademicPolicy,
  AvailabilitySlot,
  Course,
  PolicyEvidence,
  Room,
  Session,
  User,
} from "@/lib/domain/types";

export type CourseRow = { id: string; code: string; name: string; school: string };
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
  };
};

