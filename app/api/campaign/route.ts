import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/server";

const DEFAULT_SUBJECT = "Next Scholar Summit 2026 - Reserve Your Free Spot";
const DEFAULT_HTML = `<html>
  <body>
    <p style="margin:0 0 16px 0;">
      <img src="cid:sponsors_img" alt="Sponsors" style="max-width:100%;height:auto;display:block;">
    </p>
    <p>Hi {{first_name}},</p>
    <p>
      After reaching thousands of students across 10 governorates in Egypt, we are bringing together
      the most ambitious minds in one place for a life-changing experience.
    </p>
    <p>
      <strong>Next Scholar Summit 2026</strong> by ScholarX in partnership with
      <strong>EU jeel connect</strong> and <strong>European Union</strong> is not just an event - it is a turning point.
    </p>
    <p>Here is what is waiting for you:</p>
    <ul>
      <li>70+ speakers and experts from diverse fields</li>
      <li>1200+ top students and future leaders</li>
      <li>Practical workshops to build real-world skills</li>
      <li>Direct access to global opportunities, scholarships, and career paths</li>
      <li>Networking with organizations, mentors, and industry leaders</li>
      <li>Certificate of Attendance</li>
    </ul>
    <p>All of this... in just ONE day that could completely reshape your future.</p>
    <p><strong>Location:</strong> Nile University - Giza<br><strong>Date:</strong> May 1, 2026</p>
    <p>
      If your goal is to study abroad, land a global career, or create real impact - this summit was made for you.
    </p>
    <p><strong>Next Scholar - Where Global Opportunities Begin.</strong></p>
    <p>
      <strong>Reserve your spot now (FREE):</strong><br>
      <a href="https://scholar-x.org/summit-2026/" target="_blank" rel="noopener noreferrer">
        https://scholar-x.org/summit-2026/
      </a>
    </p>
    <p>Spots are limited - do not miss your chance to be part of something bigger.</p>
    <p>See you there,<br><strong>ScholarX Team</strong></p>
  </body>
</html>`;

export async function GET(req: NextRequest) {
  const campaignName = req.nextUrl.searchParams.get("campaignName");

  if (!campaignName) {
    return NextResponse.json(
      { error: "campaignName is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("id,name,subject,html_template")
    .eq("name", campaignName)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      campaign: {
        name: campaignName,
        subject: DEFAULT_SUBJECT,
        html_template: DEFAULT_HTML,
      },
    });
  }

  return NextResponse.json({ campaign: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const campaignName = String(body.campaignName || "").trim();
  const subject = String(body.subject || "").trim();
  const htmlTemplate = String(body.htmlTemplate || "").trim();

  if (!campaignName || !subject || !htmlTemplate) {
    return NextResponse.json(
      { error: "campaignName, subject, and htmlTemplate are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .upsert(
      {
        name: campaignName,
        subject,
        html_template: htmlTemplate,
      },
      { onConflict: "name" },
    )
    .select("id,name,subject,html_template")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}
