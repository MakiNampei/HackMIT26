import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), confirmSession: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/data/repository", () => ({ repository: mocks }));
import { POST } from "./route";
const context = { params: Promise.resolve({ id: "s" }) };
const expected = { start: "2026-09-22T20:00:00+00:00", end: "2026-09-22T21:00:00+00:00", roomId: "demo-room-4" };
function request(body: unknown = expected) { return new Request("http://localhost/api/sessions/s/confirm", { method: "POST", body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ id: "creator" }); });
it("requires authentication and a valid reviewed plan", async () => {
  mocks.getUser.mockResolvedValueOnce(null);
  expect((await POST(request(), context)).status).toBe(401);
  expect((await POST(request({}), context)).status).toBe(400);
  expect(mocks.confirmSession).not.toHaveBeenCalled();
});
it("confirms through the repository and returns authorization or stale-state errors", async () => {
  expect((await POST(request(), context)).status).toBe(200);
  expect(mocks.confirmSession).toHaveBeenCalledWith("s", "creator", expected);
  mocks.confirmSession.mockRejectedValueOnce(new Error("creator_only"));
  expect((await POST(request(), context)).status).toBe(403);
  mocks.confirmSession.mockRejectedValueOnce(new Error("session_changed"));
  expect((await POST(request(), context)).status).toBe(409);
});
