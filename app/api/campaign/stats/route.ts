import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaignName = req.nextUrl.searchParams.get("campaignName");

  if (!campaignName) {
    return NextResponse.json(
      { error: "campaignName is required" },
      { status: 400 },
    );
  }

  const { count: total, error: totalErr } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .not("email", "is", null)
    .neq("email", "");

  if (totalErr) {
    return NextResponse.json({ error: totalErr.message }, { status: 500 });
  }

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("id")
    .eq("name", campaignName)
    .maybeSingle();

  if (campaignErr) {
    return NextResponse.json({ error: campaignErr.message }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({
      total: total || 0,
      sent: 0,
      failed: 0,
      remaining: total || 0,
    });
  }

  const [{ count: sent, error: sentErr }, { count: failed, error: failedErr }] =
    await Promise.all([
      supabase
        .from("campaign_participants")
        .select("participant_id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "sent"),
      supabase
        .from("campaign_participants")
        .select("participant_id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "failed"),
    ]);

  if (sentErr) {
    return NextResponse.json({ error: sentErr.message }, { status: 500 });
  }
  if (failedErr) {
    return NextResponse.json({ error: failedErr.message }, { status: 500 });
  }

  const totalCount = total || 0;
  const sentCount = sent || 0;
  const failedCount = failed || 0;

  return NextResponse.json({
    total: totalCount,
    sent: sentCount,
    failed: failedCount,
    remaining: Math.max(0, totalCount - sentCount - failedCount),
  });
}
