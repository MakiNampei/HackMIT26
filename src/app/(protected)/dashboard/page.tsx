import { requireUser } from "@/lib/auth/server";
import { ArrowRight, CalendarCheck, ListTodo, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { SessionBrowser } from "@/components/session-browser";
import { repository } from "@/lib/data/repository";

export default async function DashboardPage() {
  const user = await requireUser();
  await connection();
  const sessions = await repository.listSessions();
  // This server component reads the request time after awaiting connection().
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const myActiveSessions = sessions.filter((session) =>
    (session.creatorId === user.id || session.memberIds.includes(user.id)) &&
    (!session.confirmedSlot || Date.parse(session.confirmedSlot.end) > now),
  );
  const awaitingSchedule = myActiveSessions.filter((session) => !session.confirmedSlot);
  const upcomingMeetups = myActiveSessions.filter((session) =>
    session.confirmedSlot && Date.parse(session.confirmedSlot.start) > now,
  );

  return (
    <>
      <section className="banner">
        <div>
          <p className="eyebrow" style={{ color: "#f1ca72" }}>Welcome, {user.user_metadata.display_name || "Student"}</p>
          <h1>Your study plans</h1>
          <p>Pick up your next session or find a group to join.</p>
        </div>
        <Link className="button" href="/sessions/new" style={{ background: "#f1ca72", color: "#123b2d", zIndex: 1 }}>
          Create a session <ArrowRight size={17} />
        </Link>
      </section>

      <section className="grid three" aria-label="StudySync overview">
        <div className="card metric-card">
          <span className="metric-icon"><Users size={21} /></span>
          <span><strong className="metric-value">{myActiveSessions.length}</strong><span className="subtle">My active sessions</span></span>
        </div>
        <div className="card metric-card">
          <span className="metric-icon"><ListTodo size={21} /></span>
          <span><strong className="metric-value">{awaitingSchedule.length}</strong><span className="subtle">Awaiting scheduling</span></span>
        </div>
        <div className="card metric-card">
          <span className="metric-icon"><CalendarCheck size={21} /></span>
          <span><strong className="metric-value">{upcomingMeetups.length}</strong><span className="subtle">Upcoming meetups</span></span>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your campus</p>
            <h2>Study sessions</h2>
          </div>
          <span className="subtle"><Sparkles size={15} style={{ verticalAlign: "middle" }} /> AI coordinated</span>
        </div>
        <SessionBrowser sessions={sessions} userId={user.id} />
      </section>
    </>
  );
}
