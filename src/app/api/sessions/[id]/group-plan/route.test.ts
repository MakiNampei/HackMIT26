import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getSession: vi.fn(), create: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/data/repository', () => ({ repository: { getSession: mocks.getSession } }));
vi.mock('openai', () => ({ default: class {
  constructor(options: unknown) { mocks.client(options); }
  chat = { completions: { create: mocks.create } };
} }));
import { POST } from './route';
const context = { params: Promise.resolve({ id: 's1' }) };
const request = () => new Request('http://localhost/api/sessions/s1/group-plan', { method: 'POST' });
const session = { type: 'study', memberIds: ['student'], course: { code: 'CS101' }, topic: 'Graphs', durationMinutes: 60, members: [{ id: 'private-id', name: 'Alex', canHelp: ['BFS'], needsHelp: ['DFS'] }] };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('META_API_KEY', 'meta-test-key');
  vi.stubEnv('META_MODEL', 'muse-spark-1.3');
  mocks.getUser.mockResolvedValue({ id: 'student' });
  mocks.getSession.mockResolvedValue(session);
  mocks.create.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: 'Discuss graph traversal together.' } }] });
});
afterEach(() => vi.unstubAllEnvs());
it('rejects unauthenticated users, outsiders, and missing sessions without calling Meta', async () => {
  mocks.getUser.mockResolvedValueOnce(null);
  expect((await POST(request(), context)).status).toBe(401);
  mocks.getUser.mockResolvedValueOnce({ id: 'outsider' });
  expect((await POST(request(), context)).status).toBe(403);
  mocks.getSession.mockResolvedValueOnce(null);
  expect((await POST(request(), context)).status).toBe(404);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('uses the Meta key and endpoint, with server-owned context and no member IDs', async () => {
  const response = await POST(request(), context);
  expect(await response.json()).toEqual({ plan: 'Discuss graph traversal together.' });
  expect(mocks.client).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'meta-test-key', baseURL: 'https://api.meta.ai/v1' }));
  const input = mocks.create.mock.calls[0][0].messages[1].content;
  expect(input).toContain('BFS');
  expect(input).not.toContain('private-id');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('blocks assignment collaboration when permissions are missing or unclear', async () => {
  for (const policy of [undefined, { collaborationAllowed: false }, { collaborationAllowed: true, discussionAllowed: true, needsInstructorReview: true }]) {
    mocks.getSession.mockResolvedValueOnce({ ...session, type: 'assignment', policy });
    expect((await POST(request(), context)).status).toBe(422);
  }
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.getSession.mockResolvedValueOnce({ ...session, type: 'assignment', policy: { collaborationAllowed: true, discussionAllowed: true, needsInstructorReview: false } });
  expect((await POST(request(), context)).status).toBe(200);
});
it('handles missing configuration and rejects empty or truncated responses', async () => {
  vi.stubEnv('META_API_KEY', '');
  expect((await POST(request(), context)).status).toBe(503);
  expect(mocks.create).not.toHaveBeenCalled();
  vi.stubEnv('META_API_KEY', 'meta-test-key');
  for (const [finish_reason, content] of [['length', 'Partial'], ['stop', ' ']]) {
    mocks.create.mockResolvedValueOnce({ choices: [{ finish_reason, message: { content } }] });
    expect((await POST(request(), context)).status).toBe(502);
  }
  mocks.create.mockRejectedValueOnce(new Error('secret provider details'));
  const response = await POST(request(), context);
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain('secret');
});
