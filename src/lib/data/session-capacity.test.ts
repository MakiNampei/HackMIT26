import { expect, it } from "vitest";
import { mockRepository } from "./mock-repository";

async function create() {
  return mockRepository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Capacity test", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: [],
  });
}

it("enforces creator ownership, bounds, and existing membership", async () => {
  const session = await create();
  await expect(mockRepository.updateCapacity(session.id, "user-alex", 2, 4)).rejects.toThrow("creator_only");
  await expect(mockRepository.updateCapacity(session.id, "user-maki", 5, 4)).rejects.toThrow();
  await expect(mockRepository.updateCapacity(session.id, "user-maki", 2.5, 4)).rejects.toThrow();
  await mockRepository.joinSession(session.id, "user-alex");
  await mockRepository.joinSession(session.id, "user-ryan");
  await expect(mockRepository.updateCapacity(session.id, "user-maki", 2, 2)).rejects.toThrow("capacity_below_members");
  expect(session.maxPeople).toBe(5);
});

it("resets stale matching after a higher minimum and forms a group after lowering it", async () => {
  const session = await create();
  await mockRepository.joinSession(session.id, "user-alex");
  session.confirmedSlot = { start: "2026-09-22T20:00:00Z", end: "2026-09-22T21:00:00Z" };
  session.roomId = "room-olin-204";
  session.status = "confirmed";
  await mockRepository.updateCapacity(session.id, "user-maki", 3, 4);
  expect(session.status).toBe("open");
  expect(session.confirmedSlot).toBeUndefined();
  expect(session.roomId).toBeUndefined();
  await mockRepository.updateCapacity(session.id, "user-maki", 2, 2);
  expect(session.status).toBe("group_formed");
  await expect(mockRepository.joinSession(session.id, "user-ryan")).rejects.toThrow("session_full");
});

it("preserves matching for a no-op and clears rooms smaller than the new maximum", async () => {
  const session = await create();
  await mockRepository.joinSession(session.id, "user-alex");
  session.confirmedSlot = { start: "2026-09-22T20:00:00Z", end: "2026-09-22T21:00:00Z" };
  session.roomId = "room-olin-204";
  session.status = "confirmed";
  await mockRepository.updateCapacity(session.id, "user-maki", 2, 5);
  expect(session.status).toBe("confirmed");
  await mockRepository.updateCapacity(session.id, "user-maki", 2, 7);
  expect(session.roomId).toBeUndefined();
  expect(session.confirmedSlot).toBeDefined();
  expect(session.status).toBe("time_matched");
});
