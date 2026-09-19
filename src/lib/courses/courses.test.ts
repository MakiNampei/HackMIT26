import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseInput, fileMime } from './types';
const mock = vi.hoisted(() => ({ getUser: vi.fn(), getClient: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mock.getUser }));
vi.mock('@/lib/data/supabase-client', () => ({ getSupabaseServerClient: mock.getClient }));
vi.mock('server-only', () => ({}));
import { materialPath } from './store';
import { POST as createCourse } from '@/app/api/courses/route';
import { GET as download } from '@/app/api/courses/[id]/materials/[materialId]/route';
beforeEach(() => vi.resetAllMocks());
describe('course document boundaries', () => {
  it('rejects executable content renamed as a PDF', () => {
    expect(() => fileMime('syllabus.pdf', Buffer.from('<html>not a pdf</html>'))).toThrow('valid PDF');
    expect(fileMime('syllabus.pdf', Buffer.from('%PDF-1.7'))).toBe('application/pdf');
  });
  it('accepts text and rejects binary disguised as text', () => {
    expect(fileMime('notes.md', Buffer.from('# Graphs'))).toBe('text/plain');
    expect(() => fileMime('notes.txt', new Uint8Array([0, 1, 2]))).toThrow();
  });
  it('validates a complete course', () => {
    expect(courseInput.safeParse({ code: ' ', name: 'Algorithms', school: 'WashU' }).success).toBe(false);
  });
  it('isolates the same document ID by verified user', () => {
    const id = 'f76e9cbd-0cdf-4210-b891-a5308032f598';
    expect(materialPath('alice', 'course', id)).not.toBe(materialPath('bob', 'course', id));
    expect(() => materialPath('alice', 'course', '../bob/file')).toThrow();
  });
  it('rejects unauthenticated course creation before storage', async () => {
    mock.getUser.mockResolvedValue(null);
    expect((await createCourse(new Request('http://localhost/api/courses', { method: 'POST' }))).status).toBe(401);
    expect(mock.getClient).not.toHaveBeenCalled();
  });
  it('never reads another user’s file path for a signed-in downloader', async () => {
    mock.getUser.mockResolvedValue({ id: 'bob' });
    const read = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mock.getClient.mockReturnValue({ storage: { from: () => ({ download: read }) } });
    const id = 'f76e9cbd-0cdf-4210-b891-a5308032f598';
    const result = await download(new Request('http://localhost'), { params: Promise.resolve({ id: 'course', materialId: id }) });
    expect(result.status).toBe(404);
    expect(read).toHaveBeenCalledWith(`bob/course/${id}.json`);
  });
  it('rejects anonymous document downloads', async () => {
    mock.getUser.mockResolvedValue(null);
    const result = await download(new Request('http://localhost'), { params: Promise.resolve({ id: 'course', materialId: 'f76e9cbd-0cdf-4210-b891-a5308032f598' }) });
    expect(result.status).toBe(401);
    expect(mock.getClient).not.toHaveBeenCalled();
  });
});
