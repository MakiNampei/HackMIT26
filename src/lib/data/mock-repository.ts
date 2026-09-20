import { demoRooms } from "./demo-rooms";
import { validateRoomSelection, validateSessionConfirmation } from "@/lib/services/room";
import { canMatchTime, policyAllowsCollaboration } from "@/lib/domain/policy-workflow";
import type { CreateGoalInput, CreateSessionInput, StudySyncRepository } from "@/lib/data/contracts";
import type {
  AcademicPolicy,
  AvailabilitySlot,
  Course,
  Goal,
  Room,
  Session,
  SessionSyncBrief,
  SessionSyncCheckin,
  SessionWithDetails,
  User,
} from "@/lib/domain/types";
import { calculateBestOverlap, matchedSessionState } from "@/lib/services/availability";
import { sessionCapacitySchema } from "@/lib/domain/schemas";

const users: User[] = [
  {
    id: "user-maki",
    name: "Maki",
    initials: "MK",
    canHelp: ["Graph algorithms"],
    needsHelp: ["Dynamic programming"],
  },
  {
    id: "user-alex",
    name: "Alex",
    initials: "AL",
    canHelp: ["Dynamic programming"],
    needsHelp: ["Graph algorithms"],
  },
  {
    id: "user-ryan",
    name: "Ryan",
    initials: "RY",
    canHelp: ["Proof writing"],
    needsHelp: ["Recurrences"],
  },
  {
    id: "user-sophia",
    name: "Sophia",
    initials: "SP",
    canHelp: ["Greedy algorithms"],
    needsHelp: ["Dynamic programming"],
  },
];

const courses: Course[] = [
  {
    id: "course-cse347",
    code: "CSE 347",
    name: "Analysis of Algorithms",
    school: "Washington University in St. Louis",
  },
  {
    id: "course-cse330",
    code: "CSE 330",
    name: "Rapid Prototype Development",
    school: "Washington University in St. Louis",
  },
];

const rooms: Room[] = [
  ...demoRooms,
  {
    id: "room-olin-204",
    building: "Olin Library",
    name: "Group Study Room 204",
    capacity: 6,
    distanceMinutes: 3,
    bookingUrl: "https://library.wustl.edu/",
  },
];

const policies: AcademicPolicy[] = [
  {
    id: "policy-cse347-hw4",
    collaborationAllowed: true,
    discussionAllowed: true,
    solutionSharingAllowed: false,
    individualSubmissionRequired: true,
    comparingFinalAnswers: "unclear",
    summary:
      "Students may discuss approaches and concepts, but completed solutions cannot be shared and each student must submit independent work.",
    evidence: [
      {
        quote:
          "You may discuss general approaches with classmates. Submitted solutions must be written independently.",
        source: "CSE347-syllabus.pdf",
        page: 4,
      },
    ],
    confidence: 0.93,
    needsInstructorReview: false,
  },
];

const sessions: Session[] = [
  {
    id: "demo-session-1",
    courseId: "course-cse347",
    creatorId: "user-alex",
    type: "assignment",
    title: "Homework 4 study group",
    topic: "Dynamic programming",
    minPeople: 2,
    maxPeople: 5,
    durationMinutes: 90,
    status: "room_selected",
    memberIds: ["user-alex", "user-maki", "user-ryan", "user-sophia"],
    proposedSlots: [
      { start: "2026-09-22T22:00:00.000Z", end: "2026-09-23T02:00:00.000Z" },
    ],
    confirmedSlot: {
      start: "2026-09-22T23:00:00.000Z",
      end: "2026-09-23T00:30:00.000Z",
    },
    roomId: "room-olin-204",
    policyId: "policy-cse347-hw4",
  },
  {
    id: "demo-session-2",
    courseId: "course-cse330",
    creatorId: "user-maki",
    type: "exam_review",
    title: "Midterm review sprint",
    topic: "React patterns and web security",
    minPeople: 2,
    maxPeople: 6,
    durationMinutes: 60,
    status: "open",
    memberIds: ["user-maki"],
    proposedSlots: [
      { start: "2026-09-23T20:00:00.000Z", end: "2026-09-23T23:00:00.000Z" },
    ],
  },
];

const availability: Record<string, Record<string, AvailabilitySlot[]>> = {
  "demo-session-1": {
    "user-maki": [
      { start: "2026-09-22T23:00:00.000Z", end: "2026-09-23T02:00:00.000Z" },
    ],
    "user-alex": [
      { start: "2026-09-22T22:00:00.000Z", end: "2026-09-23T02:00:00.000Z" },
    ],
    "user-ryan": [
      { start: "2026-09-22T22:30:00.000Z", end: "2026-09-23T00:30:00.000Z" },
    ],
    "user-sophia": [
      { start: "2026-09-22T23:00:00.000Z", end: "2026-09-23T01:30:00.000Z" },
    ],
  },
};

