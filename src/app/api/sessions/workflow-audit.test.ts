import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), createSession: vi.fn(), joinSession: vi.fn(),
  getSession: vi.fn(), submitAvailability: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/data/repository", () => ({ repository: mocks }));
import { POST as create } from "./route";
import { POST as join } from "./[id]/join/route";
import { POST as availability } from "./[id]/availability/route";

const context = { params: Promise.resolve({ id: "session-audit" }) };
const input = {
  courseId: "course-cse347", creatorId: "spoofed-user", type: "study",
  title: "Workflow audit", topic: "Graphs", minPeople: 2, maxPeople: 5,
  durationMinutes: 60,
  proposedSlots: [{ start: "2026-09-22T20:00:00.000Z", end: "2026-09-22T22:00:00.000Z" }],
};
const request = (body: string) => new Request("http://localhost/api/sessions", { method: "POST", body });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: "current-user" });
  mocks.createSession.mockResolvedValue({ ...input, id: "session-audit", creatorId: "current-user" });
});
afterEach(() => vi.unstubAllEnvs());

describe("session API workflow audit", () => {
  it("requires authentication before creating a session", async () => {
    mocks.getUser.mockResolvedValue(null);
    expect((await create(request(JSON.stringify(input)))).status).toBe(401);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("uses authenticated identity instead of the submitted creator", async () => {
    expect((await create(request(JSON.stringify(input)))).status).toBe(201);
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ creatorId: "current-user" }));
  });
  it.each(["mock", "supabase"])("navigates to the created session with the %s backend", async backend => {
    vi.stubEnv("DATA_BACKEND", backend);
    const response = await create(request(JSON.stringify(input)));
    const body = await response.json();
    expect(body.navigationId).toBe(body.data.id);
  });
  it("returns 400 for malformed session JSON", async () => {
    expect((await create(request("{"))).status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("returns 400 for malformed availability JSON", async () => {
    expect((await availability(request("{"), context)).status).toBe(400);
    expect(mocks.submitAvailability).not.toHaveBeenCalled();
  });
  it("prevents nonmembers from saving availability", async () => {
    mocks.getSession.mockResolvedValue({ memberIds: ["another-user"] });
    const response = await availability(request(JSON.stringify({ slots: input.proposedSlots })), context);
    expect(response.status).toBe(403);
    expect(mocks.submitAvailability).not.toHaveBeenCalled();
  });
  it("reports a full group as a conflict instead of a nonexistent session", async () => {
    mocks.joinSession.mockRejectedValue(new Error("session_full"));
    expect((await join(request("{}"), context)).status).toBe(409);
  });
});
