import type { Session } from "./types";

export type SessionReminder = { key: string; sessionId: string; title: string; phase: "start" | "end" };

export function dueSessionReminders(sessions: Session[], userId: string, since: number, now: number): SessionReminder[] {
  return sessions.flatMap(session => {
    if (!session.confirmedSlot || (session.creatorId !== userId && !session.memberIds.includes(userId))) return [];
    const start = Date.parse(session.confirmedSlot.start);
    const end = Date.parse(session.confirmedSlot.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    // If the browser slept through the whole session, only show its end.
    const phase = end > since && end <= now ? "end" : start > since && start <= now && now < end ? "start" : null;
    return phase ? [{ key: `${session.id}:${start}:${end}:${phase}`, sessionId: session.id, title: session.title, phase }] : [];
  });
}
