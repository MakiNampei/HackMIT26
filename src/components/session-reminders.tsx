"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@/lib/domain/types";
import { dueSessionReminders, type SessionReminder } from "@/lib/domain/session-reminders";

export function SessionReminders({ userId }: { userId: string }) {
  const [reminders, setReminders] = useState<SessionReminder[]>([]);

  useEffect(() => {
    let active = true;
    let sessions: Session[] = [];
    let loaded = false;
    let lastRefresh = Date.now() - 1;
    let since = Date.now() - 1;
    let pending = false;
    const controller = new AbortController();
    const seen = new Set<string>();
    const storageKey = `studysync:reminders:${userId}`;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) saved.filter((key): key is string => typeof key === "string").forEach(key => seen.add(key));
    } catch { /* Reminders also work when browser storage is unavailable. */ }

    function check() {
      if (!active || !loaded) return;
      const now = Date.now();
      const due = dueSessionReminders(sessions, userId, since, now).filter(item => !seen.has(item.key));
      since = now;
      if (!due.length) return;
      due.forEach(item => seen.add(item.key));
      try { sessionStorage.setItem(storageKey, JSON.stringify([...seen].slice(-200))); } catch { /* Keep in-memory deduplication. */ }
      setReminders(previous => [...previous, ...due]);
    }

    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch("/api/sessions", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json();
        if (active && Array.isArray(payload.data)) {
          sessions = payload.data;
          loaded = true;
          since = Math.min(since, lastRefresh);
          lastRefresh = Date.now();
          check();
        }
      } catch { /* Retry on the next refresh after a temporary connection failure. */ }
      finally { pending = false; }
    }
    function resume() { if (document.visibilityState === "visible") void refresh(); }
    void refresh();
    const tick = window.setInterval(check, 1000);
    const poll = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(tick);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [userId]);

  return <aside className="session-reminders" aria-label="Session reminders" aria-live="polite" aria-relevant="additions">
    {reminders.map(reminder => <div className="card session-reminder" key={reminder.key}>
      <strong>{reminder.phase === "start" ? "Your session is starting" : "Your session has ended"}</strong>
      <p>{reminder.title}</p>
      <div className="row-between">
        <Link href={`/sessions/${reminder.sessionId}`}>View session</Link>
        <button className="button secondary" onClick={() => setReminders(items => items.filter(item => item.key !== reminder.key))} aria-label={`Dismiss reminder for ${reminder.title}`}>Dismiss</button>
      </div>
    </div>)}
  </aside>;
}
