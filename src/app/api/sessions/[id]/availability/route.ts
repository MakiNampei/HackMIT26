import { getUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { repository } from "@/lib/data/repository";
import { availabilitySlotSchema } from "@/lib/domain/schemas";

const submissionSchema = z.object({
  slots: z.array(availabilitySlotSchema).min(1).max(100),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability", issues: parsed.error.flatten() }, { status: 400 });
  }
  const session = await repository.getSession(id);
  if (!session?.memberIds.includes(user.id)) {
    return NextResponse.json({ error: "Join this session before sharing availability" }, { status: 403 });
  }
  await repository.submitAvailability(id, user.id, parsed.data.slots);
  return NextResponse.json({ data: { saved: true } });
}
