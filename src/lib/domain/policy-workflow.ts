import type { AcademicPolicy, SessionWithDetails } from "./types";

export function policyAllowsCollaboration(policy?: AcademicPolicy): boolean {
  return !!policy && policy.collaborationAllowed === true && policy.discussionAllowed === true && !policy.needsInstructorReview;
}

export function policyVerified(session: Pick<SessionWithDetails, "policy" | "memberIds" | "policyAcknowledgements" | "coursePolicyConfirmed">): boolean {
  if (session.coursePolicyConfirmed) return policyAllowsCollaboration(session.policy);
  return policyAllowsCollaboration(session.policy) && session.memberIds.length > 0 && session.memberIds.every(id => session.policyAcknowledgements?.[id] === session.policy?.id);
}

export function canMatchTime(session: SessionWithDetails): boolean {
  return session.type !== "assignment" || policyVerified(session);
}

export function sessionChecklist(session: SessionWithDetails) {
  const group = session.memberIds.length >= session.minPeople;
  const policy = session.coursePolicyConfirmed === true && !!session.policy || policyVerified(session);
  const time = !!session.confirmedSlot && canMatchTime(session);
  const room = time && !!session.roomId;
  const confirmed = room && session.status === "confirmed";
  return session.type === "assignment"
    ? [{ label: "Policy verified", done: policy }, { label: "Group formed", done: policy && group }, { label: "Time matched", done: time }, { label: "Room selected", done: room }, { label: "Confirmed", done: confirmed }]
    : [{ label: "Group formed", done: group }, { label: "Time matched", done: time }, { label: "Room selected", done: room }, { label: "Confirmed", done: confirmed }];
}
