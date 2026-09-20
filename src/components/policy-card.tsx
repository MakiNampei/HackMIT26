import { AlertTriangle, Check, FileText, ShieldCheck, X } from "lucide-react";
import type { AcademicPolicy } from "@/lib/domain/types";

function Value({ value }: { value: boolean | null }) {
  if (value === null) return <><AlertTriangle size={15} color="#d9851f" /> Unclear</>;
  return value ? <><Check size={15} color="#176b4d" /> Allowed</> : <><X size={15} color="#a33434" /> Not allowed</>;
}

export function PolicyCard({ policy }: { policy: AcademicPolicy }) {
  return (
    <section className="card">
      <div className="row-between">
        <div>
          <p className="eyebrow">Academic integrity guard</p>
          <h2 style={{ marginBottom: "0.35rem" }}>Collaboration policy</h2>
        </div>
        <span className="metric-icon"><ShieldCheck size={21} /></span>
      </div>
      <div className="policy-box">
        <p style={{ lineHeight: 1.55 }}>{policy.summary}</p>
        <div className="policy-grid">
          <div className="policy-rule"><strong>Discuss approaches</strong><br /><span className="meta-row"><Value value={policy.discussionAllowed} /></span></div>
          <div className="policy-rule"><strong>Share solutions</strong><br /><span className="meta-row"><Value value={policy.solutionSharingAllowed} /></span></div>
          <div className="policy-rule"><strong>Individual submission</strong><br /><span className="meta-row">{policy.individualSubmissionRequired === null ? "Unclear" : policy.individualSubmissionRequired ? "Required" : "Not required"}</span></div>
          <div className="policy-rule"><strong>Confidence</strong><br />{Math.round(policy.confidence * 100)}%</div>
        </div>
      </div>
      {policy.evidence.map((evidence) => (
        <div className="meta-row subtle" key={`${evidence.source}-${evidence.page}`} style={{ alignItems: "flex-start", fontSize: "0.82rem", marginTop: "0.9rem" }}>
          <FileText size={16} />
          <span>“{evidence.quote}”<br /><strong>{evidence.source}{evidence.page ? ` · p. ${evidence.page}` : ""}</strong></span>
        </div>
      ))}
      <div className="notice" style={{ marginTop: "1rem" }}>
        StudySync summarizes the instructor&apos;s written policy. If anything is unclear, confirm with your instructor.
      </div>
    </section>
  );
}
