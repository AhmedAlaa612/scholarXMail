import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export async function GET(req: NextRequest) {
  const campaignName = req.nextUrl.searchParams.get("campaignName");

  if (!campaignName) {
    return NextResponse.json(
      { error: "campaignName is required" },
      { status: 400 },
    );
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
    return NextResponse.json({ failed: [] });
  }

  const { data, error } = await supabase
    .from("campaign_participants")
    .select("participant_id,error_message,emailed_at,participants(email)")
    .eq("campaign_id", campaign.id)
    .eq("status", "failed")
    .order("emailed_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const failed = (data || []).map((row) => ({
    participantId: row.participant_id,
    email:
      (row.participants as unknown as { email: string } | null)?.email ||
      null,
    error: row.error_message,
    at: row.emailed_at,
  }));

  return NextResponse.json({ failed });
}
