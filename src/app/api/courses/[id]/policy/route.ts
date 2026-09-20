import { getUser } from "@/lib/auth/server";
import { repository } from "@/lib/data/repository";
import { readPolicyPreview } from "@/lib/courses/policy-token";
import { getSupabaseServerClient } from "@/lib/data/supabase-client";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please log in first" }, { status: 401 });
  const { id } = await params;
  const { data: course } = await getSupabaseServerClient().from("courses").select("id").eq("id", id).maybeSingle();
  if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
  // Shared course policies are set once here; session members cannot overwrite them.
  if (await repository.getCoursePolicy(id)) return Response.json({ error: "This course already has a confirmed policy. Refresh to view it." }, { status: 409 });
  const body = await request.json().catch(() => null);
  if (body?.acknowledged !== true || typeof body?.policyToken !== "string") return Response.json({ error: "Review and confirm the policy first." }, { status: 400 });
  let preview;
  try { preview = readPolicyPreview(body.policyToken, user.id); }
  catch { return Response.json({ error: "The policy preview expired. Analyze the rules again." }, { status: 400 }); }
  try {
    await repository.saveCoursePolicy(id, { ...preview.policy, id: `policy-${crypto.randomUUID()}` }, preview.sourceName);
    return Response.json({ data: { id } });
  } catch { return Response.json({ error: "Could not finish saving the policy. Refresh the course to check its status." }, { status: 503 }); }
}
