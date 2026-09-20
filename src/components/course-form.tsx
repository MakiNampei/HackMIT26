'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AcademicPolicy } from '@/lib/domain/types';
import { PolicyCard } from './policy-card';

export function CourseForm({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<{ policy: AcademicPolicy; token: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  function invalidate() { setPreview(null); setAcknowledged(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const endpoint = !preview ? '/api/courses/policy-preview' : courseId ? `/api/courses/${courseId}/policy` : '/api/courses';
      const body = !preview ? { sourceName: form.get('sourceName'), text: form.get('text') } : { ...Object.fromEntries(form), policyToken: preview.token, acknowledged };
      let response: Response;
      if (!preview && mode === 'file') {
        if (!file) throw new Error('Choose a document first.');
        if (file.size > 10 * 1024 * 1024) throw new Error('Files must be 10 MB or smaller.');
        const upload = new FormData(); upload.set('file', file);
        response = await fetch(endpoint, { method: 'POST', body: upload });
      } else {
        response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!preview) { setPreview(result); return; }
      router.push(`/courses/${result.data.id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save course.'); }
    finally { setPending(false); }
  }
  return <form className="card course-create" onSubmit={submit}>
    <p className="eyebrow">COURSE SETUP</p><h2>{courseId ? 'Complete course policy setup' : 'Add a course'}</h2>
    <p className="subtle">Confirm the course rules once. Assignment sessions will use this policy automatically.</p>
    <fieldset className="grid" disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}>
      {!courseId && <>
        <div className="field"><label htmlFor="code">Course code</label><input id="code" name="code" placeholder="e.g. CSE 247" maxLength={30} minLength={2} required onChange={invalidate} /></div>
        <div className="field"><label htmlFor="name">Course name</label><input id="name" name="name" placeholder="Data Structures and Algorithms" maxLength={160} minLength={2} required onChange={invalidate} /></div>
        <div className="field"><label htmlFor="school">School</label><input id="school" name="school" defaultValue="Washington University in St. Louis" maxLength={160} minLength={2} required onChange={invalidate} /></div>
      </>}
      <div className="page-actions" role="group" aria-label="Policy input method">
        <button type="button" className={mode === 'text' ? 'button' : 'button secondary'} aria-pressed={mode === 'text'} onClick={() => { setMode('text'); invalidate(); setError(''); }}>Paste text</button>
        <button type="button" className={mode === 'file' ? 'button' : 'button secondary'} aria-pressed={mode === 'file'} onClick={() => { setMode('file'); invalidate(); setError(''); }}>Upload document</button>
      </div>
      {mode === 'text' ? <>
        <div className="field"><label htmlFor="policy-source">Policy source</label><input id="policy-source" name="sourceName" placeholder="Course syllabus · Collaboration rules" maxLength={160} required onChange={invalidate} /></div>
        <div className="field"><label htmlFor="policy-text">Instructor’s collaboration rules</label><textarea id="policy-text" name="text" rows={6} minLength={30} maxLength={50000} required onChange={invalidate} /></div>
      </> : <div className="field">
        <label htmlFor="policy-document">Syllabus or course policy document</label>
        <input id="policy-document" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" required onChange={event => { setFile(event.target.files?.[0] ?? null); invalidate(); setError(''); }} aria-describedby="policy-file-help" />
        <p id="policy-file-help" className="subtle">PDF up to 10 MB; TXT or Markdown up to 100 KB. Export Word documents as PDF first.</p>
      </div>}
      <p className="subtle">{mode === 'file' ? 'Your document is sent to OpenAI for analysis. This step does not add the original file to the course material library.' : 'The source name and rules are sent to OpenAI for analysis.'} The confirmed summary and cited rules are shared with signed-in classmates.</p>
      {preview && <>
        <PolicyCard policy={preview.policy} />
        {(preview.policy.needsInstructorReview || preview.policy.collaborationAllowed !== true || preview.policy.discussionAllowed !== true) && <p className="notice">You can save these course rules, but assignment time matching will remain paused unless the policy clearly permits collaboration and discussion.</p>}
        <label className="meta-row"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} style={{ width: 'auto' }} />I have reviewed this summary against the instructor’s course rules and confirm it accurately reflects them.</label>
      </>}
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={pending || (!!preview && !acknowledged)}>{pending ? (!preview ? 'Analyzing policy…' : 'Saving…') : !preview ? 'Analyze course policy' : courseId ? 'Confirm course policy' : 'Confirm policy & add course →'}</button>
    </fieldset>
  </form>;
}
