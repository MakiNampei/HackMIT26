import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await repository.calculateBestTime(id);
  if (!result) return NextResponse.json({ error: "No compatible time found" }, { status: 404 });
  return NextResponse.json({ data: result });
}
