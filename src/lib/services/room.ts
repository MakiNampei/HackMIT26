import { canMatchTime } from "@/lib/domain/policy-workflow";
import type { SessionWithDetails, Room } from "@/lib/domain/types";

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


export function validateRoomSelection(session: SessionWithDetails | null, userId: string, room: Room | undefined) {
  if (!session) throw new Error("session_not_found");
  if (session.creatorId !== userId || !session.memberIds.includes(userId)) throw new Error("creator_only");
  if (!session.confirmedSlot || !canMatchTime(session)) throw new Error("time_not_matched");
  if (session.memberIds.length < session.minPeople) throw new Error("group_not_formed");
  if (!room) throw new Error("room_not_found");
  if (room.capacity < session.maxPeople) throw new Error("room_too_small");
}

export function validateSessionConfirmation(session: SessionWithDetails | null, userId: string, expected: { start: string; end: string; roomId: string }) {
  validateRoomSelection(session, userId, session?.room);
  if (session!.roomId !== expected.roomId || Date.parse(session!.confirmedSlot!.start) !== Date.parse(expected.start) || Date.parse(session!.confirmedSlot!.end) !== Date.parse(expected.end)) throw new Error("session_changed");
}
