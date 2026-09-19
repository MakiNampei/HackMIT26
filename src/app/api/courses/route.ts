import { getUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { courseInput } from '@/lib/courses/types';
export async function POST(request: Request) {
  if (!await getUser()) return Response.json({ error: 'Please log in first' }, { status: 401 });
  const parsed = courseInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Enter a course code, name, and school.' }, { status: 400 });
  const input = { ...parsed.data, code: parsed.data.code.toUpperCase() };
  const client = getSupabaseServerClient();
  const { data, error } = await client.from('courses').insert(input).select('id').single();
  if (error?.code === '23505') {
    const existing = await client.from('courses').select('id').eq('school', input.school).eq('code', input.code).single();
    if (existing.data) return Response.json({ data: existing.data });
  }
  if (error) return Response.json({ error: 'Could not add this course. Please try again.' }, { status: 503 });
  return Response.json({ data }, { status: 201 });
}
