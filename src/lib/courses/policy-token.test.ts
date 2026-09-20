import { afterEach, expect, it, vi } from "vitest";
import { signPolicyPreview, readPolicyPreview } from "./policy-token";
import type { AcademicPolicy } from "@/lib/domain/types";
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("binds a reviewed analysis to the user and rejects tampered or expired previews", () => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-signing-secret");
  const policy: AcademicPolicy = { id: "p", collaborationAllowed: false, discussionAllowed: false, solutionSharingAllowed: false, individualSubmissionRequired: true, comparingFinalAnswers: "not_allowed", summary: "Independent work only", evidence: [], confidence: 1, needsInstructorReview: false };
  const token = signPolicyPreview("alice", "Syllabus", policy);
  expect(readPolicyPreview(token, "alice").policy).toEqual(policy);
  expect(() => readPolicyPreview(token, "bob")).toThrow();
  const [payload, signature] = token.split(".");
  const edited = JSON.parse(Buffer.from(payload, "base64url").toString());
  edited.policy.collaborationAllowed = true;
  expect(() => readPolicyPreview(`${Buffer.from(JSON.stringify(edited)).toString("base64url")}.${signature}`, "alice")).toThrow();
  vi.useFakeTimers(); vi.setSystemTime(Date.now() + 31 * 60_000);
  expect(() => readPolicyPreview(token, "alice")).toThrow("expired");
});
