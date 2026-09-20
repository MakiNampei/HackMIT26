import { createHmac, timingSafeEqual } from "node:crypto";
import type { AcademicPolicy } from "@/lib/domain/types";

type Preview = { userId: string; sourceName: string; policy: AcademicPolicy; expires: number };
function key() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.OPENAI_API_KEY;
  if (!value) throw new Error("Policy preview is not configured");
  return value;
}
function signature(payload: string) { return createHmac("sha256", key()).update(`course-policy:${payload}`).digest("base64url"); }
export function signPolicyPreview(userId: string, sourceName: string, policy: AcademicPolicy) {
  const payload = Buffer.from(JSON.stringify({ userId, sourceName, policy, expires: Date.now() + 30 * 60_000 } satisfies Preview)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function readPolicyPreview(token: string, userId: string): Preview {
  const [payload, provided, extra] = token.split(".");
  if (!payload || !provided || extra) throw new Error("Invalid policy preview");
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(provided);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid policy preview");
  const preview = JSON.parse(Buffer.from(payload, "base64url").toString()) as Preview;
  if (preview.userId !== userId || preview.expires <= Date.now()) throw new Error("Policy preview expired. Analyze the rules again.");
  return preview;
}
