import { connection } from "next/server";
import Link from "next/link";
import { SessionCard } from "@/components/session-card";
import { requireUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";

export default async function HistoryPage() {
  const user = await requireUser();
  await connection();
  const sessions = await repository.listSessions();
  // Read the request time after connection(), matching the dashboard.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const history = sessions.filter((session) =>
    (session.creatorId === user.id || session.memberIds.includes(user.id)) &&
    session.confirmedSlot && Date.parse(session.confirmedSlot.end) <= now,
  ).sort((a, b) => Date.parse(b.confirmedSlot!.end) - Date.parse(a.confirmedSlot!.end));

  return <>
    <header className="page-header">
      <div>
        <p className="eyebrow">Your study journey</p>
        <h1>History</h1>
        <p className="subtle">Past sessions you organized or joined, most recent first. Your check-in status appears on each card.</p>
      </div>
      <span className="pill">{history.length} {history.length === 1 ? "session" : "sessions"}</span>
    </header>
    {history.length ? <div className="grid two">
      {history.map((session) => <div className="grid" key={session.id}>
        <div className="row-between">
          <span className="subtle">{session.creatorId === user.id ? "You organized this session" : "You joined this session"}</span>
          {!session.checkIns?.[user.id] && <span className="pill amber">Not checked in</span>}
        </div>
        <SessionCard session={session} ended userId={user.id} />
      </div>)}
    </div> : <section className="card">
      <h2>No past sessions yet</h2>
      <p className="subtle">Sessions you organize or join will appear here after they end.</p>
      <Link className="button secondary" href="/dashboard">Find a study session</Link>
    </section>}
  </>;
}
