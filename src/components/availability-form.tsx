"use client";

import { type FormEvent, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { AvailabilitySlot, BestTimeResult } from "@/lib/domain/types";
import { LocalTime } from "@/components/local-time";

const subscribe = () => () => {};
function localInput(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function AvailabilityForm(props: { sessionId: string; initialSlots: AvailabilitySlot[] }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <AvailabilityEditor {...props} /> : <p role="status">Loading your saved availability…</p>;
}
function AvailabilityEditor({ sessionId, initialSlots }: { sessionId: string; initialSlots: AvailabilitySlot[] }) {
  const [slots, setSlots] = useState(() => initialSlots.length ? initialSlots.map(slot => ({ start: localInput(slot.start), end: localInput(slot.end) })) : [{ start: "", end: "" }]);
  const [result, setResult] = useState<BestTimeResult | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  function update(index: number, field: "start" | "end", value: string) {
    setSlots(items => items.map((slot, i) => i === index ? { ...slot, [field]: value } : slot));
    setSaved(false); setResult(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setSaved(false); setResult(null);
    try {
      const values = slots.map(slot => {
        const start = new Date(slot.start), end = new Date(slot.end);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error("Each window needs an end later than its start.");
        return { start: start.toISOString(), end: end.toISOString() };
      });
      const save = await fetch(`/api/sessions/${sessionId}/availability`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots: values }) });
      const body = await save.json().catch(() => null);
      if (!save.ok) throw new Error(body?.error ?? "Could not save availability. Please try again.");
      setSaved(true);
      const response = await fetch(`/api/sessions/${sessionId}/best-time`);
      if (response.status === 404) return;
      if (!response.ok) throw new Error("Your availability was saved, but matching could not finish. Please try again.");
      setResult((await response.json()).data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); }
    finally { setPending(false); }
  }
  return <div className="grid two availability-layout">
    <form className="card grid" onSubmit={submit}>
      <div><p className="eyebrow">Your schedule</p><h2>{initialSlots.length ? "Update your available times" : "When are you free?"}</h2><p className="subtle">Times are shown in {timezone}. Add all the windows that work for you.</p></div>
      {slots.map((slot, i) => <fieldset className="slot-editor grid" key={i} disabled={pending}>
        <legend>Window {i + 1}</legend>
        <div className="field"><label htmlFor={`start-${i}`}>From</label><input id={`start-${i}`} type="datetime-local" value={slot.start} onChange={e => update(i, "start", e.target.value)} required /></div>
        <div className="field"><label htmlFor={`end-${i}`}>Until</label><input id={`end-${i}`} type="datetime-local" value={slot.end} onChange={e => update(i, "end", e.target.value)} required /></div>
        {slots.length > 1 && <button className="button secondary" type="button" onClick={() => { setSlots(items => items.filter((_, index) => index !== i)); setSaved(false); setResult(null); }} aria-label={`Remove window ${i + 1}`}>Remove window</button>}
      </fieldset>)}
      <button className="button secondary" disabled={pending || slots.length >= 100} type="button" onClick={() => { setSlots(items => [...items, { start: "", end: "" }]); setSaved(false); setResult(null); }}>＋ Add another window</button>
      {saved && <p className="notice" role="status">Your availability has been saved.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={pending} type="submit">{pending ? "Saving and finding a match…" : "Save availability"}</button>
    </form>
    <section className="card">
      <p className="eyebrow">Group schedule</p><h2>{result ? "Suggested meeting time" : saved ? "Waiting for a shared time" : "Find a time together"}</h2>
      {result ? <><strong><LocalTime start={result.start} /></strong><p className="subtle">{result.availableCount} of {result.totalCount} students available. This suggestion is not a confirmation.</p></> : <p className="subtle">{saved ? "No time meets the minimum group size yet. Other members can add or update their availability." : "Save your available windows to see the earliest time that works for the most people."}</p>}
      <Link className="button secondary" href={`/sessions/${sessionId}`}>Back to session</Link>
    </section>
  </div>;
}
