'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { FileText, Upload, CloudDownload, ArrowRight, BookOpen } from 'lucide-react';
import { MAX_FILE_BYTES, type Material } from '@/lib/courses/types';
type DropboxFile = { name: string; link: string; bytes: number };
declare global { interface Window { Dropbox?: { choose: (options: { success: (files: DropboxFile[]) => void; cancel: () => void; linkType: 'direct'; multiselect: false; extensions: string[]; sizeLimit: number }) => void } } }
export function MaterialLibrary({ courseId, initialMaterials }: { courseId: string; initialMaterials: Material[] }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [kind, setKind] = useState<Material['kind']>('syllabus');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
  async function upload(file: File, source: Material['source']) {
    if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('Choose a non-empty file up to 10 MB.');
    const form = new FormData(); form.set('file', file); form.set('kind', kind); form.set('source', source);
    const response = await fetch(`/api/courses/${courseId}/materials`, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload failed. Please try again.');
    setMaterials(items => [result.data, ...items]);
  }
  async function localUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget;
    const file = new FormData(element).get('file');
    if (!(file instanceof File)) return;
    setPending(true); setError('');
    try { await upload(file, 'local'); element.reset(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setPending(false); }
  }
  function chooseDropbox() {
    if (!window.Dropbox) { setError('Dropbox could not load. Refresh the page and try again.'); return; }
    setError(''); setPending(true);
    window.Dropbox.choose({
      linkType: 'direct', multiselect: false, extensions: ['.pdf', '.txt', '.md'], sizeLimit: MAX_FILE_BYTES,
      cancel: () => setPending(false),
      success: async files => {
        try {
          const selected = files[0];
          if (!selected) return;
          const url = new URL(selected.link);
          if (url.protocol !== 'https:' || !(url.hostname === 'dropboxusercontent.com' || url.hostname.endsWith('.dropboxusercontent.com'))) throw new Error('Dropbox returned an unsupported download link.');
          // Download directly in the browser: the server never fetches user-provided URLs.
          const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error('Could not read the Dropbox file. Choose it again.');
          const blob = await response.blob();
          await upload(new File([blob], selected.name, { type: blob.type }), 'dropbox');
        } catch (e) { setError(e instanceof Error ? e.message : 'Dropbox import failed.'); }
        finally { setPending(false); }
      },
    });
  }
  async function retry(material: Material) {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/courses/${courseId}/materials/${material.id}`, { method: 'POST' });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMaterials(items => items.map(item => item.id === material.id ? result.data : item));
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed.'); }
    finally { setPending(false); }
  }
  return <>
    {key && <Script id="dropboxjs" src="https://www.dropbox.com/static/api/2/dropins.js" data-app-key={key} onReady={() => setReady(true)} onError={() => setError('Dropbox could not load. You can still upload a local file.')} />}
    <section className="card material-upload">
      <div><p className="eyebrow">FROM FILES TO A PLAN</p><h2>Bring your course together.</h2><p className="subtle">Upload a syllabus, lecture, or assignment. Get key topics, dates, and collaboration rules with source quotes.</p></div>
      <div className="field"><label htmlFor="kind">What are you adding?</label><select id="kind" value={kind} disabled={pending} onChange={e => setKind(e.target.value as Material['kind'])}><option value="syllabus">Syllabus</option><option value="lecture">Lecture / notes</option><option value="assignment">Assignment</option></select></div>
      <form onSubmit={localUpload} className="upload-zone">
        <Upload size={28} /><div className="field"><label htmlFor="material-file">Choose a course document</label><input id="material-file" name="file" type="file" accept=".pdf,.txt,.md" required disabled={pending} /></div>
        <p className="subtle">PDF up to 10 MB · TXT / Markdown up to 100 KB · Export slides as PDF</p>
        <button disabled={pending}><FileText size={17} />{pending ? 'Saving and analyzing…' : 'Upload & analyze'}</button>
      </form>
      <div className="dropbox-import"><button className="button secondary" disabled={pending || !key || !ready} onClick={chooseDropbox}><CloudDownload size={18} />Import from Dropbox</button><p className="subtle">{!key ? 'Dropbox import is awaiting setup. Local upload is ready.' : 'Choose a file from your Dropbox. It will be copied into your private course library and analyzed.'}</p></div>
      <small className="subtle">Files are private to your account. Uploading or importing sends the selected document to OpenAI for analysis. AI results are a draft: check the source before making decisions.</small>
      {pending && <p role="status" className="notice">Working on your document. This may take a minute; keep this page open.</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <div className="section-heading"><div><p className="eyebrow">YOUR PRIVATE LIBRARY</p><h2>Course materials <span className="subtle">({materials.length})</span></h2></div></div>
    {!materials.length && <section className="card empty-library"><BookOpen size={32} /><h2>A fresh start for this course.</h2><p className="subtle">Your uploaded materials and their analysis will appear here.</p></section>}
    <div className="grid">{materials.map(material => <article className="card material-card" key={material.id}>
      <div className="row-between"><div><span className="pill">{material.kind}</span> <span className="subtle">{material.source === 'dropbox' ? 'Dropbox import' : 'Local upload'}</span><h2 style={{ margin: '.8rem 0' }}>{material.name}</h2></div><a className="button secondary" href={`/api/courses/${courseId}/materials/${material.id}`}>Download source</a></div>
      {material.analysis ? <>
        <p className="subtle">{material.analysis.summary}</p>
        <div className="grid two"><section><h3>Topics to study</h3>{material.analysis.topics.length ? material.analysis.topics.map((topic, i) => <div className="material-finding" key={i}><strong>{topic.title}</strong><p>{topic.explanation}</p><Source quote={topic.evidence.quote} page={topic.evidence.page} /></div>) : <p className="subtle">No supported topics found.</p>}</section>
        <section><h3>Dates & deadlines</h3>{material.analysis.dates.length ? material.analysis.dates.map((date, i) => <div className="material-finding" key={i}><strong>{date.label}</strong><p>{date.dateText}</p><Source quote={date.evidence.quote} page={date.evidence.page} /></div>) : <p className="subtle">No dates specified in this document.</p>}
        <div className="notice"><h3>Collaboration rules</h3><p>{material.analysis.collaboration.summary}</p>{material.analysis.collaboration.needsReview && <strong>Check with your instructor before collaborating.</strong>}{material.analysis.collaboration.evidence.map((e,i) => <Source key={i} quote={e.quote} page={e.page} />)}</div></section></div>
        <div className="material-next"><div><p className="eyebrow">A NEXT STEP, READY FOR YOU</p><strong>{material.analysis.suggestedSession.title}</strong><p className="subtle">{material.analysis.suggestedSession.topic}</p></div><Link className="button" href={`/sessions/new?courseId=${encodeURIComponent(courseId)}&materialId=${material.id}`}>Plan a study session <ArrowRight size={17} /></Link></div>
      </> : <div className="notice"><p>{material.analysisError || 'Your source is saved. Analysis is not available yet.'}</p><button disabled={pending} onClick={() => retry(material)}>Retry analysis</button></div>}
    </article>)}</div>
  </>;
}
function Source({ quote, page }: { quote: string; page: number | null }) {
  return <blockquote className="source-quote">“{quote}”{page !== null && <small> · Page {page}</small>}</blockquote>;
}
