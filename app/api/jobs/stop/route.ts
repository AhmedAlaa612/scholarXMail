import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jobId = String(body.jobId || "").trim();

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("campaign_jobs")
    .update({ status: "stopped" })
    .eq("id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
