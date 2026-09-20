import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), analyzePolicy: vi.fn(), signPolicyPreview: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/services/policy", () => ({ analyzePolicy: mocks.analyzePolicy }));
vi.mock("@/lib/courses/policy-token", () => ({ signPolicyPreview: mocks.signPolicyPreview }));
import { POST } from "./route";
function upload(name: string, content: string) {
  const form = new FormData(); form.set("file", new File([content], name));
  return new Request("http://localhost/api/courses/policy-preview", { method: "POST", body: form });
}
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ id: "student" }); mocks.analyzePolicy.mockResolvedValue({ id: "policy" }); mocks.signPolicyPreview.mockReturnValue("signed-preview"); });
it("analyzes PDF bytes and signs the same review workflow", async () => {
  const response = await POST(upload("syllabus.pdf", "%PDF-1.7 test fixture"));
  expect(response.status).toBe(200);
  expect(mocks.analyzePolicy).toHaveBeenCalledWith("syllabus.pdf", "", { requireLive: true, pdf: expect.any(Uint8Array) });
  expect(await response.json()).toEqual({ policy: { id: "policy" }, token: "signed-preview" });
});
it("analyzes text uploads and preserves pasted text", async () => {
  const text = "Students may discuss concepts but must submit independently.";
  expect((await POST(upload("syllabus.md", text))).status).toBe(200);
  expect(mocks.analyzePolicy).toHaveBeenCalledWith("syllabus.md", text, { requireLive: true });
  expect((await POST(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceName: "Syllabus", text }) }))).status).toBe(200);
});
it("rejects missing auth, invalid files, empty and oversized documents before analysis", async () => {
  mocks.getUser.mockResolvedValueOnce(null);
  expect((await POST(upload("s.pdf", "%PDF-test"))).status).toBe(401);
  for (const [name, content] of [["s.pdf", "fake PDF"], ["s.docx", "unsupported"], ["s.txt", ""], ["s.txt", "short"], ["s.txt", "x".repeat(100001)]]) {
    expect((await POST(upload(name, content))).status).toBe(400);
  }
  expect((await POST(upload("s.pdf", "%PDF-" + "x".repeat(10 * 1024 * 1024)))).status).toBe(413);
  expect(mocks.analyzePolicy).not.toHaveBeenCalled();
});
