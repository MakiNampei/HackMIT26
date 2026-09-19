import type { Room } from "@/lib/domain/types";

export function recommendRoom(rooms: Room[], groupSize: number): Room | null {
  return (
    rooms
      .filter((room) => room.capacity >= groupSize)
      .sort(
        (left, right) =>
          left.distanceMinutes - right.distanceMinutes ||
          left.capacity - right.capacity ||
          left.name.localeCompare(right.name),
      )[0] ?? null
  );
}

