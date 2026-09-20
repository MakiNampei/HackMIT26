import type {
  AcademicPolicy,
  AvailabilitySlot,
  BestTimeResult,
  Course,
  Session,
  SessionWithDetails,
} from "@/lib/domain/types";

export type SessionFilters = {
  courseId?: string;
  status?: Session["status"];
};

export type CreateSessionInput = Omit<Session, "id" | "status" | "memberIds">;

export interface StudySyncRepository {
  confirmSession(sessionId: string, userId: string, expected: AvailabilitySlot & { roomId: string }): Promise<void>;
  selectRoom(sessionId: string, userId: string, roomId: string): Promise<void>;
  getCoursePolicy(courseId: string): Promise<AcademicPolicy | null>;
  saveCoursePolicy(courseId: string, policy: AcademicPolicy, sourceName: string): Promise<void>;
  savePolicy(sessionId: string, userId: string, policy: AcademicPolicy, sourceName: string): Promise<void>;
  acknowledgePolicy(sessionId: string, userId: string, policyId: string): Promise<void>;
  listCourses(): Promise<Course[]>;
  listSessions(filters?: SessionFilters): Promise<SessionWithDetails[]>;
  getSession(id: string): Promise<SessionWithDetails | null>;
  createSession(input: CreateSessionInput): Promise<Session>;
  updateCapacity(sessionId: string, userId: string, minPeople: number, maxPeople: number): Promise<void>;
  joinSession(sessionId: string, userId: string): Promise<Session>;
  leaveSession(sessionId: string, userId: string): Promise<void>;
  checkIn(sessionId: string, userId: string): Promise<string>;
  getAvailability(sessionId: string, userId: string): Promise<AvailabilitySlot[]>;
  submitAvailability(
    sessionId: string,
    userId: string,
    slots: AvailabilitySlot[],
  ): Promise<void>;
  calculateBestTime(sessionId: string): Promise<BestTimeResult | null>;
}
