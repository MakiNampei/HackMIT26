import 'server-only';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import type { Material } from './types';
export const MATERIAL_BUCKET = 'course-materials';
function prefix(userId: string, courseId: string) {
  return `${encodeURIComponent(userId)}/${encodeURIComponent(courseId)}`;
}
export function materialPath(userId: string, courseId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid material ID');
  return `${prefix(userId, courseId)}/${id}`;
}
export async function saveMaterial(userId: string, material: Material) {
  const { error } = await getSupabaseServerClient().storage.from(MATERIAL_BUCKET).upload(
    `${materialPath(userId, material.courseId, material.id)}.json`, JSON.stringify(material),
    { contentType: 'application/json', upsert: true },
  );
  if (error) throw new Error('Could not save the analysis. Please try again.');
}
export async function getMaterial(userId: string, courseId: string, id: string): Promise<Material | null> {
  const { data, error } = await getSupabaseServerClient().storage.from(MATERIAL_BUCKET).download(`${materialPath(userId, courseId, id)}.json`);
  if (error || !data) return null;
  return JSON.parse(await data.text()) as Material;
}
export async function listMaterials(userId: string, courseId: string): Promise<Material[]> {
  const { data, error } = await getSupabaseServerClient().storage.from(MATERIAL_BUCKET).list(prefix(userId, courseId), { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw new Error('Course materials could not be loaded. Please try again.');
  const items = await Promise.all((data ?? []).filter(x => x.name.endsWith('.json')).map(x => getMaterial(userId, courseId, x.name.slice(0, -5))));
  return items.filter((x): x is Material => x !== null).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
