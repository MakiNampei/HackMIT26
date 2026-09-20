import { LocalTime } from "@/components/local-time";
import { requireUser } from "@/lib/auth/server";
import { CalendarCheck, Check, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";

export default async function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  const confirmed = session.status === "confirmed" && !!session.confirmedSlot && !!session.room;

  return (
    <section className="card" style={{ margin: "6vh auto", maxWidth: 760, padding: "clamp(1.4rem, 5vw, 3.5rem)", textAlign: "center" }}>
      <span className="metric-icon" style={{ background: "#176b4d", color: "white", margin: "0 auto 1.1rem", height: 58, width: 58 }}>{confirmed ? <Check size={28} /> : <CalendarCheck size={28} />}</span>
      <p className="eyebrow">Session status</p>
      <h1>{confirmed ? "Study session confirmed" : "Your session is still being arranged"}</h1>
      <p className="subtle" style={{ margin: "0 auto 2rem", maxWidth: 550 }}>
        {confirmed ? "Your time and meeting place are confirmed. Review the course collaboration rules before you meet." : "This session is not confirmed yet. Return to the activity to check its progress and update your availability."}
      </p>
      <div className="grid three" style={{ textAlign: "left" }}>
        <div className="policy-box"><CalendarCheck size={20} /><br /><strong>{session.confirmedSlot ? <LocalTime start={session.confirmedSlot.start} end={session.confirmedSlot.end} /> : "Time pending"}</strong><br /><span className="subtle">{session.durationMinutes} minutes</span></div>
        <div className="policy-box"><Users size={20} /><br /><strong>{session.members.length} classmates</strong><br /><span className="subtle">{session.memberIds.length >= session.minPeople ? "Minimum group size reached" : "Waiting for members"}</span></div>
        <div className="policy-box"><MapPin size={20} /><br /><strong>{session.room?.name ?? "Room TBD"}</strong><br /><span className="subtle">{session.room?.building}</span></div>
      </div>
      <div className="notice" style={{ margin: "1.4rem 0" }}>
        Each student must follow the instructor&apos;s collaboration policy and submit independent work unless explicitly permitted.
      </div>
      <Link className="button" href={`/sessions/${session.id}`}>Back to session</Link>
    </section>
  );
}
