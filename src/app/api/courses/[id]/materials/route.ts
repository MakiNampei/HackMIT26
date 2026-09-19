import { randomUUID } from 'node:crypto';
import { getUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { MATERIAL_BUCKET, materialPath, saveMaterial } from '@/lib/courses/store';
import { MAX_FILE_BYTES, fileMime, type Material } from '@/lib/courses/types';
import { analyzeMaterial } from '@/lib/courses/analyze';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please log in first' }, { status: 401 });
  const { id } = await params;
  const client = getSupabaseServerClient();
  const course = await client.from('courses').select('id').eq('id', id).maybeSingle();
  if (!course.data) return Response.json({ error: 'Course not found' }, { status: 404 });
  if (Number(request.headers.get('content-length')) > MAX_FILE_BYTES + 65536) return Response.json({ error: 'Files must be 10 MB or smaller.' }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = form?.get('kind');
  if (!(file instanceof File) || !['syllabus', 'lecture', 'assignment'].includes(String(kind))) return Response.json({ error: 'Choose a file and document type.' }, { status: 400 });
  if (!file.size || file.size > MAX_FILE_BYTES || file.name.length > 200) return Response.json({ error: 'Choose a non-empty file up to 10 MB, with a name under 200 characters.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let mime: string;
  try { mime = fileMime(file.name, bytes); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  if (mime === 'text/plain' && bytes.length > 100_000) return Response.json({ error: 'Text files must be under 100 KB. Use PDF for longer documents.' }, { status: 400 });
  const material: Material = { id: randomUUID(), courseId: id, name: file.name, kind: kind as Material['kind'], source: form?.get('source') === 'dropbox' ? 'dropbox' : 'local', createdAt: new Date().toISOString(), mime, size: file.size, analysis: null };
  const path = `${materialPath(user.id, id, material.id)}.file`;
  const storage = client.storage.from(MATERIAL_BUCKET);
  const upload = await storage.upload(path, bytes, { contentType: mime });
  if (upload.error) return Response.json({ error: 'Could not store the file. Please try again.' }, { status: 503 });
  try {
    await saveMaterial(user.id, material);
    try { material.analysis = await analyzeMaterial(material, bytes); }
    catch { material.analysisError = 'Your file is saved, but AI analysis could not finish. You can retry below.'; }
    await saveMaterial(user.id, material);
    return Response.json({ data: material }, { status: 201 });
  } catch { return Response.json({ error: 'The file was uploaded but its details could not be saved. Refresh and try again.' }, { status: 503 }); }
}
