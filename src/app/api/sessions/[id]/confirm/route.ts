import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { z } from "zod";
const confirmation = z.object({ start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }), roomId: z.string().min(1).max(100) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const input = confirmation.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Review the session time and room before confirming." }, { status: 400 });
  try {
    await repository.confirmSession(id, user.id, input.data);
    return Response.json({ data: { confirmed: true } });
  } catch (error) {
    const errors: Record<string, [number, string]> = {
      creator_only: [403, "Only the session creator can confirm the session."], session_not_found: [404, "Session not found."],
      time_not_matched: [409, "Match a time and complete any required policy checks first."],
      group_not_formed: [409, "The group no longer meets the minimum size."], room_not_found: [409, "Choose a room before confirming."],
      room_too_small: [409, "Choose a room that fits the group."], session_changed: [409, "The time or room changed. Refresh and review the session again."],
    };
    const [status, message] = errors[error instanceof Error ? error.message : ""] ?? [503, "Could not confirm the session. Please try again."];
    return Response.json({ error: message }, { status });
  }
}
