import { notFound } from "next/navigation";
import { AvailabilityForm } from "@/components/availability-form";
import { repository } from "@/lib/data/repository";

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{session.course.code} · {session.title}</p>
          <h1>When can you meet?</h1>
          <p className="subtle">Share a window; the scheduling service will find the strongest overlap.</p>
        </div>
      </header>
      <AvailabilityForm sessionId={session.id} />
    </>
  );
}
