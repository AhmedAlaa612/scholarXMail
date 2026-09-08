import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaign_jobs")
    .select(
      "id,campaign_id,requested_count,sent_count,failed_count,status,limit_profile,created_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}
