import { NextRequest, NextResponse } from "next/server";
import {
  getMailer,
  getSender,
  loadInlineSponsorsImage,
  supabase,
} from "../../../lib/server";

function withFirstName(template: string, firstName: string) {
  return template.replaceAll("{{first_name}}", firstName || "there");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const campaignName = String(body.campaignName || "summit-2026").trim();
  const subject = String(body.subject || "").trim();
  const htmlTemplate = String(body.htmlTemplate || "").trim();
  const testEmail = String(body.testEmail || "").trim();
  const firstName = String(body.firstName || "there").trim() || "there";
  const senderProfile = String(body.senderProfile || "gmail").trim();

  if (!campaignName || !subject || !htmlTemplate || !testEmail) {
    return NextResponse.json(
      {
        error:
          "campaignName, subject, htmlTemplate, and testEmail are required",
      },
      { status: 400 },
    );
  }

  const { error: saveErr } = await supabase.from("campaigns").upsert(
    {
      name: campaignName,
      subject,
      html_template: htmlTemplate,
    },
    { onConflict: "name" },
  );

  if (saveErr) {
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  const htmlBody = withFirstName(htmlTemplate, firstName);
  const textBody = `Hi ${firstName},\n\nPlease view this email in HTML format.`;
  const inlineImage = loadInlineSponsorsImage();

  try {
    const transporter = await getMailer(senderProfile);
    await transporter.sendMail({
      from: await getSender(senderProfile),
      to: testEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: inlineImage ? [inlineImage] : [],
    });

    return NextResponse.json({
      ok: true,
      email: testEmail,
      subject,
      campaignName,
      senderProfile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
