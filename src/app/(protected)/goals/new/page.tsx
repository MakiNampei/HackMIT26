import { CreateGoalForm } from "@/components/create-goal-form";
import { requireUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { connection } from "next/server";

export default async function NewGoalPage() {
  await requireUser();
  await connection();
  const courses = await repository.listCourses();
  const target = new Date();
  target.setDate(target.getDate() + 14);
  const defaultTargetDate = target.toISOString().slice(0, 10);

  return <>
    <header className="page-header form-card">
      <div>
        <p className="eyebrow">A simple starting point</p>
        <h1>Create a long-term goal</h1>
        <p className="subtle">Save the outcome once, then start each study session with the focus that fits today.</p>
      </div>
    </header>
    <CreateGoalForm courses={courses} defaultTargetDate={defaultTargetDate} />
  </>;
}
