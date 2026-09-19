import { requireUser } from "@/lib/auth/server";
import { ArrowRight, CalendarCheck, FileCheck2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { SessionCard } from "@/components/session-card";
import { repository } from "@/lib/data/repository";

export default async function DashboardPage() {
  const user = await requireUser();
  await connection();
  const sessions = await repository.listSessions();

  return (
    <>
      <section className="banner">
        <div>
          <p className="eyebrow" style={{ color: "#f1ca72" }}>Welcome, {user.user_metadata.display_name || "Student"}</p>
          <h1>Turn course chaos into a study plan.</h1>
          <p>StudySync reads collaboration rules, finds the right classmates, and coordinates a time and place.</p>
        </div>
        <Link className="button" href="/sessions/new" style={{ background: "#f1ca72", color: "#123b2d", zIndex: 1 }}>
          Create a session <ArrowRight size={17} />
        </Link>
      </section>

      <section className="grid three" aria-label="StudySync overview">
        <div className="card metric-card">
          <span className="metric-icon"><Users size={21} /></span>
          <span><strong className="metric-value">2</strong><span className="subtle">Active sessions</span></span>
        </div>
        <div className="card metric-card">
          <span className="metric-icon"><FileCheck2 size={21} /></span>
          <span><strong className="metric-value">93%</strong><span className="subtle">Policy confidence</span></span>
        </div>
        <div className="card metric-card">
          <span className="metric-icon"><CalendarCheck size={21} /></span>
          <span><strong className="metric-value">7:00</strong><span className="subtle">Next meetup</span></span>
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
        <div className="grid two">
          {sessions.map((session) => <SessionCard key={session.id} session={session} />)}
        </div>
      </section>
    </>
  );
}
