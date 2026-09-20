import { getUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getUser()) return Response.json({ error: 'Please log in to practice.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const { id } = await params;
  const { data: course } = await getSupabaseServerClient().from('courses').select('id').eq('id', id).maybeSingle();
  if (!course) return Response.json({ error: 'Course not found.' }, { status: 404 });
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return Response.json({ error: 'Voice practice is not configured yet. Add DEEPGRAM_API_KEY on the server.' }, { status: 503 });
  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST', headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: 30 }), signal: AbortSignal.timeout(10_000), cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403) {
      return Response.json({ error: response.status === 403
        ? 'Deepgram API key has insufficient permissions. Use a key with Member or higher authorization in DEEPGRAM_API_KEY, then restart the server.'
        : 'Deepgram API key is invalid or expired. Update DEEPGRAM_API_KEY and restart the server.' }, { status: 503 });
    }
    if (!response.ok) throw new Error('Token grant failed');
    const data = await response.json();
    if (typeof data.access_token !== 'string') throw new Error('Missing token');
    return Response.json({ token: data.access_token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not connect to voice practice. Please try again.' }, { status: 502 });
  }
}
