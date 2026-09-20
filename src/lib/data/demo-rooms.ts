import type { Room } from "@/lib/domain/types";

export const demoRooms: Room[] = [
  { capacity: 2, facilities: ["Whiteboard", "Power outlets"] },
  { capacity: 4, facilities: ["Whiteboard", "Monitor", "HDMI"] },
  { capacity: 4, facilities: ["Quiet space", "Power outlets"] },
  { capacity: 6, facilities: ["Projector", "Whiteboard", "HDMI"] },
  { capacity: 6, facilities: ["Monitor", "Video conferencing", "Power outlets"] },
  { capacity: 8, facilities: ["Two whiteboards", "Movable tables", "Power outlets"] },
  { capacity: 8, facilities: ["Projector", "Speakers", "HDMI"] },
  { capacity: 10, facilities: ["Monitor", "Video conferencing", "Whiteboard"] },
  { capacity: 12, facilities: ["Projector", "Movable tables", "Wheelchair access"] },
  { capacity: 20, facilities: ["Projector", "Speakers", "Whiteboard", "Wheelchair access"] },
].map((room, i) => ({ ...room, id: `demo-room-${i + 1}`, name: `Room ${i + 1}`, building: "Demo study center", distanceMinutes: 2 + Math.floor(i / 2), bookingUrl: "", isDemo: true }));
