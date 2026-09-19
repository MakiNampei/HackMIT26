import type { CreateSessionInput, StudySyncRepository } from "@/lib/data/contracts";
import type {
  AcademicPolicy,
  AvailabilitySlot,
  Course,
  Room,
  Session,
  SessionWithDetails,
  User,
} from "@/lib/domain/types";
import { calculateBestOverlap } from "@/lib/services/availability";
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

function enrich(session: Session): SessionWithDetails {
  return {
    ...session,
    course: courses.find((course) => course.id === session.courseId)!,
    creator: users.find((user) => user.id === session.creatorId)!,
    members: session.memberIds.map((id) => users.find((user) => user.id === id)!),
    room: rooms.find((room) => room.id === session.roomId),
    policy: policies.find((policy) => policy.id === session.policyId),
  };
}

export const mockRepository: StudySyncRepository = {
  async listCourses() {
    return courses;
  },

  async listSessions(filters) {
    return sessions
      .filter((session) => !filters?.courseId || session.courseId === filters.courseId)
      .filter((session) => !filters?.status || session.status === filters.status)
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
    session.memberIds.push(userId);
    if (session.memberIds.length >= session.minPeople && session.status === "open") session.status = "group_formed";
    return session;
  },

  async leaveSession(sessionId, userId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Session not found");
    session.memberIds = session.memberIds.filter((id) => id !== userId);
    delete availability[sessionId]?.[userId];
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
  },

  async calculateBestTime(sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return null;
    return calculateBestOverlap(
      availability[sessionId] ?? {},
      session.durationMinutes,
      session.minPeople,
    );
  },
};
