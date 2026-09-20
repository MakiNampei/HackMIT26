import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";


export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;

  try {
    const session = await repository.joinSession(id, user.id);
    return NextResponse.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "session_full") return NextResponse.json({ error: "This session is full. Choose another group." }, { status: 409 });
    if (message === "session_not_found" || message === "Session not found") return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (message === "cannot_join_for_another_user") return NextResponse.json({ error: "You can only join for yourself." }, { status: 403 });
    return NextResponse.json({ error: "Could not join session. Please try again." }, { status: 503 });
  }
}
