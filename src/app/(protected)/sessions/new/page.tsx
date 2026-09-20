import { requireUser } from "@/lib/auth/server";
import { CreateSessionForm } from "@/components/create-session-form";
import { repository } from "@/lib/data/repository";
import { connection } from "next/server";

import { getMaterial } from "@/lib/courses/store";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ courseId?: string; materialId?: string; date?: string; goalId?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  await connection();
  const courses = await repository.listCourses();
  const goal = query.goalId ? await repository.getGoal(query.goalId, user.id) : null;
  const material = query.courseId && query.materialId && /^[0-9a-f-]{36}$/.test(query.materialId)
    ? await getMaterial(user.id, query.courseId, query.materialId) : null;
  const goalSessionType = goal?.type === "review" ? "exam_review" : goal?.type === "homework" ? "assignment" : "study";
  const initial = {
    date: query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : undefined,
    courseId: goal?.courseId ?? query.courseId,
    ...material?.analysis?.suggestedSession,
    ...(goal ? {
      goalId: goal.id,
      goalTitle: goal.title,
      courseId: goal.courseId,
      title: `${goal.title} session`.slice(0, 100),
      topic: goal.description.slice(0, 160),
      type: goalSessionType,
      durationMinutes: goal.durationMinutes,
    } : {}),
    sourceName: material?.name,
    rules: material?.analysis?.collaboration.summary,
  };
  return (
    <>
      <header className="page-header form-card">
        <div>
          <p className="eyebrow">Start with a goal</p>
          <h1>Create a study session</h1>
          <p className="subtle">Set the constraints now. StudySync will coordinate the people, policy, time, and room.</p>
        </div>
      </header>
      <CreateSessionForm courses={courses} initial={initial} />
    </>
  );
}
