import { requireUser } from "@/lib/auth/server";
import { CreateSessionForm } from "@/components/create-session-form";
import { repository } from "@/lib/data/repository";
import { connection } from "next/server";

export default async function NewSessionPage() {
  await requireUser();
  await connection();
  const courses = await repository.listCourses();
  return (
    <>
      <header className="page-header form-card">
        <div>
          <p className="eyebrow">Start with a goal</p>
          <h1>Create a study session</h1>
          <p className="subtle">Set the constraints now. StudySync will coordinate the people, policy, time, and room.</p>
        </div>
      </header>
      <CreateSessionForm courses={courses} />
    </>
  );
}
