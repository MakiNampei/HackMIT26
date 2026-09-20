import { SessionChat } from "@/components/session-chat";
import { SessionGroupPlan } from "@/components/session-group-plan";
import { LocalTime } from "@/components/local-time";
import { requireUser } from "@/lib/auth/server";
import { Check, Clock3, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinButton } from "@/components/join-button";
import { PolicyCard } from "@/components/policy-card";
import { SessionCapacityForm } from "@/components/session-capacity-form";
import { repository } from "@/lib/data/repository";

const steps = ["Group formed", "Time matched", "Policy verified", "Room selected", "Confirmed"];

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  const completed = session.status === "confirmed" ? 5 : session.status === "room_selected" ? 4 : session.status === "policy_verified" ? 3 : session.status === "time_matched" ? 2 : session.status === "group_formed" ? 1 : 0;

  return (
    <>
      <Link className="back-link" href="/dashboard">← Back to sessions</Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{session.course.code} · {session.type.replaceAll("_", " ")}</p>
          <h1>{session.title}</h1>
          <p className="subtle">{session.topic}</p>
        </div>
        <div className="page-actions">
          {session.memberIds.includes(user.id) ? <>
            <Link className="button" href={`/sessions/${session.id}/availability`}>Set my availability</Link>
            <details className="more-menu"><summary>More</summary><JoinButton key="member" sessionId={session.id} isMember /></details>
          </> : <JoinButton sessionId={session.id} />}
        </div>
      </header>

      <div className="detail-layout">
        <div className="grid">
          <section className="card">
            <div className="row-between">
              <div>
                <p className="eyebrow">Session plan</p>
                <h2>{session.confirmedSlot ? <LocalTime start={session.confirmedSlot.start} end={session.confirmedSlot.end} /> : "Time to be matched"}</h2>
              </div>
              <span className={`pill ${session.memberIds.length < session.minPeople ? "amber" : ""}`}>{session.memberIds.length >= session.minPeople ? "Minimum reached" : `${session.minPeople - session.memberIds.length} more needed`}</span>
            </div>
            <div className="grid three" style={{ marginTop: "1rem" }}>
              <span className="meta-row"><Clock3 size={17} /> {session.durationMinutes} minutes</span>
              <span className="meta-row"><Users size={17} /> {session.memberIds.length}/{session.maxPeople} students · minimum {session.minPeople}</span>
              <span className="meta-row"><MapPin size={17} /> {session.room?.building ?? "Location pending"}</span>
            </div>
            <div className="row-between" style={{ marginTop: "1.2rem" }}>
              <div className="avatars">
                {session.members.map((member) => <span className="avatar" key={member.id} title={member.name}>{member.initials}</span>)}
              </div>
              <span className="subtle">{session.memberIds.length} joined</span>
            </div>
          </section>
          {(session.type === "study" || session.type === "exam_review") && (
            <SessionChat key={`chat-${session.id}`} sessionId={session.id} topic={session.topic} examReview={session.type === "exam_review"} isMember={session.memberIds.includes(user.id)} />
          )}
          {session.policy && <PolicyCard policy={session.policy} />}
          <SessionGroupPlan key={`group-plan-${session.id}`} sessionId={session.id} isMember={session.memberIds.includes(user.id)} />
        </div>

        <aside className="grid" style={{ alignContent: "start" }}>
          {session.creatorId === user.id && (
            <details className="card management-panel"><summary>Manage group size</summary><SessionCapacityForm sessionId={session.id} minPeople={session.minPeople} maxPeople={session.maxPeople} memberCount={session.memberIds.length} /></details>
          )}
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
              <Link className="button" href={`/sessions/${session.id}/confirmed`}>View session status</Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
