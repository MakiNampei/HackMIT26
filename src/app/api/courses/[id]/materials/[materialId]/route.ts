import { getUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { getMaterial, materialPath, MATERIAL_BUCKET, saveMaterial } from '@/lib/courses/store';
import { analyzeMaterial } from '@/lib/courses/analyze';
export const maxDuration = 120;
type Context = { params: Promise<{ id: string; materialId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please log in first' }, { status: 401 });
  const { id, materialId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(materialId)) return Response.json({ error: 'Not found' }, { status: 404 });
  const material = await getMaterial(user.id, id, materialId);
  if (!material) return Response.json({ error: 'Not found' }, { status: 404 });
  const { data, error } = await getSupabaseServerClient().storage.from(MATERIAL_BUCKET).download(`${materialPath(user.id, id, materialId)}.file`);
  if (error || !data) return Response.json({ error: 'Could not download file' }, { status: 503 });
  return new Response(data, { headers: { 'Content-Type': material.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(material.name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function POST(_request: Request, { params }: Context) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please log in first' }, { status: 401 });
  const { id, materialId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(materialId)) return Response.json({ error: 'Not found' }, { status: 404 });
  const material = await getMaterial(user.id, id, materialId);
  if (!material) return Response.json({ error: 'Not found' }, { status: 404 });
  if (material.analysis) return Response.json({ data: material });
  const file = await getSupabaseServerClient().storage.from(MATERIAL_BUCKET).download(`${materialPath(user.id, id, materialId)}.file`);
  if (!file.data) return Response.json({ error: 'Could not load the original file' }, { status: 503 });
  try {
    material.analysis = await analyzeMaterial(material, new Uint8Array(await file.data.arrayBuffer()));
    delete material.analysisError;
    await saveMaterial(user.id, material);
    return Response.json({ data: material });
  } catch { return Response.json({ error: 'AI analysis is unavailable. Your file is safe; try again shortly.' }, { status: 503 }); }
}
