import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getUser: mocks.getUser }));
import { POST, PATCH } from "./route";
it("moves policy mutations to the course workflow", async () => {
  mocks.getUser.mockResolvedValue(null);
  expect((await POST()).status).toBe(401);
  mocks.getUser.mockResolvedValue({ id: "member" });
  expect((await POST()).status).toBe(409);
  expect((await PATCH()).status).toBe(409);
});
