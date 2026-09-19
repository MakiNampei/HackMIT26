import { describe, expect, it } from "vitest";
import { recommendRoom } from "./room";

const rooms = [
  { id: "small", building: "A", name: "Small", capacity: 3, distanceMinutes: 1, bookingUrl: "#" },
  { id: "near", building: "B", name: "Near", capacity: 6, distanceMinutes: 3, bookingUrl: "#" },
  { id: "far", building: "C", name: "Far", capacity: 8, distanceMinutes: 8, bookingUrl: "#" },
];

describe("recommendRoom", () => {
  it("chooses the nearest room that can hold the whole group", () => {
    expect(recommendRoom(rooms, 4)?.id).toBe("near");
  });

  it("returns null when no room has enough capacity", () => {
    expect(recommendRoom(rooms, 12)).toBeNull();
  });
});

