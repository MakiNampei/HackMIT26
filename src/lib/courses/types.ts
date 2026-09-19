import { z } from 'zod';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const courseInput = z.object({ code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(160), school: z.string().trim().min(2).max(160) });
const evidence = z.object({ quote: z.string(), page: z.number().int().nullable() });
export const analysisSchema = z.object({
  summary: z.string(),
  topics: z.array(z.object({ title: z.string(), explanation: z.string(), evidence })),
  dates: z.array(z.object({ label: z.string(), dateText: z.string(), evidence })),
  collaboration: z.object({ summary: z.string(), needsReview: z.boolean(), evidence: z.array(evidence) }),
  suggestedSession: z.object({ title: z.string(), topic: z.string(), type: z.enum(['study', 'assignment', 'exam_review']) }),
});
export type Material = {
  id: string; courseId: string; name: string; kind: 'syllabus' | 'lecture' | 'assignment';
  source: 'local' | 'dropbox'; createdAt: string; mime: string; size: number;
  analysis: z.infer<typeof analysisSchema> | null; analysisError?: string;
};
export function fileMime(name: string, bytes: Uint8Array) {
  if (/\.pdf$/i.test(name) && Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-') return 'application/pdf';
  if (/\.(txt|md)$/i.test(name) && !bytes.includes(0)) return 'text/plain';
  throw new Error('Upload a valid PDF, TXT, or Markdown file. Export slides as PDF first.');
}
