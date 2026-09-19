import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { sessionCapacitySchema } from "@/lib/domain/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const parsed = sessionCapacitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use whole numbers: minimum 2–12, maximum 2–20, with maximum at least minimum." }, { status: 400 });
  try {
    const session = await repository.getSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.creatorId !== user.id) return NextResponse.json({ error: "Only the creator can change group size" }, { status: 403 });
    if (parsed.data.maxPeople < session.memberIds.length) return NextResponse.json({ error: "Maximum cannot be below the number of joined students" }, { status: 409 });
    await repository.updateCapacity(id, user.id, parsed.data.minPeople, parsed.data.maxPeople);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("capacity_below_members")) {
      return NextResponse.json({ error: "More students have joined. Refresh and choose a larger maximum." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save group size. Please try again." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ data: session });
}
