import { NextResponse } from "next/server";
import { supabase } from "../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("name,subject,html_template,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data || [] });
}
