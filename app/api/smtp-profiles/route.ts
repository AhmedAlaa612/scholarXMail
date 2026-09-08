import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("smtp_profiles")
    .select("key,host,port,secure,smtp_user,from_address,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles = (data || []).map((row) => ({
    key: row.key,
    host: row.host,
    port: row.port,
    secure: row.secure,
    user: row.smtp_user,
    from: row.from_address,
  }));

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const key = String(body.key || "").trim();
  const host = String(body.host || "").trim();
  const user = String(body.user || "").trim();
  const pass = String(body.pass || "").trim();
  const from = String(body.from || "").trim() || `ScholarX <${user}>`;
  const portValue = Number(body.port || 587);
  const port = Number.isFinite(portValue) && portValue > 0 ? portValue : 587;
  const secure =
    typeof body.secure === "boolean" ? body.secure : port === 465;

  if (!key || !host || !user || !pass) {
    return NextResponse.json(
      { error: "key, host, user, and pass are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("smtp_profiles").upsert(
    {
      key,
      host,
      port,
      secure,
      smtp_user: user,
      smtp_pass: pass,
      from_address: from,
    },
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: { key, host, port, secure, user, from } });
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("smtp_profiles")
    .delete()
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
