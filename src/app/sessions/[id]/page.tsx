import { Check, Clock3, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinButton } from "@/components/join-button";
import { PolicyCard } from "@/components/policy-card";
import { repository } from "@/lib/data/repository";

const steps = ["Group formed", "Time matched", "Policy verified", "Room selected", "Confirmed"];

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  const completed = session.status === "confirmed" ? 5 : session.status === "room_selected" ? 4 : session.status === "policy_verified" ? 3 : session.status === "time_matched" ? 2 : session.status === "group_formed" ? 1 : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{session.course.code} · {session.type.replaceAll("_", " ")}</p>
          <h1>{session.title}</h1>
          <p className="subtle">{session.topic}</p>
        </div>
        <JoinButton sessionId={session.id} />
      </header>

      <div className="detail-layout">
        <div className="grid">
          <section className="card">
            <div className="row-between">
              <div>
                <p className="eyebrow">Coordinator proposal</p>
                <h2>Tuesday at 7:00 PM</h2>
              </div>
              <span className="pill">4 of 4 available</span>
            </div>
            <div className="grid three" style={{ marginTop: "1rem" }}>
              <span className="meta-row"><Clock3 size={17} /> 90 minutes</span>
              <span className="meta-row"><Users size={17} /> {session.members.length} students</span>
              <span className="meta-row"><MapPin size={17} /> {session.room?.building ?? "TBD"}</span>
            </div>
            <div className="row-between" style={{ marginTop: "1.2rem" }}>
              <div className="avatars">
                {session.members.map((member) => <span className="avatar" key={member.id} title={member.name}>{member.initials}</span>)}
              </div>
              <Link className="button secondary" href={`/sessions/${session.id}/availability`}>Edit availability</Link>
            </div>
          </section>
          {session.policy && <PolicyCard policy={session.policy} />}
        </div>

        <aside className="grid" style={{ alignContent: "start" }}>
          <section className="card">
            <p className="eyebrow">Progress</p>
            <h2>Session checklist</h2>
            <ol className="timeline">
              {steps.map((step, index) => (
                <li className={index < completed ? "done" : ""} key={step}>
                  <span className="timeline-dot">{index < completed ? <Check size={14} /> : index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          {session.room && (
            <section className="card">
              <p className="eyebrow">Recommended room</p>
              <h2>{session.room.name}</h2>
              <p className="subtle">{session.room.building} · capacity {session.room.capacity} · {session.room.distanceMinutes} min away</p>
              <Link className="button" href={`/sessions/${session.id}/confirmed`}>Review and confirm</Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
