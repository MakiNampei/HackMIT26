import { afterEach, expect, it, vi } from "vitest";
import { mockRepository } from "./mock-repository";

afterEach(() => vi.useRealTimers());

async function create() {
  return mockRepository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Check-in test", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: [],
    confirmedSlot: { start: "2026-09-20T17:00:00Z", end: "2026-09-20T18:00:00Z" },
  });
}

it("opens exactly at the start and preserves the original timestamp on retries", async () => {
  vi.useFakeTimers();
  const session = await create();
  vi.setSystemTime(new Date("2026-09-20T16:59:59Z"));
  await expect(mockRepository.checkIn(session.id, "user-maki")).rejects.toThrow("check_in_not_open");
  vi.setSystemTime(new Date("2026-09-20T17:00:00Z"));
  const checkedAt = await mockRepository.checkIn(session.id, "user-maki");
  expect(checkedAt).toBe("2026-09-20T17:00:00.000Z");
  vi.setSystemTime(new Date("2026-09-20T18:30:00Z"));
  expect(await mockRepository.checkIn(session.id, "user-maki")).toBe(checkedAt);
  expect((await mockRepository.getSession(session.id))?.checkIns?.["user-maki"]).toBe(checkedAt);
});

it("rejects missing sessions, nonmembers and unscheduled sessions", async () => {
  const session = await create();
  await expect(mockRepository.checkIn("missing", "user-maki")).rejects.toThrow("session_not_found");
  await expect(mockRepository.checkIn(session.id, "user-alex")).rejects.toThrow("not_a_session_member");
  session.confirmedSlot = undefined;
  await expect(mockRepository.checkIn(session.id, "user-maki")).rejects.toThrow("check_in_not_open");
});
