import { expect, it } from "vitest";
import { mockRepository } from "./mock-repository";

it("loads all saved windows for the requested member and session after replacement", async () => {
  const session = await mockRepository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Availability persistence", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: [],
  });
  const slots = [
    { start: "2026-09-22T20:00:00Z", end: "2026-09-22T21:00:00Z" },
    { start: "2026-09-23T20:00:00Z", end: "2026-09-23T22:00:00Z" },
  ];
  await mockRepository.submitAvailability(session.id, "user-maki", slots);
  expect(await mockRepository.getAvailability(session.id, "user-maki")).toEqual(slots);
  expect(await mockRepository.getAvailability(session.id, "user-alex")).toEqual([]);
  expect(await mockRepository.getAvailability("other-session", "user-maki")).toEqual([]);
  await mockRepository.submitAvailability(session.id, "user-maki", [slots[1]]);
  expect(await mockRepository.getAvailability(session.id, "user-maki")).toEqual([slots[1]]);
});

it("automatically matches two members only when their overlap covers the full session", async () => {
  const session = await mockRepository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Automatic matching", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 90, proposedSlots: [],
  });
  await mockRepository.joinSession(session.id, "user-alex");
  const slots = [{ start: "2026-09-22T20:00:00.000Z", end: "2026-09-22T22:00:00.000Z" }];
  await mockRepository.submitAvailability(session.id, "user-maki", slots);
  expect(session.status).toBe("group_formed");
  await mockRepository.submitAvailability(session.id, "user-alex", [{ start: "2026-09-22T21:00:00.000Z", end: slots[0].end }]);
  expect(session.confirmedSlot).toBeUndefined();
  await mockRepository.submitAvailability(session.id, "user-alex", slots);
  expect(session.status).toBe("time_matched");
  expect(session.confirmedSlot).toEqual({ start: slots[0].start, end: "2026-09-22T21:30:00.000Z" });
  session.status = "confirmed";
  session.confirmedSlot = { start: "2026-09-22T20:00:00+00:00", end: "2026-09-22T21:30:00+00:00" };
  session.roomId = "room-olin-204";
  await mockRepository.submitAvailability(session.id, "user-alex", slots);
  expect(session.status).toBe("confirmed");
  expect(session.roomId).toBe("room-olin-204");
  await mockRepository.submitAvailability(session.id, "user-alex", [{ start: "2026-09-23T20:00:00.000Z", end: "2026-09-23T22:00:00.000Z" }]);
  expect(session.status).toBe("group_formed");
  expect(session.confirmedSlot).toBeUndefined();
  expect(session.roomId).toBeUndefined();
});
