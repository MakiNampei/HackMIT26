import { z } from "zod";

export const availabilitySlotSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })
  .refine((slot) => new Date(slot.end) > new Date(slot.start), {
    message: "End time must be after start time",
  });

export const createSessionSchema = z
  .object({
    courseId: z.string().min(1),
    creatorId: z.string().min(1),
    type: z.enum(["study", "assignment", "exam_review"]),
    title: z.string().min(3).max(100),
    topic: z.string().min(2).max(160),
    minPeople: z.coerce.number().int().min(2).max(12),
    maxPeople: z.coerce.number().int().min(2).max(20),
    durationMinutes: z.coerce.number().int().min(30).max(240).multipleOf(15),
    proposedSlots: z.array(availabilitySlotSchema).min(1),
  })
  .refine((session) => session.maxPeople >= session.minPeople, {
    message: "Maximum students must be at least the minimum",
    path: ["maxPeople"],
  });

export const policyAnalysisRequestSchema = z.object({
  sourceName: z.string().min(1).max(160),
  text: z.string().min(30).max(50_000),
});
