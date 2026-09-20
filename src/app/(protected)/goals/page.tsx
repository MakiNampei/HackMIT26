import { requireUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export default async function GoalsPage() {
  const user = await requireUser();
  await connection();
  const [goals, courses, sessions] = await Promise.all([
    repository.listGoals(user.id),
    repository.listCourses(),
    repository.listSessions(),
  ]);

  return <>
    <header className="page-header">
      <div>
        <p className="eyebrow">Your bigger picture</p>
        <h1>Goals</h1>
        <p className="subtle">Keep long-term outcomes in one place and start a focused session whenever you are ready.</p>
      </div>
      <Link className="button" href="/goals/new"><Plus size={17} /> New goal</Link>
    </header>

    {goals.length ? <div className="grid two" aria-label="Your long-term goals">
      {goals.map((goal) => {
        const course = courses.find((item) => item.id === goal.courseId);
        const linkedSessions = sessions.filter((session) => session.goalId === goal.id).length;
        return <Link className="card goal-card" href={`/goals/${goal.id}`} key={goal.id}>
          <div className="row-between">
            <span className="course-code">{course?.code ?? "Course"}</span>
            <span className="pill">{goal.type}</span>
          </div>
          <div>
            <h2>{goal.title}</h2>
            <p className="subtle">{goal.description}</p>
          </div>
          <div className="goal-card-footer">
            <span><strong>{linkedSessions}</strong> linked {linkedSessions === 1 ? "session" : "sessions"}</span>
            <span>Due {formatDate(goal.targetDate)}</span>
            <strong>Open goal <ArrowRight size={16} /></strong>
          </div>
        </Link>;
      })}
    </div> : <section className="card goal-empty">
      <div><h2>No goals yet</h2><p className="subtle">Create one when a project, exam, or assignment will take more than one session.</p></div>
      <Link className="button" href="/goals/new">Create your first goal <ArrowRight size={17} /></Link>
    </section>}
  </>;
}
