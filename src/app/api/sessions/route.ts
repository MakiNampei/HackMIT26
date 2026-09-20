import { getUser } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { createSessionSchema } from "@/lib/domain/schemas";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const courseId = request.nextUrl.searchParams.get("courseId") ?? undefined;
  const sessions = await repository.listSessions({ courseId });
  return NextResponse.json({ data: sessions });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body && typeof body === "object" && !Array.isArray(body) ? { ...body, creatorId: user.id } : null);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid session", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await repository.createSession(parsed.data);
  return NextResponse.json(
    {
      data: session,
      navigationId: session.id,
    },
    { status: 201 },
  );
}
