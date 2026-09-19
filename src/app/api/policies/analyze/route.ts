import { NextResponse } from "next/server";
import { policyAnalysisRequestSchema } from "@/lib/domain/schemas";
import { analyzePolicy } from "@/lib/services/policy";

export async function POST(request: Request) {
  const parsed = policyAnalysisRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid policy source", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const policy = await analyzePolicy(parsed.data.sourceName, parsed.data.text);
    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error("Policy analysis failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Policy analysis is temporarily unavailable" }, { status: 502 });
  }
}
