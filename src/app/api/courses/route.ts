import { getUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { courseInput } from '@/lib/courses/types';
import { readPolicyPreview } from '@/lib/courses/policy-token';
import { repository } from '@/lib/data/repository';
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please log in first' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = courseInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Enter a course code, name, and school.' }, { status: 400 });
  if (body?.acknowledged !== true || typeof body?.policyToken !== 'string') return Response.json({ error: 'Analyze and confirm the course policy before adding the course.' }, { status: 400 });
  let preview;
  try { preview = readPolicyPreview(body.policyToken, user.id); }
  catch { return Response.json({ error: 'The policy preview expired or changed. Analyze it again.' }, { status: 400 }); }
  const input = { ...parsed.data, code: parsed.data.code.toUpperCase() };
  const client = getSupabaseServerClient();
  const { data, error } = await client.from('courses').insert(input).select('id').single();
  if (error?.code === '23505') {
    const existing = await client.from('courses').select('id').eq('school', input.school).eq('code', input.code).single();
    if (existing.data) {
      try {
        if (!await repository.getCoursePolicy(existing.data.id)) {
          await repository.saveCoursePolicy(existing.data.id, { ...preview.policy, id: `policy-${crypto.randomUUID()}` }, preview.sourceName);
        }
      } catch { return Response.json({ error: 'Could not complete course policy setup. Open the course to retry.' }, { status: 503 }); }
      return Response.json({ data: existing.data });
    }
  }
  if (error) return Response.json({ error: 'Could not add this course. Please try again.' }, { status: 503 });
  try {
    await repository.saveCoursePolicy(data.id, { ...preview.policy, id: `policy-${crypto.randomUUID()}` }, preview.sourceName);
  } catch {
    return Response.json({ error: 'Course created, but its policy could not be saved. Open the course to complete policy setup.' }, { status: 503 });
  }
  return Response.json({ data }, { status: 201 });
}
