import { requireUser } from "@/lib/auth/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinButton } from "@/components/join-button";
import { AvailabilityForm } from "@/components/availability-form";
import { repository } from "@/lib/data/repository";

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) notFound();

  const slots = session.memberIds.includes(user.id) ? await repository.getAvailability(id, user.id) : [];

  return (
    <>
      <Link className="back-link" href={`/sessions/${id}`}>← Back to session</Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{session.course.code} · {session.title}</p>
          <h1>When can you meet?</h1>
          <p className="subtle">Share a window; the scheduling service will find the strongest overlap.</p>
        </div>
      </header>
      {session.memberIds.includes(user.id) ? <AvailabilityForm sessionId={session.id} initialSlots={slots} /> : (
        <section className="card">
          <h2>Join this session first</h2>
          <p className="subtle">You need to join this study group before sharing your availability.</p>
          <JoinButton sessionId={session.id} />
        </section>
      )}
    </>
  );
}
