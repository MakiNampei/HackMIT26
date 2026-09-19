import { NextResponse } from "next/server";
import { z } from "zod";
import { repository } from "@/lib/data/repository";

const joinSchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = joinSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  try {
    const session = await repository.joinSession(id, parsed.data.userId);
    return NextResponse.json({ data: session });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
