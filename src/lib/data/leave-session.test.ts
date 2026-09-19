import { expect, it } from "vitest";
import { mockRepository } from "./mock-repository";

it("removes membership and availability and reopens a group below its minimum", async () => {
  const session = await mockRepository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Leave test", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: [],
  });
  const slots = [{ start: "2026-09-22T20:00:00Z", end: "2026-09-22T22:00:00Z" }];
  await mockRepository.joinSession(session.id, "user-alex");
  await mockRepository.submitAvailability(session.id, "user-maki", slots);
  await mockRepository.submitAvailability(session.id, "user-alex", slots);
  expect(await mockRepository.calculateBestTime(session.id)).not.toBeNull();
  await mockRepository.leaveSession(session.id, "user-alex");
  expect(session.memberIds).toEqual(["user-maki"]);
  expect(session.status).toBe("open");
  expect(await mockRepository.calculateBestTime(session.id)).toBeNull();
  await mockRepository.joinSession(session.id, "user-alex");
  expect(await mockRepository.calculateBestTime(session.id)).toBeNull();
  await mockRepository.leaveSession(session.id, "user-maki");
  await mockRepository.leaveSession(session.id, "user-maki");
  expect(session.memberIds).toEqual(["user-alex"]);
});
