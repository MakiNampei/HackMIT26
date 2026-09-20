import { LocalTime } from "@/components/local-time";
import { CheckInButton } from "@/components/check-in-button";
import { ArrowRight, Clock3, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { SessionWithDetails } from "@/lib/domain/types";

export function SessionCard({ session, ended = false, userId }: { session: SessionWithDetails; ended?: boolean; userId?: string }) {
  return (
    <article className="card session-card">
      <div className="session-card-top">
        <span className="course-code">{session.course.code}</span>
        <span className={`pill ${!ended && session.status === "open" ? "amber" : ""}`}>
          {ended ? "Ended" : session.status.replaceAll("_", " ")}
        </span>
      </div>
      <div>
        <h3 style={{ fontSize: "1.15rem", marginBottom: "0.35rem" }}>{session.title}</h3>
        <p className="subtle" style={{ fontSize: "0.9rem" }}>{session.topic}</p>
      </div>
      <div className="session-meta">
        {session.confirmedSlot && <span className="meta-row"><Clock3 size={15} /><LocalTime start={session.confirmedSlot.start} end={session.confirmedSlot.end} /></span>}
        <span className="meta-row"><Clock3 size={15} /> {session.durationMinutes} minutes</span>
        <span className="meta-row"><Users size={15} /> {session.memberIds.length}/{session.maxPeople} students</span>
        <span className="meta-row"><MapPin size={15} /> {session.room?.building ?? "Room after matching"}</span>
      </div>
      <div className="row-between" style={{ marginTop: "auto" }}>
        {userId && session.memberIds.includes(userId) && session.confirmedSlot && (
          <CheckInButton key={`${session.id}-${userId}-${session.confirmedSlot.start}-${session.confirmedSlot.end}`} sessionId={session.id} startsAt={session.confirmedSlot.start} checkedInAt={session.checkIns?.[userId]} />
        )}
        <div className="avatars" aria-label="Session members">
          {session.members.slice(0, 4).map((member) => (
            <span className="avatar" key={member.id} title={member.name}>{member.initials}</span>
          ))}
        </div>
        <Link aria-label={`View ${session.title}`} href={`/sessions/${session.id}`}>
          <ArrowRight size={20} />
        </Link>
      </div>
    </article>
  );
}
