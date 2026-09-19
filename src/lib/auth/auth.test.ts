import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getSession: vi.fn(), updateCapacity: vi.fn(), createSession: vi.fn(), joinSession: vi.fn(), leaveSession: vi.fn(), submitAvailability: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/data/repository', () => ({ repository: mocks }));
import { POST as create } from '@/app/api/sessions/route';
import { POST as leave } from '@/app/api/sessions/[id]/leave/route';
import { POST as join } from '@/app/api/sessions/[id]/join/route';
import { POST as availability } from '@/app/api/sessions/[id]/availability/route';
const request = (body: unknown) => new Request('http://localhost/api/sessions', { method: 'POST', body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: 'session-1' }) };
const input = { courseId: 'course-1', creatorId: 'impersonated-user', type: 'study', title: 'Study together', topic: 'Graphs', minPeople: 2, maxPeople: 4, durationMinutes: 60, proposedSlots: [{ start: '2026-09-22T20:00:00.000Z', end: '2026-09-22T21:00:00.000Z' }] };
beforeEach(() => { vi.resetAllMocks(); });
describe('authenticated session writes', () => {
  it('rejects unauthenticated writes before touching storage', async () => {
    mocks.getUser.mockResolvedValue(null);
    expect((await create(request(input))).status).toBe(401);
    expect((await join(request({}), params)).status).toBe(401);
    expect((await availability(request({}), params)).status).toBe(401);
    expect((await leave(request({}), params)).status).toBe(401);
    expect(mocks.leaveSession).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.joinSession).not.toHaveBeenCalled();
    expect(mocks.submitAvailability).not.toHaveBeenCalled();
  });
  it('overrides a forged creator with the verified account', async () => {
    mocks.getUser.mockResolvedValue({ id: 'real-user' });
    mocks.createSession.mockResolvedValue({ id: 'new-session' });
    expect((await create(request(input))).status).toBe(201);
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ creatorId: 'real-user' }));
  });
  it('joins and saves availability only as the verified account', async () => {
    mocks.getUser.mockResolvedValue({ id: 'real-user' });
    await join(request({ userId: 'victim' }), params);
    mocks.getSession.mockResolvedValue({ memberIds: ['real-user'] });
    await availability(request({ userId: 'victim', slots: input.proposedSlots }), params);
    expect(mocks.joinSession).toHaveBeenCalledWith('session-1', 'real-user');
    expect(mocks.submitAvailability).toHaveBeenCalledWith('session-1', 'real-user', input.proposedSlots);
  });
  it('rejects availability from a non-member', async () => {
    mocks.getUser.mockResolvedValue({ id: 'outsider' });
    mocks.getSession.mockResolvedValue({ memberIds: ['member'] });
    expect((await availability(request({ slots: input.proposedSlots }), params)).status).toBe(403);
    expect(mocks.submitAvailability).not.toHaveBeenCalled();
  });
  it('rejects durations unsupported by the database', async () => {
    mocks.getUser.mockResolvedValue({ id: 'real-user' });
    expect((await create(request({ ...input, durationMinutes: 31 }))).status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});

it('leaves only as the verified account, ignoring forged user IDs', async () => {
  mocks.getUser.mockResolvedValue({ id: 'real-user' });
  mocks.getSession.mockResolvedValue({ id: 'session-1' });
  expect((await leave(request({ userId: 'victim' }), params)).status).toBe(200);
  expect(mocks.leaveSession).toHaveBeenCalledWith('session-1', 'real-user');
});
it('reports a failed leave without claiming success', async () => {
  mocks.getUser.mockResolvedValue({ id: 'real-user' });
  mocks.getSession.mockResolvedValue({ id: 'session-1' });
  mocks.leaveSession.mockRejectedValue(new Error('Storage unavailable'));
  expect((await leave(request({}), params)).status).toBe(500);
});

import { PATCH as updateCapacity } from '@/app/api/sessions/[id]/route';
it('allows only authenticated creators to update capacity', async () => {
  mocks.getUser.mockResolvedValue(null);
  expect((await updateCapacity(request({ minPeople: 2, maxPeople: 4 }), params)).status).toBe(401);
  mocks.getUser.mockResolvedValue({ id: 'outsider' });
  mocks.getSession.mockResolvedValue({ creatorId: 'owner', memberIds: ['owner'] });
  expect((await updateCapacity(request({ minPeople: 2, maxPeople: 4 }), params)).status).toBe(403);
  expect(mocks.updateCapacity).not.toHaveBeenCalled();
  mocks.getUser.mockResolvedValue({ id: 'owner' });
  expect((await updateCapacity(request({ minPeople: 2, maxPeople: 4 }), params)).status).toBe(200);
  expect(mocks.updateCapacity).toHaveBeenCalledWith('session-1', 'owner', 2, 4);
});
it('rejects invalid capacity and changes below existing membership', async () => {
  mocks.getUser.mockResolvedValue({ id: 'owner' });
  mocks.getSession.mockResolvedValue({ creatorId: 'owner', memberIds: ['owner', 'a', 'b'] });
  expect((await updateCapacity(request({ minPeople: 4, maxPeople: 2 }), params)).status).toBe(400);
  expect((await updateCapacity(request({ minPeople: 2, maxPeople: 2 }), params)).status).toBe(409);
  expect(mocks.updateCapacity).not.toHaveBeenCalled();
  mocks.updateCapacity.mockRejectedValue(new Error('capacity_below_members'));
  expect((await updateCapacity(request({ minPeople: 2, maxPeople: 3 }), params)).status).toBe(409);
});
