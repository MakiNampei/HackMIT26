import { getUser } from '@/lib/auth/server';
import { repository } from '@/lib/data/repository';
import { generateGroupPlan } from '@/lib/services/group-plan';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Please log in to plan a session.' }, { status: 401 });
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) return Response.json({ error: 'Session not found.' }, { status: 404 });
  if (!session.memberIds.includes(user.id)) return Response.json({ error: 'Join this session to generate a group plan.' }, { status: 403 });
  if (!process.env.META_API_KEY) return Response.json({ error: 'The group coordinator is not configured yet.' }, { status: 503 });
  if (session.type === 'assignment' && (!session.policy || session.policy.needsInstructorReview || session.policy.collaborationAllowed !== true || session.policy.discussionAllowed !== true)) {
    return Response.json({ error: 'Confirm with your instructor that collaboration and discussion are allowed before generating an assignment group plan.' }, { status: 422 });
  }
  try {
    const plan = await generateGroupPlan(session);
    return Response.json({ plan }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'The group coordinator could not generate a plan. Please try again.' }, { status: 502 });
  }
}
