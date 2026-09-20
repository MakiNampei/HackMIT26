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
});