const coursePolicies: Record<string, AcademicPolicy> = {};
const policyAcknowledgements: Record<string, Record<string, string>> = {};

const checkIns: Record<string, Record<string, string>> = {};
const goals: Goal[] = [];
const sessionSyncCheckins: SessionSyncCheckin[] = [];
const sessionSyncBriefs: SessionSyncBrief[] = [];

function enrich(session: Session): SessionWithDetails {
  const details: SessionWithDetails = {
    ...session,
    policyAcknowledgements: { ...policyAcknowledgements[session.id] },
    checkIns: { ...checkIns[session.id] },
    course: courses.find((course) => course.id === session.courseId)!,
    creator: users.find((user) => user.id === session.creatorId)!,
    members: session.memberIds.map((id) => users.find((user) => user.id === id)!),
    room: rooms.find((room) => room.id === session.roomId),
    policy: coursePolicies[session.courseId] ?? policies.find((policy) => policy.id === session.policyId),
    coursePolicyConfirmed: !!coursePolicies[session.courseId],
  };
  if (!canMatchTime(details)) Object.assign(details, matchedSessionState(details, null), { room: undefined });
  return details;
}

function rematch(session: Session) {
  const windows = Object.fromEntries(session.memberIds.map(id => [id, availability[session.id]?.[id] ?? []]));
  const result = canMatchTime(enrich(session)) ? calculateBestOverlap(windows, session.durationMinutes, session.minPeople) : null;
  const state = matchedSessionState(session, result);
  if (session.confirmedSlot !== state.confirmedSlot) delete checkIns[session.id];
  Object.assign(session, state);
}

