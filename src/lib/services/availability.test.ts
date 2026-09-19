import { describe, expect, it } from "vitest";
import { calculateBestOverlap } from "./availability";

describe("calculateBestOverlap", () => {
  it("finds the earliest slot shared by the most users", () => {
    const result = calculateBestOverlap(
      {
        a: [{ start: "2026-09-22T22:00:00.000Z", end: "2026-09-23T01:00:00.000Z" }],
        b: [{ start: "2026-09-22T23:00:00.000Z", end: "2026-09-23T02:00:00.000Z" }],
        c: [{ start: "2026-09-22T23:00:00.000Z", end: "2026-09-23T00:30:00.000Z" }],
      },
      90,
    );

    expect(result).toEqual({
      start: "2026-09-22T23:00:00.000Z",
      end: "2026-09-23T00:30:00.000Z",
      availableCount: 3,
      totalCount: 3,
    });
  });

  it("returns null without availability", () => {
    expect(calculateBestOverlap({}, 60)).toBeNull();
  });
});
