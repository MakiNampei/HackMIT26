import { describe, expect, it } from "vitest";
import { mockRepository } from "@/lib/data/mock-repository";
import { createGoalSchema } from "@/lib/domain/schemas";

describe("goal journeys", () => {
  it("validates the small goal form", () => {
    const result = createGoalSchema.safeParse({
      ownerId: "goal-test-user",
      courseId: "course-cse330",
      type: "project",
      title: "Finish the final project",
      description: "Build and test the complete app",
      targetDate: "2026-10-10",
      durationMinutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("keeps goals private to their owner and links sessions", async () => {
    const goal = await mockRepository.createGoal({
      ownerId: "goal-test-user",
      courseId: "course-cse330",
      type: "project",
      title: "Finish the final project",
      description: "Build and test the complete app",
      targetDate: "2026-10-10",
      durationMinutes: 60,
    });

    await mockRepository.createSession({
      courseId: goal.courseId,
      creatorId: goal.ownerId,
      goalId: goal.id,
      type: "study",
      title: "First project session",
      topic: goal.description,
      minPeople: 2,
      maxPeople: 5,
      durationMinutes: 60,
      proposedSlots: [{ start: "2026-09-25T18:00:00.000Z", end: "2026-09-25T20:00:00.000Z" }],
    });

    expect(await mockRepository.listGoals(goal.ownerId)).toContainEqual(goal);
    expect(await mockRepository.listGoals("someone-else")).not.toContainEqual(goal);
    expect(await mockRepository.listSessions({ goalId: goal.id })).toHaveLength(1);
  });

  it("persists each member's progress sync and the shared brief", async () => {
    const checkin = await mockRepository.saveSessionSyncCheckin("sync-session", "sync-user", {
      progress: "in_progress",
      todayGoal: "Finish the database schema",
      workStyle: "independent_then_regroup",
      blocker: "Need to verify permissions",
    });
    expect(await mockRepository.listSessionSyncCheckins("sync-session")).toContainEqual(checkin);

    const brief = await mockRepository.saveSessionSyncBrief("sync-session", "GROUP SYNC BRIEF", "muse-spark-1.3", "sync-user");
    expect(await mockRepository.getSessionSyncBrief("sync-session")).toEqual(brief);
  });
});