export const mockRepository: StudySyncRepository = {
  async listGoals(userId) {
    return goals.filter((goal) => goal.ownerId === userId);
  },
  async getGoal(id, userId) {
    const goal = goals.find((item) => item.id === id);
    if (!goal) return null;
    if (goal.ownerId === userId) return goal;
    return sessions.some((session) => session.goalId === id && session.memberIds.includes(userId)) ? goal : null;
  },
  async createGoal(input: CreateGoalInput) {
    if (!courses.some((course) => course.id === input.courseId)) throw new Error("course_not_found");
    const goal: Goal = {
      ...input,
      id: `goal-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    goals.unshift(goal);
    return goal;
  },
  async listSessionSyncCheckins(sessionId) {
    return sessionSyncCheckins.filter((item) => item.sessionId === sessionId);
  },
  async saveSessionSyncCheckin(sessionId, userId, input) {
    const saved: SessionSyncCheckin = { ...input, sessionId, userId, updatedAt: new Date().toISOString() };
    const index = sessionSyncCheckins.findIndex((item) => item.sessionId === sessionId && item.userId === userId);
    if (index >= 0) sessionSyncCheckins[index] = saved;
    else sessionSyncCheckins.push(saved);
    return saved;
  },
  async getSessionSyncBrief(sessionId) {
    return sessionSyncBriefs.find((item) => item.sessionId === sessionId) ?? null;
  },
  async saveSessionSyncBrief(sessionId, content, modelName) {
    const saved: SessionSyncBrief = { sessionId, content, modelName, generatedAt: new Date().toISOString() };
    const index = sessionSyncBriefs.findIndex((item) => item.sessionId === sessionId);
    if (index >= 0) sessionSyncBriefs[index] = saved;
    else sessionSyncBriefs.push(saved);
    return saved;
  },
  async confirmSession(sessionId, userId, expected) {
    const session = sessions.find(item => item.id === sessionId);
    validateSessionConfirmation(session ? enrich(session) : null, userId, expected);
    session!.status = "confirmed";
  },

  async selectRoom(sessionId, userId, roomId) {
    const session = sessions.find(item => item.id === sessionId);
    const room = demoRooms.find(item => item.id === roomId);
    validateRoomSelection(session ? enrich(session) : null, userId, room);
    session!.roomId = room!.id;
    session!.status = "room_selected";
  },
  async getCoursePolicy(courseId) { return coursePolicies[courseId] ?? null; },
  async saveCoursePolicy(courseId, policy) {
    coursePolicies[courseId] = policy;
    for (const session of sessions.filter(item => item.courseId === courseId && item.type === "assignment")) {
      session.policyId = policy.id;
      delete checkIns[session.id];
      session.confirmedSlot = undefined;
      session.roomId = undefined;
      rematch(session);
    }
  },
  async savePolicy(sessionId, userId, policy) {
    const session = sessions.find(item => item.id === sessionId);
    if (!session || session.creatorId !== userId || !session.memberIds.includes(userId)) throw new Error("creator_only");
    policies.push(policy);
    session.policyId = policy.id;
    policyAcknowledgements[sessionId] = {};
    rematch(session);
  },
  async acknowledgePolicy(sessionId, userId, policyId) {
    const session = sessions.find(item => item.id === sessionId);
    if (!session?.memberIds.includes(userId)) throw new Error("not_a_session_member");
    if (session.policyId !== policyId) throw new Error("policy_changed");
    if (!policyAllowsCollaboration(enrich(session).policy)) throw new Error("policy_needs_clarification");
    policyAcknowledgements[sessionId] ??= {};
    policyAcknowledgements[sessionId][userId] = policyId;
    rematch(session);
  },
  async checkIn(sessionId, userId) {
    const session = sessions.find(item => item.id === sessionId);
    if (!session) throw new Error("session_not_found");
    if (!session.memberIds.includes(userId)) throw new Error("not_a_session_member");
    if (!session.confirmedSlot || !(Date.parse(session.confirmedSlot.start) <= Date.now())) {
      throw new Error("check_in_not_open");
    }
    checkIns[sessionId] ??= {};
    checkIns[sessionId][userId] ??= new Date().toISOString();
    return checkIns[sessionId][userId];
  },
  async listCourses() {
    return courses;
  },

  async listSessions(filters) {
    return sessions
      .filter((session) => !filters?.courseId || session.courseId === filters.courseId)
      .filter((session) => !filters?.status || session.status === filters.status)
      .filter((session) => !filters?.goalId || session.goalId === filters.goalId)
      .map(enrich);
  },

  async getSession(id) {
    const session = sessions.find((item) => item.id === id);
    return session ? enrich(session) : null;
  },

  async createSession(input: CreateSessionInput) {
    const session: Session = {
      ...input,
      id: `session-${crypto.randomUUID()}`,
      status: "open",
      memberIds: [input.creatorId],
    };
    sessions.unshift(session);
    return session;
  },

  async updateCapacity(sessionId, userId, minPeople, maxPeople) {
    sessionCapacitySchema.parse({ minPeople, maxPeople });
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("session_not_found");
    if (session.creatorId !== userId) throw new Error("creator_only");
    if (maxPeople < session.memberIds.length) throw new Error("capacity_below_members");
    if (session.minPeople === minPeople && session.maxPeople === maxPeople) return;
    const resetTime = minPeople > session.minPeople || session.memberIds.length < minPeople;
    session.minPeople = minPeople;
    session.maxPeople = maxPeople;
    if (resetTime) {
      delete checkIns[session.id];
      session.confirmedSlot = undefined;
      session.roomId = undefined;
      session.status = session.memberIds.length >= minPeople ? "group_formed" : "open";
    } else {
      const room = rooms.find((item) => item.id === session.roomId);
      if (room && room.capacity < maxPeople) {
        session.roomId = undefined;
        session.status = session.confirmedSlot ? "time_matched" : session.memberIds.length >= minPeople ? "group_formed" : "open";
      } else if (session.status === "open" && session.memberIds.length >= minPeople) {
        session.status = "group_formed";
      }
    }
  },

  async joinSession(sessionId, userId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Session not found");
    if (session.memberIds.includes(userId)) return session;
    if (session.memberIds.length >= session.maxPeople) throw new Error("session_full");
    if (session.memberIds.length === 0) session.creatorId = userId;
    session.memberIds.push(userId);
    if (session.type === "assignment") rematch(session);
    if (session.memberIds.length >= session.minPeople && session.status === "open") session.status = "group_formed";
    return session;
  },

  async leaveSession(sessionId, userId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Session not found");
    session.memberIds = session.memberIds.filter((id) => id !== userId);
    if (session.creatorId === userId && session.memberIds.length > 0) {
      session.creatorId = session.memberIds[0];
    }
    delete availability[sessionId]?.[userId];
    delete checkIns[sessionId]?.[userId];
    delete policyAcknowledgements[sessionId]?.[userId];
    rematch(session);
    if (session.memberIds.length < session.minPeople) {
      session.status = "open";
      session.confirmedSlot = undefined;
      session.roomId = undefined;
    }
  },

  async getAvailability(sessionId, userId) {
    return availability[sessionId]?.[userId] ?? [];
  },
  async submitAvailability(sessionId, userId, slots) {
    availability[sessionId] ??= {};
    availability[sessionId][userId] = slots;
    const session = sessions.find(item => item.id === sessionId);
    if (session) {
      rematch(session);
    }
  },

  async calculateBestTime(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || !canMatchTime(enrich(session))) return null;
    return calculateBestOverlap(
      Object.fromEntries(session.memberIds.map(id => [id, availability[sessionId]?.[id] ?? []])),
      session.durationMinutes,
      session.minPeople,
    );
  },
};
