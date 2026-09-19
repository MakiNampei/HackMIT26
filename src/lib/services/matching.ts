export type MatchInput = {
  sameCourse: boolean;
  sameAssignment: boolean;
  hasScheduleOverlap: boolean;
  groupSizeMatches: boolean;
  hasComplementarySkills: boolean;
};

export type MatchResult = {
  score: number;
  reasons: string[];
};

export function calculateMatchScore(input: MatchInput): MatchResult {
  const rules: Array<[boolean, number, string]> = [
    [input.sameCourse, 40, "Same course"],
    [input.sameAssignment, 30, "Same assignment"],
    [input.hasScheduleOverlap, 20, "Schedule overlap"],
    [input.groupSizeMatches, 5, "Group-size preference"],
    [input.hasComplementarySkills, 5, "Complementary skills"],
  ];

  return rules.reduce<MatchResult>(
    (result, [matches, points, reason]) =>
      matches
        ? { score: result.score + points, reasons: [...result.reasons, reason] }
        : result,
    { score: 0, reasons: [] },
  );
}
