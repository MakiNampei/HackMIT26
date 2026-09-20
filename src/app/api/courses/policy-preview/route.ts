import { getUser } from "@/lib/auth/server";
import { policyAnalysisRequestSchema } from "@/lib/domain/schemas";
import { analyzePolicy } from "@/lib/services/policy";
import { signPolicyPreview } from "@/lib/courses/policy-token";
import { MAX_FILE_BYTES, fileMime } from "@/lib/courses/types";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in first" }, { status: 401 });
  let sourceName: string;
  let text = "";
  let pdf: Uint8Array | undefined;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 65536) return Response.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose a non-empty PDF, TXT, or Markdown file." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return Response.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
    if (file.name.length > 160) return Response.json({ error: "Use a filename under 160 characters." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    let mime: string;
    try { mime = fileMime(file.name, bytes); }
    catch { return Response.json({ error: "Upload a valid PDF, TXT, or Markdown file. Export Word documents as PDF first." }, { status: 400 }); }
    sourceName = file.name;
    if (mime === "application/pdf") pdf = bytes;
    else {
      if (bytes.length > 100_000) return Response.json({ error: "Text files must be under 100 KB. Use PDF for longer documents." }, { status: 400 });
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { return Response.json({ error: "Save the text file as UTF-8 and try again." }, { status: 400 }); }
      if (text.trim().length < 30) return Response.json({ error: "The document needs at least 30 characters of course rules." }, { status: 400 });
    }
  } else {
    const input = policyAnalysisRequestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "Provide a source name and at least 30 characters of course rules." }, { status: 400 });
    sourceName = input.data.sourceName;
    text = input.data.text;
  }
  try {
    const policy = await analyzePolicy(sourceName, text, { requireLive: true, ...(pdf ? { pdf } : {}) });
    return Response.json({ policy, token: signPolicyPreview(user.id, sourceName, policy) });
  } catch { return Response.json({ error: "Could not analyze the course rules. Please try again." }, { status: 502 }); }
}
