import { CourseForm } from '@/components/course-form';
import { PolicyCard } from '@/components/policy-card';
import { repository } from '@/lib/data/repository';
import Link from 'next/link';
import { CourseVoicePractice } from '@/components/course-voice-practice';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { listMaterials } from '@/lib/courses/store';
import { MaterialLibrary } from '@/components/material-library';
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { data: course } = await getSupabaseServerClient().from('courses').select('id,code,name,school').eq('id',id).maybeSingle();
  if (!course) notFound();
  const policy = await repository.getCoursePolicy(id);
  const materials = await listMaterials(user.id, id);
  return <><Link className="subtle" href="/courses">← All courses</Link><header className="page-header" style={{ marginTop: '1.5rem' }}><div><p className="eyebrow">{course.code} · {course.school}</p><h1>{course.name}</h1></div><Link className="button secondary" href={`/sessions/new?courseId=${encodeURIComponent(id)}`}>Create session</Link></header>{policy ? <PolicyCard policy={policy} /> : <CourseForm courseId={id} />}<CourseVoicePractice courseId={id} courseName={course.name} /><MaterialLibrary courseId={id} initialMaterials={materials} /></>;
}
