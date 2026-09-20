import { afterEach, expect, it, vi } from "vitest";
import { mockRepository as repository } from "./mock-repository";
import { calculateBestOverlap } from "@/lib/services/availability";
import type { AcademicPolicy } from "@/lib/domain/types";

const window = (start: string, end: string) => ({ start: `2026-09-22T${start}:00.000Z`, end: `2026-09-22T${end}:00.000Z` });
const original = [window("20:00", "22:00")];
afterEach(() => vi.useRealTimers());
async function group(type: "study" | "assignment" = "study") {
  const session = await repository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type,
    title: "Boundary audit", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: original,
  });
  for (const member of ["user-alex", "user-ryan"]) await repository.joinSession(session.id, member);
  for (const member of session.memberIds) await repository.submitAvailability(session.id, member, original);
  return session;
}

it("does not leave a nonempty group without an active organizer after organizer departure", async () => {
  const session = await group();
  await repository.leaveSession(session.id, "user-maki");
  const remaining = (await repository.getSession(session.id))!;
  expect(remaining.creatorId).toBe("user-alex");
  expect(remaining.memberIds).not.toContain("user-maki");
  await repository.selectRoom(session.id, "user-alex", "demo-room-4");
  await repository.confirmSession(session.id, "user-alex", { ...remaining.confirmedSlot!, roomId: "demo-room-4" });
  expect((await repository.getSession(session.id))?.status).toBe("confirmed");
});

it("does not carry an old check-in into a newly scheduled meeting", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T20:05:00Z"));
  const session = await group();
  await repository.selectRoom(session.id, "user-maki", "demo-room-4");
  await repository.confirmSession(session.id, "user-maki", { ...session.confirmedSlot!, roomId: session.roomId! });
  await repository.checkIn(session.id, "user-maki");
  const next = [{ start: "2026-09-23T20:00:00.000Z", end: "2026-09-23T22:00:00.000Z" }];
  for (const member of session.memberIds) await repository.submitAvailability(session.id, member, next);
  const changed = (await repository.getSession(session.id))!;
  expect(changed.confirmedSlot?.start).toBe(next[0].start);
  expect(changed.status).toBe("time_matched");
  expect(changed.checkIns?.["user-maki"]).toBeUndefined();
});

it.each([
  ["adjacent", [window("20:00", "20:30"), window("20:30", "21:00")]],
  ["overlapping", [window("20:00", "20:45"), window("20:30", "21:00")]],
])("matches continuous availability split across %s windows", (_label, windows) => {
  const result = calculateBestOverlap({ a: windows, b: [window("20:00", "21:00")] }, 60, 2);
  expect(result).toMatchObject({ start: original[0].start, availableCount: 2 });
});

it("does not bridge a real gap between availability windows", () => {
  expect(calculateBestOverlap({
    a: [window("20:00", "20:30"), window("20:45", "21:15")],
    b: [window("20:00", "22:00")],
  }, 60, 2)).toBeNull();
});

it("counts overlapping windows from the same person only once", () => {
  expect(calculateBestOverlap({ a: [original[0], original[0]], b: [] }, 60, 2)).toBeNull();
});

it("invalidates a confirmed assignment when its course policy prohibits collaboration", async () => {
  const session = await group("assignment");
  const policy: AcademicPolicy = {
    id: crypto.randomUUID(), collaborationAllowed: true, discussionAllowed: true,
    solutionSharingAllowed: false, individualSubmissionRequired: true,
    comparingFinalAnswers: "not_allowed", summary: "Discuss concepts only",
    evidence: [], confidence: 1, needsInstructorReview: false,
  };
  await repository.saveCoursePolicy(session.courseId, policy, "Syllabus");
  await repository.selectRoom(session.id, "user-maki", "demo-room-4");
  await repository.confirmSession(session.id, "user-maki", { ...session.confirmedSlot!, roomId: session.roomId! });
  await repository.saveCoursePolicy(session.courseId, { ...policy, id: crypto.randomUUID(), collaborationAllowed: false }, "Updated syllabus");
  expect(await repository.getSession(session.id)).toMatchObject({ status: "group_formed", confirmedSlot: undefined, roomId: undefined });
});

it("preserves a check-in when the effective schedule is unchanged", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T20:05:00Z"));
  const session = await group();
  const timestamp = await repository.checkIn(session.id, "user-maki");
  await repository.submitAvailability(session.id, "user-maki", original);
  expect((await repository.getSession(session.id))?.checkIns?.["user-maki"]).toBe(timestamp);
});

it("gives the first member of an empty group organizer authority", async () => {
  const session = await group();
  for (const member of [...session.memberIds]) await repository.leaveSession(session.id, member);
  await repository.joinSession(session.id, "user-sophia");
  expect((await repository.getSession(session.id))?.creatorId).toBe("user-sophia");
});

it("merges unsorted nested and touching intervals without mutating inputs", () => {
  const a = [window("20:30", "21:00"), window("20:15", "20:25"), window("20:00", "20:30")];
  const before = JSON.stringify(a);
  expect(calculateBestOverlap({ a, b: [window("20:00", "21:00")] }, 60, 2)?.availableCount).toBe(2);
  expect(JSON.stringify(a)).toBe(before);
});
