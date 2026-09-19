import { CalendarCheck, Check, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";

export default async function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  return (
    <section className="card" style={{ margin: "6vh auto", maxWidth: 760, padding: "clamp(1.4rem, 5vw, 3.5rem)", textAlign: "center" }}>
      <span className="metric-icon" style={{ background: "#176b4d", color: "white", margin: "0 auto 1.1rem", height: 58, width: 58 }}><Check size={28} /></span>
      <p className="eyebrow">Ready to learn together</p>
      <h1>Study session confirmed</h1>
      <p className="subtle" style={{ margin: "0 auto 2rem", maxWidth: 550 }}>
        Everyone has a shared time, a policy-safe plan, and a place to meet.
      </p>
      <div className="grid three" style={{ textAlign: "left" }}>
        <div className="policy-box"><CalendarCheck size={20} /><br /><strong>Tuesday, 7:00 PM</strong><br /><span className="subtle">90 minutes</span></div>
        <div className="policy-box"><Users size={20} /><br /><strong>{session.members.length} classmates</strong><br /><span className="subtle">Group formed</span></div>
        <div className="policy-box"><MapPin size={20} /><br /><strong>{session.room?.name ?? "Room TBD"}</strong><br /><span className="subtle">{session.room?.building}</span></div>
      </div>
      <div className="notice" style={{ margin: "1.4rem 0" }}>
        Each student must follow the instructor&apos;s collaboration policy and submit independent work unless explicitly permitted.
      </div>
      <Link className="button" href="/dashboard">Return to dashboard</Link>
    </section>
  );
}
