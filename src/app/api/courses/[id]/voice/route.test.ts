import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), course: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.user }));
vi.mock('@/lib/data/supabase-client', () => ({ getSupabaseServerClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.course }) }) }) }) }));
import { POST } from './route';
const call = (origin = 'http://localhost') => POST(new Request('http://localhost/api/courses/course/voice', { method: 'POST', headers: { origin } }), { params: Promise.resolve({ id: 'course' }) });
describe('voice token', () => {
  beforeEach(() => { mocks.user.mockResolvedValue({ id: 'student' }); mocks.course.mockResolvedValue({ data: { id: 'course' } }); vi.stubEnv('DEEPGRAM_API_KEY', 'server-secret'); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
  it('requires login', async () => { mocks.user.mockResolvedValue(null); expect((await call()).status).toBe(401); });
  it('rejects cross-origin requests', async () => { expect((await call('https://other.example')).status).toBe(403); });
  it('requires an existing course', async () => { mocks.course.mockResolvedValue({ data: null }); expect((await call()).status).toBe(404); });
  it('reports missing configuration', async () => { vi.stubEnv('DEEPGRAM_API_KEY', ''); expect((await call()).status).toBe(503); });
  it('returns only a short-lived token with caching disabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ access_token: 'temporary', expires_in: 30 })); vi.stubGlobal('fetch', fetcher);
    const result = await call(); expect(await result.json()).toEqual({ token: 'temporary' }); expect(result.headers.get('cache-control')).toBe('no-store');
    expect(fetcher.mock.calls[0][1].body).toBe('{"ttl_seconds":30}');
  });
  it('explains insufficient key permissions without exposing the provider body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ err_msg: 'private provider detail' }, { status: 403 })));
    const result = await call(); expect(result.status).toBe(503);
    const body = await result.json(); expect(body.error).toContain('Member'); expect(body.error).not.toContain('private provider detail');
  });
  it('does not expose upstream errors', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('server-secret'))); const result = await call(); expect(result.status).toBe(502); expect(await result.text()).not.toContain('server-secret'); });
});
