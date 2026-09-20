"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { SessionWithDetails } from "@/lib/domain/types";
import { LocalTime } from "@/components/local-time";

const subscribe = () => () => {};
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SessionCalendar({ sessions }: { sessions: SessionWithDetails[] }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <Calendar sessions={sessions} /> : <p role="status">Loading calendar…</p>;
}

function Calendar({ sessions }: { sessions: SessionWithDetails[] }) {
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const entries = sessions.flatMap(session => {
    const slots = session.confirmedSlot ? [session.confirmedSlot] : session.proposedSlots;
    return slots.filter(slot => Number.isFinite(Date.parse(slot.start)) && Date.parse(slot.end) > Date.parse(slot.start)).map((slot, index) => ({ session, slot, index, confirmed: !!session.confirmedSlot }));
  });
  function entriesOn(key: string) {
    const start = new Date(`${key}T00:00:00`);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return entries.filter(({ slot }) => Date.parse(slot.start) < end.getTime() && Date.parse(slot.end) > start.getTime());
  }
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const agenda = entriesOn(selected).sort((a, b) => Date.parse(a.slot.start) - Date.parse(b.slot.start));
  function moveMonth(amount: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next); setSelected(dayKey(next));
  }
  return <section className="card session-calendar" aria-label="Session calendar">
    <div className="row-between">
      <div><p className="eyebrow">Session calendar</p><h3 aria-live="polite">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3></div>
      <div className="calendar-controls">
        <button className="button secondary" onClick={() => moveMonth(-1)} aria-label="Previous month">←</button>
        <button className="button secondary" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(dayKey(now)); }}>Today</button>
        <button className="button secondary" onClick={() => moveMonth(1)} aria-label="Next month">→</button>
      </div>
    </div>
    <p className="subtle">Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Proposed windows are tentative.</p>
    <div className="calendar-days">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: month.getDay() }, (_, i) => <span key={`empty-${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
        const key = dayKey(date);
        const count = entriesOn(key).length;
        return <button key={key} className={`calendar-day${selected === key ? " selected" : ""}`} aria-pressed={selected === key} aria-label={`${date.toLocaleDateString(undefined, { dateStyle: "full" })}, ${count} time windows`} onClick={() => setSelected(key)}>
          <span>{i + 1}</span>{count > 0 && <small>{count}<span className="calendar-count-label"> scheduled</span></small>}
        </button>;
      })}
    </div>
    <div className="calendar-agenda" aria-live="polite">
      <h3>{new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })}</h3>
      {agenda.length ? agenda.map(({ session, slot, index, confirmed }) => <article className="calendar-event" key={`${session.id}-${index}`}>
        <div className="row-between"><Link href={`/sessions/${session.id}`}><strong>{session.title}</strong></Link><span className={`pill ${confirmed ? "" : "amber"}`}>{confirmed ? "Scheduled" : "Proposed"}</span></div>
        <p className="subtle">{session.course.code} · <LocalTime start={slot.start} end={slot.end} /></p>
      </article>) : <p className="subtle">No sessions on this day.</p>}
      <Link className="button secondary" href={`/sessions/new?date=${selected}`}>Create a session on this day</Link>
    </div>
  </section>;
}
