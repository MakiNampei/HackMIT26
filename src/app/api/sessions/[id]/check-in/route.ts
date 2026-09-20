import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  try {
    const checkedInAt = await repository.checkIn(id, user.id);
    return NextResponse.json({ checkedInAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, [number, string]> = {
      session_not_found: [404, "Session not found"],
      not_a_session_member: [403, "Join this session before checking in"],
      cannot_check_in_for_another_user: [403, "You can only check in for yourself"],
      check_in_not_open: [409, "Check-in opens when the session starts"],
    };
    const [status, detail] = errors[message] ?? [500, "Could not check in. Please try again."];
    return NextResponse.json({ error: detail }, { status });
  }
}
