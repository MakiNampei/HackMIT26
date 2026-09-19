"use client";
import { useState } from "react";
import type { SessionWithDetails } from "@/lib/domain/types";
import { SessionCard } from "@/components/session-card";
export function SessionBrowser({ sessions, userId }: { sessions: SessionWithDetails[]; userId: string }) {
  const [view, setView] = useState("mine");
  const visible = sessions.filter(session => {
    const mine = session.creatorId === userId || session.memberIds.includes(userId);
    return view === "mine" ? mine : !mine;
  });
  return <>
    <div className="session-tabs" role="group" aria-label="Filter sessions">
      <button className={view === "mine" ? "button" : "button secondary"} aria-pressed={view === "mine"} onClick={() => setView("mine")}>My sessions</button>
      <button className={view === "discover" ? "button" : "button secondary"} aria-pressed={view === "discover"} onClick={() => setView("discover")}>Discover sessions</button>
    </div>
    <div className="grid two">{visible.map(session => <div className="grid" key={session.id}>{view === "mine" && <span className="subtle">{session.creatorId === userId ? "You organize this session" : "You have joined"}</span>}<SessionCard session={session} /></div>)}</div>
    {!visible.length && <p className="notice">{view === "mine" ? "No sessions yet. Discover a group to join or create your own." : "No other sessions available yet. You can create a new group."}</p>}
  </>;
}
