import { NextRequest, NextResponse } from "next/server";
import {
  getMailer,
  getSender,
  loadInlineSponsorsImage,
  supabase,
} from "../../../../lib/server";

type CampaignRow = {
  id: string;
  name: string;
  subject: string | null;
  html_template: string | null;
};

function withFirstName(template: string, firstName: string) {
  return template.replaceAll("{{first_name}}", firstName || "there");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const jobId = String(body.jobId || "").trim();
  const senderProfile = String(body.senderProfile || "gmail").trim();

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("campaign_jobs")
    .select("id,campaign_id,requested_count,sent_count,failed_count,status")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: jobErr?.message || "Job not found" },
      { status: 404 },
    );
  }

  if (job.status !== "running") {
    return NextResponse.json({
      done: true,
      status: job.status,
      message: "Job is not running",
    });
  }

  if (job.sent_count >= job.requested_count) {
    await supabase
      .from("campaign_jobs")
      .update({ status: "completed" })
      .eq("id", job.id);
    return NextResponse.json({
      done: true,
      status: "completed",
      message: "Target reached",
    });
  }

  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("id,name,subject,html_template")
    .eq("id", job.campaign_id)
    .single<CampaignRow>();

  if (campaignErr || !campaign) {
    return NextResponse.json(
      { error: campaignErr?.message || "Campaign not found" },
      { status: 500 },
    );
  }

  const { data: nextRows, error: nextErr } = await supabase.rpc(
    "get_next_unsent_participant",
    {
      p_campaign_id: campaign.id,
    },
  );

  if (nextErr) {
    return NextResponse.json({ error: nextErr.message }, { status: 500 });
  }

  const nextRow = Array.isArray(nextRows) ? nextRows[0] : null;

  if (!nextRow) {
    await supabase
      .from("campaign_jobs")
      .update({ status: "completed" })
      .eq("id", job.id);
    return NextResponse.json({
      done: true,
      status: "completed",
      message: "No more unsent participants",
    });
  }

  const firstName = (nextRow.first_name || "there").trim();
  const email = String(nextRow.email || "").trim();
  const subject = campaign.subject || "Campaign Email";
  const htmlTemplate =
    campaign.html_template ||
    "<html><body><p>Hi {{first_name}}</p></body></html>";
  const htmlBody = withFirstName(htmlTemplate, firstName);
  const textBody = `Hi ${firstName},\n\nPlease view this email in HTML format.`;

  try {
    const transporter = getMailer(senderProfile);
    const inlineImage = loadInlineSponsorsImage();
    await transporter.sendMail({
      from: getSender(senderProfile),
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: inlineImage ? [inlineImage] : [],
    });

    await supabase.from("campaign_participants").upsert(
      {
        campaign_id: campaign.id,
        participant_id: nextRow.id,
      },
      { onConflict: "campaign_id,participant_id" },
    );

    const { data: updated, error: updateErr } = await supabase
      .from("campaign_jobs")
      .update({ sent_count: job.sent_count + 1 })
      .eq("id", job.id)
      .select("id,requested_count,sent_count,failed_count,status")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (updated.sent_count >= updated.requested_count) {
      await supabase
        .from("campaign_jobs")
        .update({ status: "completed" })
        .eq("id", job.id);
      return NextResponse.json({
        done: true,
        status: "completed",
        sent: updated.sent_count,
        email,
      });
    }

    return NextResponse.json({
      done: false,
      status: updated.status,
      sent: updated.sent_count,
      email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    await supabase
      .from("campaign_jobs")
      .update({ failed_count: job.failed_count + 1 })
      .eq("id", job.id);
    return NextResponse.json({
      done: false,
      status: "running",
      failed: true,
      error: message,
      email,
    });
  }
}
