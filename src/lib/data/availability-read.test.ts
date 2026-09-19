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
