import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { z } from "zod";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const input = z.object({ roomId: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Choose a room." }, { status: 400 });
  try {
    await repository.selectRoom(id, user.id, input.data.roomId);
    return Response.json({ data: { selected: true } });
  } catch (error) {
    const errors: Record<string, [number, string]> = {
      session_not_found: [404, "Session not found."], creator_only: [403, "Only the session creator can choose a room."],
      time_not_matched: [409, "Match a time before choosing a room."], group_not_formed: [409, "Wait until the minimum group size is reached."],
      room_not_found: [404, "Room not found."], room_too_small: [409, "Choose a room that fits the session’s maximum group size."],
      session_changed: [409, "The session changed. Refresh and select the room again."],
    };
    const [status, message] = errors[error instanceof Error ? error.message : ""] ?? [503, "Could not save the room. Please try again."];
    return Response.json({ error: message }, { status });
  }
}
