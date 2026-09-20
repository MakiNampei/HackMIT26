import { describe, expect, it } from "vitest";
import { sessionSyncCheckinSchema } from "@/lib/domain/schemas";

describe("session progress sync input", () => {
  it("accepts each supported progress and work-style value", () => {
    for (const progress of ["starting", "in_progress", "comfortable", "ahead"]) {
      for (const workStyle of ["together", "independent_then_regroup", "explain", "example"]) {
        expect(sessionSyncCheckinSchema.safeParse({ progress, todayGoal: "Complete one useful step", workStyle }).success).toBe(true);
      }
    }
  });

  it("enforces length limits and strips blank optional blockers", () => {
    expect(sessionSyncCheckinSchema.safeParse({ progress: "starting", todayGoal: "x", workStyle: "together" }).success).toBe(false);
    expect(sessionSyncCheckinSchema.safeParse({ progress: "starting", todayGoal: "x".repeat(161), workStyle: "together" }).success).toBe(false);
    expect(sessionSyncCheckinSchema.safeParse({ progress: "starting", todayGoal: "Valid goal", workStyle: "together", blocker: "x".repeat(161) }).success).toBe(false);
    expect(sessionSyncCheckinSchema.parse({ progress: "starting", todayGoal: "  Valid goal  ", workStyle: "together", blocker: "   " })).toEqual({
      progress: "starting",
      todayGoal: "Valid goal",
      workStyle: "together",
      blocker: undefined,
    });
  });
});
