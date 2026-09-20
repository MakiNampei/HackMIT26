import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { generateGroupSyncBrief, groupSyncModel } from "@/lib/services/group-sync-brief";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in to generate a Group Sync Brief." }, { status: 401 });
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) return Response.json({ error: "Session not found." }, { status: 404 });
  if (!session.memberIds.includes(user.id)) return Response.json({ error: "Join this session to generate a Group Sync Brief." }, { status: 403 });
  if (!session.goalId) return Response.json({ error: "Group Sync Brief is available for goal sessions." }, { status: 422 });
  if (!process.env.META_API_KEY) return Response.json({ error: "Meta Group Sync is not configured yet." }, { status: 503 });
  if (session.type === "assignment" && (!session.policy || session.policy.needsInstructorReview || session.policy.collaborationAllowed !== true || session.policy.discussionAllowed !== true)) {
    return Response.json({ error: "Confirm that collaboration and discussion are allowed before generating an assignment brief." }, { status: 422 });
  }
  const goal = await repository.getGoal(session.goalId, user.id);
  if (!goal) return Response.json({ error: "The linked goal could not be loaded." }, { status: 404 });
  const checkins = await repository.listSessionSyncCheckins(id);
  const readyIds = new Set(checkins.map((checkin) => checkin.userId));
  if (session.memberIds.some((memberId) => !readyIds.has(memberId))) {
    return Response.json({ error: "Wait until every member completes Progress Sync." }, { status: 409 });
  }
  try {
    const content = await generateGroupSyncBrief(session, goal, checkins);
    const brief = await repository.saveSessionSyncBrief(id, content, groupSyncModel(), user.id);
    return Response.json({ brief }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Meta could not generate the brief. Please try again." }, { status: 502 });
  }
}
