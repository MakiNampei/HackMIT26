import type { AvailabilitySlot, BestTimeResult } from "@/lib/domain/types";

export function calculateBestOverlap(
  availabilityByUser: Record<string, AvailabilitySlot[]>,
  durationMinutes: number,
  minimumPeople = 1,
): BestTimeResult | null {
  const users = Object.keys(availabilityByUser);
  if (users.length === 0) return null;

  const durationMs = durationMinutes * 60_000;
  const quarterHourMs = 15 * 60_000;
  const validSlots = Object.values(availabilityByUser)
    .flat()
    .map((slot) => ({ start: new Date(slot.start).getTime(), end: new Date(slot.end).getTime() }))
    .filter((slot) => Number.isFinite(slot.start) && Number.isFinite(slot.end));
  if (validSlots.length === 0) return null;

  // Attendance can only improve when a new availability window starts.
  // Evaluate those boundaries instead of iterating through potentially years of empty time.
  const candidates = [...new Set(validSlots.map((slot) => Math.ceil(slot.start / quarterHourMs) * quarterHourMs))].sort((a, b) => a - b);
  let best: { start: number; end: number; availableCount: number } | null = null;

  for (const cursor of candidates) {
    const end = cursor + durationMs;
    const availableCount = users.filter((userId) =>
      availabilityByUser[userId].some((slot) => {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();
        return slotStart <= cursor && slotEnd >= end;
      }),
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
