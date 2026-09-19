'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function CourseForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(`/courses/${result.data.id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add course.'); }
    finally { setPending(false); }
  }
  return <form className="card course-create" onSubmit={submit}>
    <p className="eyebrow">MAKE ROOM FOR SOMETHING NEW</p><h2>Add a course</h2>
    <p className="subtle">Add your class, then bring its materials together. Courses are visible to signed-in classmates; your uploaded files stay private.</p>
    <div className="grid">
      <div className="field"><label htmlFor="code">Course code</label><input id="code" name="code" placeholder="e.g. CSE 247" maxLength={30} minLength={2} required /></div>
      <div className="field"><label htmlFor="name">Course name</label><input id="name" name="name" placeholder="Data Structures and Algorithms" maxLength={160} minLength={2} required /></div>
      <div className="field"><label htmlFor="school">School</label><input id="school" name="school" defaultValue="Washington University in St. Louis" maxLength={160} minLength={2} required /></div>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={pending}>{pending ? 'Adding course…' : 'Add course →'}</button>
    </div>
  </form>;
}
