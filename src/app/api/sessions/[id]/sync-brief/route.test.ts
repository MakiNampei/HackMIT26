import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  getGoal: vi.fn(),
  listCheckins: vi.fn(),
  saveBrief: vi.fn(),
  create: vi.fn(),
  client: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/data/repository", () => ({ repository: {
  getSession: mocks.getSession,
  getGoal: mocks.getGoal,
  listSessionSyncCheckins: mocks.listCheckins,
  saveSessionSyncBrief: mocks.saveBrief,
} }));
vi.mock("openai", () => ({ default: class {
  constructor(options: unknown) { mocks.client(options); }
  chat = { completions: { create: mocks.create } };
} }));

import { POST } from "./route";

const context = { params: Promise.resolve({ id: "session-1" }) };
const request = () => new Request("http://localhost/api/sessions/session-1/sync-brief", { method: "POST" });
const session = {
  id: "session-1",
  goalId: "goal-1",
  type: "study",
  memberIds: ["user-a", "user-b"],
  course: { code: "CS 101" },
  title: "Build sprint",
  topic: "Connect the API",
  durationMinutes: 60,
  members: [
    { id: "user-a", name: "Alex" },
    { id: "user-b", name: "Bailey" },
  ],
};
const goal = { id: "goal-1", title: "Finish project", type: "project", description: "Ship the app", targetDate: "2026-10-01" };
const checkins = [
  { sessionId: "session-1", userId: "user-a", progress: "starting", todayGoal: "Outline the API", workStyle: "together", updatedAt: "2026-09-20T00:00:00Z" },
  { sessionId: "session-1", userId: "user-b", progress: "ahead", todayGoal: "Connect the UI", workStyle: "independent_then_regroup", updatedAt: "2026-09-20T00:00:00Z" },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("META_API_KEY", "meta-test-key");
  vi.stubEnv("META_MODEL", "muse-spark-1.3");
  mocks.getUser.mockResolvedValue({ id: "user-a" });
  mocks.getSession.mockResolvedValue(session);
  mocks.getGoal.mockResolvedValue(goal);
  mocks.listCheckins.mockResolvedValue(checkins);
  mocks.create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: "GROUP SYNC BRIEF\nA useful plan" } }] });
  mocks.saveBrief.mockImplementation(async (sessionId, content, modelName) => ({ sessionId, content, modelName, generatedAt: "2026-09-20T00:01:00Z" }));
});

afterEach(() => vi.unstubAllEnvs());

it("waits for every current member before calling Meta", async () => {
  mocks.listCheckins.mockResolvedValueOnce(checkins.slice(0, 1));
  const response = await POST(request(), context);
  expect(response.status).toBe(409);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("generates and persists a brief without sending private IDs", async () => {
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(mocks.client).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "meta-test-key", baseURL: "https://api.meta.ai/v1" }));
  const input = mocks.create.mock.calls[0][0].messages[1].content;
  expect(input).toContain("Outline the API");
  expect(input).toContain("Connect the UI");
  expect(input).not.toContain("user-a");
  expect(input).not.toContain("user-b");
  expect(mocks.saveBrief).toHaveBeenCalledWith("session-1", "GROUP SYNC BRIEF\nA useful plan", "muse-spark-1.3", "user-a");
});

it("rejects outsiders and missing Meta configuration", async () => {
  mocks.getUser.mockResolvedValueOnce({ id: "outsider" });
  expect((await POST(request(), context)).status).toBe(403);
  vi.stubEnv("META_API_KEY", "");
  expect((await POST(request(), context)).status).toBe(503);
  expect(mocks.create).not.toHaveBeenCalled();
});
