import type { AvailabilitySlot, BestTimeResult, Session } from "@/lib/domain/types";

export function calculateBestOverlap(
  availabilityByUser: Record<string, AvailabilitySlot[]>,
  durationMinutes: number,
  minimumPeople = 1,
): BestTimeResult | null {
  const users = Object.keys(availabilityByUser);
  if (users.length === 0) return null;

  const durationMs = durationMinutes * 60_000;
  const quarterHourMs = 15 * 60_000;
  // Each person's windows describe a union of time intervals. Normalize that
  // union before checking whether a complete meeting fits within it.
  const mergedByUser = Object.fromEntries(users.map(userId => {
    const windows = availabilityByUser[userId]
      .map(slot => ({ start: Date.parse(slot.start), end: Date.parse(slot.end) }))
      .filter(slot => Number.isFinite(slot.start) && Number.isFinite(slot.end) && slot.end > slot.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const merged: { start: number; end: number }[] = [];
    for (const slot of windows) {
      const previous = merged[merged.length - 1];
      if (previous && slot.start <= previous.end) previous.end = Math.max(previous.end, slot.end);
      else merged.push({ ...slot });
    }
    return [userId, merged];
  }));
  const validSlots = Object.values(mergedByUser).flat();
  if (validSlots.length === 0) return null;

  // Attendance can only improve when a new availability window starts.
  // Evaluate those boundaries instead of iterating through potentially years of empty time.
  const candidates = [...new Set(validSlots.map((slot) => Math.ceil(slot.start / quarterHourMs) * quarterHourMs))].sort((a, b) => a - b);
  let best: { start: number; end: number; availableCount: number } | null = null;

  for (const cursor of candidates) {
    const end = cursor + durationMs;
    const availableCount = users.filter((userId) =>
      mergedByUser[userId].some(slot => slot.start <= cursor && slot.end >= end),
    ).length;

    if (availableCount >= minimumPeople && (!best || availableCount > best.availableCount)) {
      best = { start: cursor, end, availableCount };
    }
  }

  if (!best) return null;

  return {
    start: new Date(best.start).toISOString(),
    end: new Date(best.end).toISOString(),
    availableCount: best.availableCount,
    totalCount: users.length,
  };
}

// Keep later progress only while the selected time is unchanged.
export function matchedSessionState(session: Session, result: BestTimeResult | null): Pick<Session, "status" | "confirmedSlot" | "roomId"> {
  if (result && session.confirmedSlot && Date.parse(session.confirmedSlot.start) === Date.parse(result.start) && Date.parse(session.confirmedSlot.end) === Date.parse(result.end)) {
    return { status: session.status === "open" || session.status === "group_formed" ? "time_matched" : session.status, confirmedSlot: session.confirmedSlot, roomId: session.roomId };
  }
  return {
    status: result ? "time_matched" : session.memberIds.length >= session.minPeople ? "group_formed" : "open",
    confirmedSlot: result ? { start: result.start, end: result.end } : undefined,
    roomId: undefined,
  };
}
