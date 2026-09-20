import { canMatchTime } from "@/lib/domain/policy-workflow";
import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const session = await repository.getSession(id);
  if (!session?.memberIds.includes(user.id)) return NextResponse.json({ error: "Join this session first" }, { status: 403 });
  if (!canMatchTime(session)) return NextResponse.json({ error: "Availability saved. The course policy must be confirmed and permit collaboration before time matching." }, { status: 409 });
  const result = await repository.calculateBestTime(id);
  if (!result) return NextResponse.json({ error: "No compatible time found" }, { status: 404 });
  return NextResponse.json({ data: result });
}
