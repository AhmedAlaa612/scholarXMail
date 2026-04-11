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

export function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment variables.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
}

export function getSender() {
  return process.env.SMTP_FROM || "ScholarX <scholarx.team@gmail.com>";
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
