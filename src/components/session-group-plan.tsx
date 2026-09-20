'use client';

import { useState } from 'react';

export function SessionGroupPlan({ sessionId, isMember }: { sessionId: string; isMember: boolean }) {
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${sessionId}/group-plan`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate a group plan.');
      if (typeof data.plan !== 'string' || !data.plan.trim()) throw new Error('No plan was returned. Please try again.');
      setPlan(data.plan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate a group plan. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" aria-busy={busy}>
    <p className="eyebrow">Group coordinator · Meta</p>
    <h2>Make a plan together</h2>
    <p className="subtle">Turn your topic and members’ shared strengths and needs into an icebreaker, discussion agenda, and suggested roles.</p>
    {isMember ? <>
      <p className="subtle">Generating sends this session’s topic, member names, strengths, needs, and policy to Meta. The draft stays on this page; discuss it with your group before using it.</p>
      <button type="button" className="button" disabled={busy} onClick={generate}>{busy ? 'Planning…' : plan ? 'Regenerate group plan' : 'Generate group plan'}</button>
    </> : <p className="subtle">Join this session to generate a group plan.</p>}
    {error && <p role="alert">{error}</p>}
    <div aria-live="polite">
      {plan && <div style={{ marginTop: '1rem' }}><span className="pill amber">Draft · Discuss with your group</span><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{plan}</p></div>}
    </div>
  </section>;
}
