"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { demoRooms } from "@/lib/data/demo-rooms";

export function RoomPicker({ sessionId, maxPeople, selectedRoomId, isCreator }: { sessionId: string; maxPeople: number; selectedRoomId?: string; isCreator: boolean }) {
  const router = useRouter();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const selectedRoom = demoRooms.find(room => room.id === selectedRoomId);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function select(roomId: string) {
    setPending(roomId); setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/room`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (disclosure.current) disclosure.current.open = false;
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { setPending(null); }
  }
  return <details ref={disclosure} className="card room-picker-disclosure" id="choose-room">
    <summary><span><strong>{selectedRoom ? `Selected: ${selectedRoom.name}` : "Choose a room"}</strong><span className="subtle room-picker-summary">{selectedRoom ? "View or change room" : "Browse 10 demo rooms"}</span></span></summary>
    <p className="subtle">Simulated rooms and facilities. Selection does not make a real reservation. Rooms must fit your maximum group size of {maxPeople}.</p>
    {!isCreator && <p className="notice">The session creator chooses the room. Everyone can browse the options below.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="grid two">
      {demoRooms.map(room => {
        const selected = selectedRoomId === room.id;
        const fits = room.capacity >= maxPeople;
        return <article key={room.id} className="policy-box">
          <div className="row-between"><h3>{room.name}</h3><span className={`pill ${fits ? "" : "amber"}`}>{room.capacity} people</span></div>
          <ul>{room.facilities?.map(facility => <li key={facility}>{facility}</li>)}</ul>
          {selected ? <p className="notice" role="status">Selected for this session</p> : !fits ? <p className="subtle">Too small for this group</p> : isCreator ? <button type="button" disabled={pending !== null} onClick={() => void select(room.id)}>{pending === room.id ? "Saving…" : `Select ${room.name}`}</button> : <p className="subtle">Fits your group</p>}
        </article>;
      })}
    </div>
  </details>;
}
