import { describe, expect, it } from "vitest";
import { mockRepository as repository } from "./mock-repository";

const slots = [{ start: "2026-09-22T20:00:00.000Z", end: "2026-09-22T22:00:00.000Z" }];
async function createGroup() {
  const session = await repository.createSession({
    courseId: "course-cse347", creatorId: "user-maki", type: "study",
    title: "Workflow audit", topic: "Graphs", minPeople: 2, maxPeople: 5,
    durationMinutes: 60, proposedSlots: slots,
  });
  await repository.joinSession(session.id, "user-alex");
  await repository.joinSession(session.id, "user-ryan");
  await repository.submitAvailability(session.id, "user-maki", slots);
  await repository.submitAvailability(session.id, "user-alex", slots);
  return session;
}

describe("study session workflow audit", () => {
  it("progresses from creation through membership, matching, and room selection", async () => {
    const session = await createGroup();
    expect((await repository.getSession(session.id))?.status).toBe("time_matched");
    await repository.selectRoom(session.id, "user-maki", "demo-room-4");
    expect((await repository.getSession(session.id))?.status).toBe("room_selected");
  });

  it("clears the matched time and room when a departure removes the required overlap", async () => {
    const session = await createGroup();
    await repository.selectRoom(session.id, "user-maki", "demo-room-4");
    // Two members remain, but only one has availability: the old time is no longer viable.
    await repository.leaveSession(session.id, "user-alex");
    expect(await repository.calculateBestTime(session.id)).toBeNull();
    expect(await repository.getSession(session.id)).toMatchObject({
      status: "group_formed", confirmedSlot: undefined, roomId: undefined,
    });
  });

  it("counts members who have not submitted availability in the matching total", async () => {
    const session = await createGroup();
    expect(await repository.calculateBestTime(session.id)).toMatchObject({ availableCount: 2, totalCount: 3 });
  });

  it("invalidates the room when submitted availability removes the overlap", async () => {
    const session = await createGroup();
    await repository.selectRoom(session.id, "user-maki", "demo-room-4");
    await repository.submitAvailability(session.id, "user-alex", [
      { start: "2026-09-23T20:00:00.000Z", end: "2026-09-23T22:00:00.000Z" },
    ]);
    expect(await repository.getSession(session.id)).toMatchObject({
      status: "group_formed", confirmedSlot: undefined, roomId: undefined,
    });
  });
});
