import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const campaignName = String(body.campaignName || "").trim();
  const count = Number(body.count || 0);

  if (!campaignName || !Number.isInteger(count) || count <= 0) {
    return NextResponse.json(
      { error: "campaignName and positive integer count are required" },
      { status: 400 },
    );
  }

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .upsert({ name: campaignName }, { onConflict: "name" })
    .select("id,name")
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json(
      { error: campaignErr?.message || "Failed to create campaign" },
      { status: 500 },
    );
  }

  const { data: job, error: jobErr } = await supabase
    .from("campaign_jobs")
    .insert({
      campaign_id: campaign.id,
      requested_count: count,
      sent_count: 0,
      failed_count: 0,
      status: "running",
    })
    .select("id,campaign_id,requested_count,sent_count,failed_count,status")
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: jobErr?.message || "Failed to create job" },
      { status: 500 },
    );
  }

  return NextResponse.json({ job });
}
