import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ data: session });
}
