import { describe, expect, it } from "vitest";
import { mapPolicy, mapSession } from "./supabase-mappers";

describe("Supabase row mappers", () => {
  it("maps session snake_case fields into the shared domain contract", () => {
    expect(
      mapSession({
        id: "session-1",
        course_id: "course-1",
        creator_id: "user-1",
        type: "study",
        title: "Study group",
        topic: "Graphs",
        min_people: 2,
        max_people: 4,
        duration_minutes: 60,
        status: "open",
        proposed_slots: [{ start: "2026-09-22T20:00:00.000Z", end: "2026-09-22T21:00:00.000Z" }],
        confirmed_start: null,
        confirmed_end: null,
        room_id: null,
        policy_id: null,
      }),
    ).toMatchObject({ courseId: "course-1", creatorId: "user-1", durationMinutes: 60 });
  });

  it("drops malformed AI evidence before it reaches the UI", () => {
    const policy = mapPolicy({
      id: "policy-1",
      collaboration_allowed: true,
      discussion_allowed: true,
      solution_sharing_allowed: false,
      individual_submission_required: true,
      comparing_final_answers: "unclear",
      summary: "Discuss approaches, then submit independent work.",
      evidence: [
        { quote: "Discuss approaches.", source: "syllabus.pdf", page: 2 },
        { untrusted: "bad shape" },
      ],
      confidence: "0.930",
      needs_instructor_review: false,
    });

    expect(policy.evidence).toHaveLength(1);
    expect(policy.confidence).toBe(0.93);
  });
});

