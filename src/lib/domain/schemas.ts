import { z } from "zod";

export const createGoalSchema = z.object({
  ownerId: z.string().min(1),
  courseId: z.string().min(1),
  type: z.enum(["review", "preview", "project", "homework"]),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(2).max(500),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().int().min(30).max(240).multipleOf(15),
}).strict();

export const sessionSyncCheckinSchema = z.object({
  progress: z.enum(["starting", "in_progress", "comfortable", "ahead"]),
  todayGoal: z.string().trim().min(2).max(160),
  workStyle: z.enum(["together", "independent_then_regroup", "explain", "example"]),
  blocker: z.string().trim().max(160).optional().transform((value) => value || undefined),
}).strict();

export const sessionCapacitySchema = z.object({
  minPeople: z.number().int().min(2).max(12),
  maxPeople: z.number().int().min(2).max(20),
}).strict().refine((value) => value.maxPeople >= value.minPeople, {
  message: "Maximum students must be at least the minimum",
  path: ["maxPeople"],
});

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
    goalId: z.string().min(1).optional(),
  })
  .refine((session) => session.maxPeople >= session.minPeople, {
    message: "Maximum students must be at least the minimum",
    path: ["maxPeople"],
  });

export const policyAnalysisRequestSchema = z.object({
  sourceName: z.string().min(1).max(160),
  text: z.string().min(30).max(50_000),
});
