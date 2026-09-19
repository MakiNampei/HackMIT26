import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "./matching";

describe("calculateMatchScore", () => {
  it("uses the transparent 40/30/20/5/5 rubric", () => {
    expect(
      calculateMatchScore({
        sameCourse: true,
        sameAssignment: true,
        hasScheduleOverlap: true,
        groupSizeMatches: false,
        hasComplementarySkills: true,
      }),
    ).toEqual({
      score: 95,
      reasons: ["Same course", "Same assignment", "Schedule overlap", "Complementary skills"],
    });
  });
});
