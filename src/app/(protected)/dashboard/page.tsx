import { requireUser } from "@/lib/auth/server";
import { ArrowRight, CalendarCheck, Flag, ListTodo, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { SessionBrowser } from "@/components/session-browser";
import { SessionCard } from "@/components/session-card";
import { repository } from "@/lib/data/repository";

export default async function DashboardPage() {
  const user = await requireUser();
  await connection();
  const [sessions, goals] = await Promise.all([
    repository.listSessions(),
    repository.listGoals(user.id),
  ]);
  // This server component reads the request time after awaiting connection().
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const activeSessions = sessions.filter((session) =>
    !session.confirmedSlot || Date.parse(session.confirmedSlot.end) > now,
  );
  const myActiveSessions = activeSessions.filter((session) =>
    session.creatorId === user.id || session.memberIds.includes(user.id),
  );
  const pastSessions = sessions.filter((session) =>
    (session.creatorId === user.id || session.memberIds.includes(user.id)) &&
    session.confirmedSlot && Date.parse(session.confirmedSlot.end) <= now,
  ).sort((a, b) => Date.parse(b.confirmedSlot!.end) - Date.parse(a.confirmedSlot!.end));
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

      <section aria-labelledby="goals-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optional · Keep the bigger picture</p>
            <h2 id="goals-heading">My long-term goals</h2>
          </div>
          <Link className="button secondary" href="/goals/new"><Flag size={17} /> New goal</Link>
        </div>
        {goals.length ? <div className="grid two">
          {goals.map((goal) => {
            const linkedSessions = sessions.filter((session) => session.goalId === goal.id).length;
            return <Link className="card goal-card" href={`/goals/${goal.id}`} key={goal.id}>
              <div className="row-between"><span className="pill">{goal.type}</span><span className="subtle">Due {goal.targetDate}</span></div>
              <h3>{goal.title}</h3>
              <p className="subtle">{goal.description}</p>
              <div className="row-between"><span className="subtle">{linkedSessions} linked {linkedSessions === 1 ? "session" : "sessions"}</span><strong>Continue goal →</strong></div>
            </Link>;
          })}
        </div> : <div className="card goal-empty">
          <div><h3>Working toward something bigger?</h3><p className="subtle">Save one goal, then use it to start focused sessions without planning from scratch.</p></div>
          <Link className="button" href="/goals/new">Create a goal <ArrowRight size={17} /></Link>
        </div>}
      </section>

      <section className="card" aria-labelledby="voice-practice-heading" style={{ marginTop: '1.5rem' }}>
        <p className="eyebrow">Speak to learn · Deepgram</p>
        <h2 id="voice-practice-heading">Voice practice</h2>
        <p>Practice English conversation or explain any subject aloud with an AI study partner.</p>
        <Link className="button secondary" href="/courses">Choose a course for voice practice <ArrowRight size={17} /></Link>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your campus</p>
            <h2>Study sessions</h2>
          </div>
          <span className="subtle"><Sparkles size={15} style={{ verticalAlign: "middle" }} /> AI coordinated</span>
        </div>
        <SessionBrowser sessions={activeSessions} userId={user.id} />
      </section>

      <section aria-labelledby="past-sessions-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your history</p>
            <h2 id="past-sessions-heading">Past sessions</h2>
            <p className="subtle">Sessions you organized or joined that have ended, most recent first.</p>
          </div>
          <Link className="button secondary" href="/history">View history ({pastSessions.length}) <ArrowRight size={17} /></Link>
        </div>
        {pastSessions.length ? (
          <div className="grid two">
            {pastSessions.map((session) => (
              <div className="grid" key={session.id}>
                <span className="subtle">{session.creatorId === user.id ? "You organized this session" : "You joined this session"}</span>
                <SessionCard session={session} ended userId={user.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="notice">No past sessions yet. Sessions you organize or join will appear here after they end.</p>
        )}
      </section>
    </>
  );
}
