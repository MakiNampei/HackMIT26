export type SessionType = "study" | "assignment" | "exam_review";

export type GoalType = "review" | "preview" | "project" | "homework";

export type Goal = {
  id: string;
  ownerId: string;
  courseId: string;
  type: GoalType;
  title: string;
  description: string;
  targetDate: string;
  durationMinutes: number;
  createdAt: string;
};

export type SessionStatus =
  | "open"
  | "group_formed"
  | "time_matched"
  | "policy_verified"
  | "room_selected"
  | "confirmed";

export type AvailabilitySlot = {
  start: string;
  end: string;
};

export type User = {
  id: string;
  name: string;
  initials: string;
  canHelp: string[];
  needsHelp: string[];
};

export type Course = {
  id: string;
  code: string;
  name: string;
  school: string;
};

export type Session = {
  id: string;
  courseId: string;
  creatorId: string;
  type: SessionType;
  title: string;
  topic: string;
  minPeople: number;
  maxPeople: number;
  durationMinutes: number;
  status: SessionStatus;
  memberIds: string[];
  proposedSlots: AvailabilitySlot[];
  confirmedSlot?: AvailabilitySlot;
  roomId?: string;
  policyId?: string;
  goalId?: string;
};

export type Room = {
  facilities?: string[];
  isDemo?: boolean;
  id: string;
  building: string;
  name: string;
  capacity: number;
  distanceMinutes: number;
  bookingUrl: string;
};

export type PolicyEvidence = {
  quote: string;
  source: string;
  page: number | null;
};

export type AcademicPolicy = {
  id: string;
  collaborationAllowed: boolean | null;
  discussionAllowed: boolean | null;
  solutionSharingAllowed: boolean | null;
  individualSubmissionRequired: boolean | null;
  comparingFinalAnswers: "allowed" | "not_allowed" | "unclear";
  summary: string;
  evidence: PolicyEvidence[];
  confidence: number;
  needsInstructorReview: boolean;
};

export type SessionWithDetails = Session & {
  coursePolicyConfirmed?: boolean;
  policyAcknowledgements?: Record<string, string>;
  checkIns?: Record<string, string>;
  course: Course;
  creator: User;
  members: User[];
  room?: Room;
  policy?: AcademicPolicy;
};

export type BestTimeResult = AvailabilitySlot & {
  availableCount: number;
  totalCount: number;
};
