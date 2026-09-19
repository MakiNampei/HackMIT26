import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  try {
    if (!await repository.getSession(id)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    await repository.leaveSession(id, user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not leave session. Please try again." }, { status: 500 });
  }
}
