import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), checkIn: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/data/repository", () => ({ repository: { checkIn: mocks.checkIn } }));
import { POST } from "./route";

const context = { params: Promise.resolve({ id: "session-1" }) };
const request = () => new Request("http://localhost/api/sessions/session-1/check-in", {
  method: "POST", body: JSON.stringify({ userId: "someone-else", checkedInAt: "2000-01-01" }),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: "current-user" });
});

it("requires login without writing anything", async () => {
  mocks.getUser.mockResolvedValue(null);
  expect((await POST(request(), context)).status).toBe(401);
  expect(mocks.checkIn).not.toHaveBeenCalled();
});

it("uses the authenticated identity and database timestamp instead of client input", async () => {
  mocks.checkIn.mockResolvedValue("2026-09-20T17:00:00Z");
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(mocks.checkIn).toHaveBeenCalledWith("session-1", "current-user");
  expect(await response.json()).toEqual({ checkedInAt: "2026-09-20T17:00:00Z" });
});

it.each([
  ["session_not_found", 404], ["not_a_session_member", 403],
  ["check_in_not_open", 409], ["cannot_check_in_for_another_user", 403],
  ["private database details", 500],
])("handles %s without exposing internal details", async (message, status) => {
  mocks.checkIn.mockRejectedValue(new Error(message));
  const response = await POST(request(), context);
  expect(response.status).toBe(status);
  expect(await response.text()).not.toContain("private database details");
});
