import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  listCheckins: vi.fn(),
  getBrief: vi.fn(),
  saveCheckin: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/data/repository", () => ({ repository: {
  getSession: mocks.getSession,
  listSessionSyncCheckins: mocks.listCheckins,
  getSessionSyncBrief: mocks.getBrief,
  saveSessionSyncCheckin: mocks.saveCheckin,
} }));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ id: "session-1" }) };
const session = { id: "session-1", goalId: "goal-1", memberIds: ["member-1", "member-2"] };
const checkin = {
  sessionId: "session-1",
  userId: "member-1",
  progress: "in_progress",
  todayGoal: "Finish the API outline",
  workStyle: "together",
  updatedAt: "2026-09-20T12:00:00Z",
};
const postRequest = (body: unknown) => new Request("http://localhost/api/sessions/session-1/sync-checkin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: "member-1" });
  mocks.getSession.mockResolvedValue(session);
  mocks.listCheckins.mockResolvedValue([checkin]);
  mocks.getBrief.mockResolvedValue(null);
  mocks.saveCheckin.mockResolvedValue(checkin);
});

it("requires authentication and session membership", async () => {
  mocks.getUser.mockResolvedValueOnce(null);
  expect((await GET(new Request("http://localhost"), context)).status).toBe(401);

  mocks.getSession.mockResolvedValueOnce(null);
  expect((await GET(new Request("http://localhost"), context)).status).toBe(404);

  mocks.getSession.mockResolvedValueOnce({ ...session, memberIds: ["member-2"] });
  expect((await GET(new Request("http://localhost"), context)).status).toBe(403);

  mocks.getSession.mockResolvedValueOnce({ ...session, goalId: undefined });
  expect((await GET(new Request("http://localhost"), context)).status).toBe(422);
  expect(mocks.listCheckins).not.toHaveBeenCalled();
});

it("returns the shared readiness state and saved brief without caching", async () => {
  const brief = { sessionId: "session-1", content: "GROUP SYNC BRIEF", modelName: "muse-spark-1.3", generatedAt: "2026-09-20T12:01:00Z" };
  mocks.getBrief.mockResolvedValueOnce(brief);
  const response = await GET(new Request("http://localhost"), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ checkins: [checkin], brief });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("validates malformed and invalid check-ins before saving", async () => {
  expect((await POST(postRequest("{"), context)).status).toBe(400);
  for (const body of [
    { progress: "unknown", todayGoal: "A valid goal", workStyle: "together" },
    { progress: "starting", todayGoal: "x", workStyle: "together" },
    { progress: "starting", todayGoal: "A valid goal", workStyle: "unknown" },
    { progress: "starting", todayGoal: "A valid goal", workStyle: "together", unexpected: "field" },
  ]) {
    expect((await POST(postRequest(body), context)).status).toBe(400);
  }
  expect(mocks.saveCheckin).not.toHaveBeenCalled();
});

it("trims and saves a valid check-in for the authenticated member", async () => {
  mocks.saveCheckin.mockImplementationOnce(async (sessionId, userId, input) => ({ sessionId, userId, ...input, updatedAt: "now" }));
  const response = await POST(postRequest({
    progress: "ahead",
    todayGoal: "  Prioritize the remaining tasks  ",
    workStyle: "explain",
    blocker: "   ",
  }), context);
  expect(response.status).toBe(200);
  expect(mocks.saveCheckin).toHaveBeenCalledWith("session-1", "member-1", {
    progress: "ahead",
    todayGoal: "Prioritize the remaining tasks",
    workStyle: "explain",
    blocker: undefined,
  });
});
