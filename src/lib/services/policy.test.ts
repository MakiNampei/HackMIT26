import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create: mocks.create }; } }));
import { analyzePolicy } from "./policy";
const rules = { collaborationAllowed: true, discussionAllowed: true, solutionSharingAllowed: false, individualSubmissionRequired: true, comparingFinalAnswers: "unclear", summary: "Discuss concepts only.", evidence: [{ quote: "Discuss concepts only.", source: "model source", page: null }], confidence: .95, needsInstructorReview: false };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("OPENAI_API_KEY", "test-only"); vi.stubEnv("OPENAI_LIVE_MODE", "false"); mocks.create.mockResolvedValue({ id: "result", output_text: JSON.stringify(rules) }); });
afterEach(() => vi.unstubAllEnvs());
it("uses real analysis for verification even with demo mode enabled", async () => {
  const result = await analyzePolicy("Syllabus", "Discuss concepts only.", { requireLive: true });
  expect(mocks.create).toHaveBeenCalledOnce();
  expect(result.needsInstructorReview).toBe(false);
  expect(result.evidence[0].source).toBe("Syllabus");
});
it("blocks ungrounded evidence from passing verification", async () => {
  expect((await analyzePolicy("Syllabus", "No collaboration is permitted.", { requireLive: true })).needsInstructorReview).toBe(true);
});
it("never substitutes demo permission when a live key is missing", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  await expect(analyzePolicy("Syllabus", "No collaboration is permitted.", { requireLive: true })).rejects.toThrow("not configured");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("sends PDF as a document and requires page evidence for review", async () => {
  const pdf = new TextEncoder().encode("%PDF-test");
  const withoutPages = await analyzePolicy("rules.pdf", "", { requireLive: true, pdf });
  expect(withoutPages.needsInstructorReview).toBe(true);
  expect(mocks.create.mock.calls[0][0].input[0].content[1]).toEqual(expect.objectContaining({ type: "input_file", filename: "rules.pdf", file_data: expect.stringMatching(/^data:application\/pdf;base64,/) }));
  mocks.create.mockResolvedValueOnce({ id: "pdf-result", output_text: JSON.stringify({ ...rules, evidence: [{ ...rules.evidence[0], page: 1 }] }) });
  expect((await analyzePolicy("rules.pdf", "", { requireLive: true, pdf })).needsInstructorReview).toBe(false);
});
