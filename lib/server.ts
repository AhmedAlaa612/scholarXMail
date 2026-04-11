import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import nodemailer from "nodemailer";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export type SenderProfile = "gmail" | "info";

function toSenderProfile(value: unknown): SenderProfile {
  return value === "info" ? "info" : "gmail";
}

function getSmtpSettings(profile: SenderProfile) {
  if (profile === "info") {
    const host = process.env.SMTP_INFO_HOST;
    const port = Number(process.env.SMTP_INFO_PORT || 465);
    const user = process.env.SMTP_INFO_USER;
    const pass = process.env.SMTP_INFO_PASS;
    const from = process.env.SMTP_INFO_FROM || "ScholarX <info@scholar-x.org>";

    if (!host || !user || !pass) {
      throw new Error(
        "Missing SMTP_INFO_HOST, SMTP_INFO_USER, or SMTP_INFO_PASS in environment variables.",
      );
    }

    return { host, port, user, pass, from, secure: port === 465 };
  }

  const host = process.env.SMTP_PROFILE_GMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(
    process.env.SMTP_PROFILE_GMAIL_PORT || process.env.SMTP_PORT || 587,
  );
  const user = process.env.SMTP_PROFILE_GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.SMTP_PROFILE_GMAIL_PASS || process.env.SMTP_PASS;
  const from =
    process.env.SMTP_PROFILE_GMAIL_FROM ||
    process.env.SMTP_FROM ||
    "ScholarX <scholarx.team@gmail.com>";

  if (!host || !user || !pass) {
    throw new Error(
      "Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment variables.",
    );
  }

  return { host, port, user, pass, from, secure: port === 465 };
}

export function getMailer(profileInput?: unknown) {
  const profile = toSenderProfile(profileInput);
  const smtp = getSmtpSettings(profile);

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

export function getSender(profileInput?: unknown) {
  const profile = toSenderProfile(profileInput);
  return getSmtpSettings(profile).from;
}

export function loadInlineSponsorsImage() {
  const candidates = [
    path.join(process.cwd(), "public", "sponsors.png"),
    path.join(process.cwd(), "sponsors.png"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return {
        filename: "sponsors.png",
        content: readFileSync(candidate),
        cid: "sponsors_img",
      };
    }
  }

  return null;
}
