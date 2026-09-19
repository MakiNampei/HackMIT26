import Link from 'next/link';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import { requireUser } from '@/lib/auth/server';
import { repository } from '@/lib/data/repository';
import { CourseForm } from '@/components/course-form';
export default async function CoursesPage() {
  await requireUser();
  const courses = await repository.listCourses();
  return <>
    <header className="page-header"><div><p className="eyebrow">A HOME FOR EVERY CLASS</p><h1>Your courses, connected.</h1><p className="subtle">From scattered files to your next study session.</p></div></header>
    <details className="course-add"><summary>＋ Add a course</summary><CourseForm /></details>
    <div><section><div className="section-heading" style={{ marginTop: 0 }}><h2>Campus courses</h2><span className="pill">{courses.length} courses</span></div><div className="grid two">{courses.map(course => <Link className="card course-tile" href={`/courses/${course.id}`} key={course.id}><span className="metric-icon"><BookOpen size={24} /></span><span className="course-code">{course.code}</span><h2>{course.name}</h2><p className="subtle">{course.school}</p><span className="course-open">Open materials <ArrowUpRight size={18} /></span></Link>)}</div>{!courses.length && <p className="notice">Add your first course to start organizing your materials.</p>}</section></div>
  </>;
}
