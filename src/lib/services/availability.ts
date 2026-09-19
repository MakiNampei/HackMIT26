import type { AvailabilitySlot, BestTimeResult } from "@/lib/domain/types";

export function calculateBestOverlap(
  availabilityByUser: Record<string, AvailabilitySlot[]>,
  durationMinutes: number,
): BestTimeResult | null {
  const users = Object.keys(availabilityByUser);
  if (users.length === 0) return null;

  const durationMs = durationMinutes * 60_000;
  const candidateStarts = new Set<number>();

  for (const slots of Object.values(availabilityByUser)) {
    for (const slot of slots) {
      const start = new Date(slot.start).getTime();
      const end = new Date(slot.end).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end - start >= durationMs) {
        candidateStarts.add(start);
        candidateStarts.add(end - durationMs);
      }
    }
  }

  const candidates = [...candidateStarts]
    .sort((a, b) => a - b)
    .map((start) => {
      const end = start + durationMs;
      const availableCount = users.filter((userId) =>
        availabilityByUser[userId].some((slot) => {
          const slotStart = new Date(slot.start).getTime();
          const slotEnd = new Date(slot.end).getTime();
          return slotStart <= start && slotEnd >= end;
        }),
      ).length;

      return { start, end, availableCount };
    })
    .filter((candidate) => candidate.availableCount > 0)
    .sort((a, b) => b.availableCount - a.availableCount || a.start - b.start);

  const best = candidates[0];
  if (!best) return null;

  return {
    start: new Date(best.start).toISOString(),
    end: new Date(best.end).toISOString(),
    availableCount: best.availableCount,
    totalCount: users.length,
  };
}
