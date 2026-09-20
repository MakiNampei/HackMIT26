import { getUser } from "@/lib/auth/server";
export async function POST() {
  if (!await getUser()) return Response.json({ error: "Please log in first" }, { status: 401 });
  return Response.json({ error: "Policies are confirmed on the course page and inherited by sessions." }, { status: 409 });
}
export const PATCH = POST;
