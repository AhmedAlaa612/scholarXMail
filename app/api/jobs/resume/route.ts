import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jobId = String(body.jobId || "").trim();

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("campaign_jobs")
    .select("id,status")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: jobErr?.message || "Job not found" },
      { status: 404 },
    );
  }

  if (job.status === "completed") {
    return NextResponse.json(
      { error: "Job already completed" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("campaign_jobs")
    .update({ status: "running", limit_profile: null })
    .eq("id", jobId)
    .select("id,campaign_id,requested_count,sent_count,failed_count,status")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ job: updated });
}
