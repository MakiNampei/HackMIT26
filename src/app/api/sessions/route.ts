import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";
import { createSessionSchema } from "@/lib/domain/schemas";

export async function GET(request: NextRequest) {
  const courseId = request.nextUrl.searchParams.get("courseId") ?? undefined;
  const sessions = await repository.listSessions({ courseId });
  return NextResponse.json({ data: sessions });
}

export async function POST(request: Request) {
  const parsed = createSessionSchema.safeParse(await request.json());
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
      // Route handlers and server-rendered pages may run in separate processes.
      // Until Supabase persistence is connected, land on the stable seeded demo.
      navigationId: process.env.DATA_BACKEND === "supabase" ? session.id : "demo-session-1",
    },
    { status: 201 },
  );
}
