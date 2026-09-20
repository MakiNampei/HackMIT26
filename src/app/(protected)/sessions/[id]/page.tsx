import { ConfirmSessionButton } from "@/components/confirm-session-button";
import { RoomPicker } from "@/components/room-picker";
import { canMatchTime, sessionChecklist } from "@/lib/domain/policy-workflow";
import { SessionProgressRefresh } from "@/components/session-progress-refresh";
import { CheckInButton } from "@/components/check-in-button";
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



export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  const isMember = session.memberIds.includes(user.id);
  const memberAvailability = isMember ? await Promise.all(session.members.map(async member => ({
    member,
    slots: (await repository.getAvailability(id, member.id)).slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
  }))) : [];

  const steps = sessionChecklist(session);

  return (
    <>
      {isMember && <SessionProgressRefresh />}
      <Link className="back-link" href="/dashboard">← Back to sessions</Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{session.course.code} · {session.type.replaceAll("_", " ")}</p>
          <h1>{session.title}</h1>
          <p className="subtle">{session.topic}</p>
        </div>
        <div className="page-actions">
          {session.memberIds.includes(user.id) ? <>
            {session.confirmedSlot && <CheckInButton key={`${session.id}-${user.id}`} sessionId={session.id} startsAt={session.confirmedSlot.start} checkedInAt={session.checkIns?.[user.id]} />}
            {session.confirmedSlot && <a className="button secondary" href="#choose-room">{session.roomId ? "Change room" : "Choose a room"}</a>}
            <Link className="button" href={`/sessions/${session.id}/availability`}>Set my availability</Link>
            <details className="more-menu"><summary>More</summary><JoinButton key="member" sessionId={session.id} isMember /></details>
          </> : <JoinButton sessionId={session.id} />}
        </div>
      </header>

      <div className="detail-layout">
        <div className="grid">
          {session.type === "assignment" && session.coursePolicyConfirmed && <section className="card" aria-label="Course policy status">
            <strong>Course policy confirmed</strong>
            <p className="subtle">You have reviewed and saved this policy on the course page. No additional policy confirmation is needed here.</p>
            {!canMatchTime(session) && <p className="notice">Time matching is paused: the policy does not clearly permit collaboration for this assignment. Individual and group assignments may have different rules; check the instructions for this specific assignment or ask your instructor.</p>}
            <Link className="button secondary" href={`/courses/${session.courseId}`}>View course policy</Link>
          </section>}
          {session.type === "assignment" && (session.policy ? <PolicyCard policy={session.policy} /> : <section className="card"><h2>Course policy pending</h2><p className="subtle">Complete policy setup on the course page before assignment time matching.</p><Link className="button secondary" href={`/courses/${session.courseId}`}>View course</Link></section>)}
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
          {isMember && (
            <section className="card" aria-labelledby="member-availability-heading">
              <div className="row-between">
                <div>
                  <p className="eyebrow">Group schedule</p>
                  <h2 id="member-availability-heading">Everyone’s availability</h2>
                </div>
                <span className="pill">{memberAvailability.filter(({ slots }) => slots.length > 0).length}/{session.members.length} submitted</span>
              </div>
              <p className="subtle">All available windows, shown in your local time zone.</p>
              <ul className="member-availability-list">
                {memberAvailability.map(({ member, slots }) => (
                  <li className="member-availability-row" key={member.id}>
                    <div className="meta-row">
                      <span className="avatar" aria-hidden="true">{member.initials}</span>
                      <strong>{member.name}{member.id === user.id ? " (you)" : ""}</strong>
                    </div>
                    {slots.length ? (
                      <ul className="member-availability-windows">
                        {slots.map((slot, index) => <li key={`${slot.start}-${slot.end}-${index}`}><LocalTime start={slot.start} end={slot.end} /></li>)}
                      </ul>
                    ) : <p className="subtle member-availability-empty">Not submitted yet</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {isMember && session.confirmedSlot && canMatchTime(session) && <RoomPicker sessionId={id} maxPeople={session.maxPeople} selectedRoomId={session.roomId} isCreator={session.creatorId === user.id} />}
          {(session.type === "study" || session.type === "exam_review") && (
            <SessionChat key={`chat-${session.id}`} sessionId={session.id} topic={session.topic} examReview={session.type === "exam_review"} isMember={session.memberIds.includes(user.id)} />
          )}
          {session.type !== "assignment" && session.policy && <PolicyCard policy={session.policy} />}
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
                <li className={step.done ? "done" : ""} key={step.label}>
                  <span className="timeline-dot">{step.done ? <Check size={14} /> : index + 1}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </section>
          {session.room && (
            <section className="card">
              <p className="eyebrow">Selected room{session.room.isDemo ? " · Demo" : ""}</p>
              <h2>{session.room.name}</h2>
              <p className="subtle">{session.room.building} · capacity {session.room.capacity} · {session.room.distanceMinutes} min away</p>
              {session.status !== "confirmed" && session.confirmedSlot && (session.creatorId === user.id ? <ConfirmSessionButton sessionId={id} start={session.confirmedSlot.start} end={session.confirmedSlot.end} roomId={session.room.id} isDemo={session.room.isDemo} /> : <p className="notice">Waiting for the session creator to confirm the time and room.</p>)}
              <Link className="button secondary" href={`/sessions/${session.id}/confirmed`}>{session.status === "confirmed" ? "View confirmed session" : "View session status"}</Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
