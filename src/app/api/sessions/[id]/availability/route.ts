import { NextResponse } from "next/server";
import { z } from "zod";
import { repository } from "@/lib/data/repository";
import { availabilitySlotSchema } from "@/lib/domain/schemas";

const submissionSchema = z.object({
  userId: z.string().min(1),
  slots: z.array(availabilitySlotSchema).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability", issues: parsed.error.flatten() }, { status: 400 });
  }
  await repository.submitAvailability(id, parsed.data.userId, parsed.data.slots);
  return NextResponse.json({ data: { saved: true } });
}
