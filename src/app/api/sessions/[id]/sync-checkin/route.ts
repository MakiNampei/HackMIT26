import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { sessionSyncCheckinSchema } from "@/lib/domain/schemas";

async function authorizedSession(id: string, userId: string) {
  const session = await repository.getSession(id);
  if (!session) return { error: Response.json({ error: "Session not found." }, { status: 404 }) };
  if (!session.memberIds.includes(userId)) return { error: Response.json({ error: "Join this session to complete Progress Sync." }, { status: 403 }) };
  if (!session.goalId) return { error: Response.json({ error: "Progress Sync is available for goal sessions." }, { status: 422 }) };
  return { session };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in to view Progress Sync." }, { status: 401 });
  const { id } = await params;
  const result = await authorizedSession(id, user.id);
  if (result.error) return result.error;
  const [checkins, brief] = await Promise.all([
    repository.listSessionSyncCheckins(id),
    repository.getSessionSyncBrief(id),
  ]);
  return Response.json({ checkins, brief }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in to complete Progress Sync." }, { status: 401 });
  const { id } = await params;
  const result = await authorizedSession(id, user.id);
  if (result.error) return result.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter your Progress Sync details." }, { status: 400 });
  }
  const parsed = sessionSyncCheckinSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check your Progress Sync answers and try again." }, { status: 400 });
  const checkin = await repository.saveSessionSyncCheckin(id, user.id, parsed.data);
  return Response.json({ checkin });
}
