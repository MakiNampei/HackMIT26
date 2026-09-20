import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { createGoalSchema } from "@/lib/domain/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  return NextResponse.json({ data: await repository.listGoals(user.id) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = createGoalSchema.safeParse(
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...body, ownerId: user.id }
      : null,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the goal details and try again", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const goal = await repository.createGoal(parsed.data);
  return NextResponse.json({ data: goal }, { status: 201 });
}
