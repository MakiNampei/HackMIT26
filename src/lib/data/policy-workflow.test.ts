import { expect, it } from "vitest";
import { mockRepository as repository } from "./mock-repository";
import { sessionChecklist } from "@/lib/domain/policy-workflow";
import type { AcademicPolicy } from "@/lib/domain/types";

const windows = [{ start: "2026-09-22T20:00:00.000Z", end: "2026-09-22T22:00:00.000Z" }];
const policy = (): AcademicPolicy => ({ id: crypto.randomUUID(), collaborationAllowed: true, discussionAllowed: true, solutionSharingAllowed: false, individualSubmissionRequired: true, comparingFinalAnswers: "not_allowed", summary: "Discuss concepts only; submit independently.", evidence: [], confidence: 1, needsInstructorReview: false });
async function setup() {
  const session = await repository.createSession({ courseId: "course-cse347", creatorId: "user-maki", type: "assignment", title: "Policy workflow", topic: "Graphs", minPeople: 2, maxPeople: 5, durationMinutes: 90, proposedSlots: [] });
  await repository.joinSession(session.id, "user-alex");
  await repository.submitAvailability(session.id, "user-maki", windows);
  await repository.submitAvailability(session.id, "user-alex", windows);
  return session;
}

it("saves availability but waits for every member, then automatically matches", async () => {
  const session = await setup();
  expect(await repository.calculateBestTime(session.id)).toBeNull();
  expect(session.confirmedSlot).toBeUndefined();
  const rules = policy();
  await repository.savePolicy(session.id, "user-maki", rules, "Syllabus");
  await repository.acknowledgePolicy(session.id, "user-maki", rules.id);
  expect(await repository.calculateBestTime(session.id)).toBeNull();
  await repository.acknowledgePolicy(session.id, "user-alex", rules.id);
  expect(session.status).toBe("time_matched");
  expect(session.confirmedSlot?.end).toBe("2026-09-22T21:30:00.000Z");
  expect(sessionChecklist((await repository.getSession(session.id))!).map(step => [step.label, step.done])).toEqual([
    ["Policy verified", true], ["Group formed", true], ["Time matched", true], ["Room selected", false], ["Confirmed", false],
  ]);
  await repository.joinSession(session.id, "user-ryan");
  expect(await repository.calculateBestTime(session.id)).toBeNull();
  expect(session.confirmedSlot).toBeUndefined();
  await repository.acknowledgePolicy(session.id, "user-ryan", rules.id);
  expect(session.status).toBe("time_matched");
  const replacement = policy();
  await repository.savePolicy(session.id, "user-maki", replacement, "Updated syllabus");
  expect(session.confirmedSlot).toBeUndefined();
  expect((await repository.getSession(session.id))!.policyAcknowledgements).toEqual({});
  await expect(repository.acknowledgePolicy(session.id, "user-alex", rules.id)).rejects.toThrow("policy_changed");
});

it("rejects unauthorized changes and does not allow prohibited or unclear policy confirmation", async () => {
  const session = await setup();
  await expect(repository.savePolicy(session.id, "user-alex", policy(), "Syllabus")).rejects.toThrow("creator_only");
  for (const rules of [{ ...policy(), collaborationAllowed: false }, { ...policy(), needsInstructorReview: true }, { ...policy(), discussionAllowed: null }]) {
    await repository.savePolicy(session.id, "user-maki", rules, "Syllabus");
    await expect(repository.acknowledgePolicy(session.id, "user-maki", rules.id)).rejects.toThrow("policy_needs_clarification");
    await expect(repository.acknowledgePolicy(session.id, "outsider", rules.id)).rejects.toThrow("not_a_session_member");
    expect(await repository.calculateBestTime(session.id)).toBeNull();
  }
});

it("inherits the confirmed course policy without per-session acknowledgements, including new members", async () => {
  const session = await setup();
  const coursePolicy = policy();
  await repository.saveCoursePolicy(session.courseId, coursePolicy, "Course syllabus");
  const details = (await repository.getSession(session.id))!;
  expect(details.coursePolicyConfirmed).toBe(true);
  expect(details.policy?.id).toBe(coursePolicy.id);
  expect(details.policyAcknowledgements).toEqual({});
  expect(details.status).toBe("time_matched");
  expect(sessionChecklist(details).slice(0, 3).every(step => step.done)).toBe(true);
  await repository.joinSession(session.id, "user-ryan");
  expect(await repository.calculateBestTime(session.id)).not.toBeNull();
  const second = await repository.createSession({ courseId: session.courseId, creatorId: "user-maki", type: "assignment", title: "Another assignment", topic: "Graphs", minPeople: 2, maxPeople: 5, durationMinutes: 90, proposedSlots: [] });
  expect((await repository.getSession(second.id))!.policy?.id).toBe(coursePolicy.id);
  await repository.saveCoursePolicy(session.courseId, { ...policy(), collaborationAllowed: false }, "New rules");
  expect(await repository.calculateBestTime(session.id)).toBeNull();
});

it("shows a reviewed course policy as confirmed without treating unclear collaboration as permitted", async () => {
  const session = await setup();
  await repository.saveCoursePolicy(session.courseId, { ...policy(), discussionAllowed: null, needsInstructorReview: true }, "Syllabus");
  const details = (await repository.getSession(session.id))!;
  const steps = sessionChecklist(details);
  expect(steps[0].done).toBe(true);
  expect(steps[1].done).toBe(true);
  expect(steps[2].done).toBe(false);
  expect(await repository.calculateBestTime(session.id)).toBeNull();
});
