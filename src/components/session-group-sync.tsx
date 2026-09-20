"use client";

import { useMemo, useState } from "react";
import type { SessionSyncBrief, SessionSyncCheckin, SyncProgress, SyncWorkStyle } from "@/lib/domain/types";

type Member = { id: string; name: string; initials: string };

const progressLabels: Record<SyncProgress, string> = {
  starting: "Just starting",
  in_progress: "Partway through",
  comfortable: "Comfortable with the basics",
  ahead: "Ready to go deeper",
};

const workStyleLabels: Record<SyncWorkStyle, string> = {
  together: "Work through it together",
  independent_then_regroup: "Work separately, then regroup",
  explain: "Explain ideas to each other",
  example: "Learn from an example",
};

export function SessionGroupSync({
  sessionId,
  members,
  currentUserId,
  initialCheckins,
  initialBrief,
}: {
  sessionId: string;
  members: Member[];
  currentUserId: string;
  initialCheckins: SessionSyncCheckin[];
  initialBrief: SessionSyncBrief | null;
}) {
  const existing = initialCheckins.find((item) => item.userId === currentUserId);
  const [checkins, setCheckins] = useState(initialCheckins);
  const [brief, setBrief] = useState(initialBrief);
  const [progress, setProgress] = useState<SyncProgress>(existing?.progress ?? "in_progress");
  const [todayGoal, setTodayGoal] = useState(existing?.todayGoal ?? "");
  const [workStyle, setWorkStyle] = useState<SyncWorkStyle>(existing?.workStyle ?? "together");
  const [blocker, setBlocker] = useState(existing?.blocker ?? "");
  const [editing, setEditing] = useState(!existing);
  const [busy, setBusy] = useState<"save" | "refresh" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const readyIds = useMemo(() => new Set(checkins.map((item) => item.userId)), [checkins]);
  const currentCheckin = checkins.find((item) => item.userId === currentUserId);
  const allReady = members.length > 0 && members.every((member) => readyIds.has(member.id));

  async function refresh() {
    setBusy("refresh");
    setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/sync-checkin`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh Progress Sync.");
      setCheckins(data.checkins);
      setBrief(data.brief);
      setMessage("Progress Sync refreshed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh Progress Sync.");
    } finally {
      setBusy(null);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/sync-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress, todayGoal, workStyle, blocker }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save Progress Sync.");
      setCheckins((items) => [...items.filter((item) => item.userId !== currentUserId), data.checkin]);
      setEditing(false);
      setMessage("Your Progress Sync is ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save Progress Sync.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy("generate");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/sync-brief`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate the Group Sync Brief.");
      setBrief(data.brief);
      setMessage("Group Sync Brief generated and saved for this session.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the Group Sync Brief.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="card group-sync" aria-busy={busy !== null}>
    <div className="row-between group-sync-heading">
      <div>
        <p className="eyebrow">Goal session · Meta</p>
        <h2>Group Sync Brief</h2>
        <p className="subtle">A 30-second check-in helps Meta plan one useful session for everyone, even when progress and learning styles differ.</p>
      </div>
      <span className={`pill ${allReady ? "" : "amber"}`}>{readyIds.size}/{members.length} ready</span>
    </div>

    <div className="group-sync-layout">
      <div>
        <h3>Your Progress Sync</h3>
        {editing ? <form className="sync-form" onSubmit={save}>
          <div className="field">
            <label htmlFor="sync-progress">Where are you right now?</label>
            <select id="sync-progress" value={progress} onChange={(event) => setProgress(event.target.value as SyncProgress)} disabled={busy !== null}>
              {Object.entries(progressLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sync-goal">What would make today useful?</label>
            <input id="sync-goal" value={todayGoal} onChange={(event) => setTodayGoal(event.target.value)} minLength={2} maxLength={160} required placeholder="e.g. Finish the API outline" disabled={busy !== null} />
          </div>
          <div className="field">
            <label htmlFor="sync-style">How do you want to work?</label>
            <select id="sync-style" value={workStyle} onChange={(event) => setWorkStyle(event.target.value as SyncWorkStyle)} disabled={busy !== null}>
              {Object.entries(workStyleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sync-blocker">Anything blocking you? <span className="subtle">Optional</span></label>
            <input id="sync-blocker" value={blocker} onChange={(event) => setBlocker(event.target.value)} maxLength={160} placeholder="e.g. I am unsure about authentication" disabled={busy !== null} />
          </div>
          <div className="sync-actions">
            <button type="submit" disabled={busy !== null || todayGoal.trim().length < 2}>{busy === "save" ? "Saving…" : "I'm ready"}</button>
            {currentCheckin && <button type="button" className="button secondary" disabled={busy !== null} onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form> : <div className="notice sync-saved">
          <strong>✓ You’re ready</strong>
          <p>{currentCheckin?.todayGoal}</p>
          <button type="button" className="button secondary" onClick={() => setEditing(true)} disabled={busy !== null}>Edit my check-in</button>
        </div>}
      </div>

      <div>
        <div className="row-between">
          <h3>Group readiness</h3>
          <button type="button" className="text-button" onClick={refresh} disabled={busy !== null}>{busy === "refresh" ? "Refreshing…" : "Refresh"}</button>
        </div>
        <ul className="sync-member-list">
          {members.map((member) => <li key={member.id}>
            <span className="avatar" aria-hidden="true">{member.initials}</span>
            <span><strong>{member.name}{member.id === currentUserId ? " (you)" : ""}</strong><small>{readyIds.has(member.id) ? "Ready" : "Waiting for check-in"}</small></span>
            <span className={`sync-dot ${readyIds.has(member.id) ? "ready" : ""}`} aria-label={readyIds.has(member.id) ? "Ready" : "Waiting"} />
          </li>)}
        </ul>
        <button type="button" onClick={generate} disabled={busy !== null || !allReady}>{busy === "generate" ? "Generating with Meta…" : brief ? "Regenerate brief" : "Generate Group Sync Brief"}</button>
        {!allReady && <p className="subtle sync-help">Available after everyone checks in.</p>}
      </div>
    </div>

    {error && <p role="alert" className="sync-error">{error}</p>}
    {message && <p role="status" className="notice">{message}</p>}
    {brief && <div className="sync-brief" aria-live="polite">
      <div className="row-between"><span className="pill">Draft · Meta</span><small className="subtle">Saved {new Date(brief.generatedAt).toLocaleString()}</small></div>
      <p>{brief.content}</p>
    </div>}
  </section>;
}
