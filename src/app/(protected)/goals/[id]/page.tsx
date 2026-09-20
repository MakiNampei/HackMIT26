import { requireUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { ArrowRight, CalendarDays, Clock3, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const goal = await repository.getGoal(id, user.id);
  if (!goal) notFound();
  const [courses, sessions] = await Promise.all([
    repository.listCourses(),
    repository.listSessions({ goalId: goal.id }),
  ]);
  const course = courses.find((item) => item.id === goal.courseId);
  const target = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(`${goal.targetDate}T00:00:00Z`));

  return <>
    <Link className="back-link" href="/dashboard">← Back to dashboard</Link>
    <header className="page-header">
      <div>
        <p className="eyebrow">{course?.code ?? "Course"} · {goal.type}</p>
        <h1>{goal.title}</h1>
        <p className="subtle">{goal.description}</p>
      </div>
      <Link className="button" href={`/sessions/new?goalId=${goal.id}`}>Start a session <ArrowRight size={17} /></Link>
    </header>

    <section className="grid three" aria-label="Goal overview">
      <div className="card metric-card"><span className="metric-icon"><CalendarDays size={21} /></span><span><strong className="metric-value">{target}</strong><span className="subtle">Target date</span></span></div>
      <div className="card metric-card"><span className="metric-icon"><Clock3 size={21} /></span><span><strong className="metric-value">{goal.durationMinutes} min</strong><span className="subtle">Typical session</span></span></div>
      <div className="card metric-card"><span className="metric-icon"><History size={21} /></span><span><strong className="metric-value">{sessions.length}</strong><span className="subtle">Linked sessions</span></span></div>
    </section>

    <section className="card" style={{ marginTop: "1.5rem" }}>
      <p className="eyebrow">Choose today&apos;s focus</p>
      <h2>Start wherever makes sense today</h2>
      <p className="subtle">Your goal gives the next session context, but it does not lock you to the last session. The session form is prefilled and everything remains editable.</p>
      <Link className="button" href={`/sessions/new?goalId=${goal.id}`}>{sessions.length ? "Start another session" : "Start the first session"} <ArrowRight size={17} /></Link>
    </section>

    <section style={{ marginTop: "1.5rem" }}>
      <div className="section-heading"><div><p className="eyebrow">Optional context</p><h2>Sessions in this goal</h2></div></div>
      {sessions.length ? <div className="grid two">{sessions.map((session) => <Link className="card" href={`/sessions/${session.id}`} key={session.id}><span className="pill">{session.type.replaceAll("_", " ")}</span><h3 style={{ margin: "0.9rem 0 0.35rem" }}>{session.title}</h3><p className="subtle">{session.topic}</p><strong>View session →</strong></Link>)}</div> : <p className="notice">No sessions yet. Start one when you are ready.</p>}
    </section>
  </>;
}
