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

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
type SmtpProfile = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export type SenderProfile = string;

function normalizeProfile(raw: unknown, key: string): SmtpProfile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const host = String(source.host || "").trim();
  const user = String(source.user || "").trim();
  const pass = String(source.pass || "").trim();
  const from =
    String(source.from || "").trim() ||
    `ScholarX <${user || "no-reply@example.com"}>`;
  const portValue = Number(source.port || 0);
  const port = Number.isFinite(portValue) && portValue > 0 ? portValue : 587;
  const secure =
    typeof source.secure === "boolean" ? source.secure : port === 465;

  if (!host || !user || !pass) {
    throw new Error(
      `SMTP profile \"${key}\" is missing host, user, or pass in smtp-profiles file.`,
    );
  }

  return { host, port, user, pass, from, secure };
}

function loadProfilesFromFile(): Record<string, SmtpProfile> {
  const configuredPath = String(process.env.SMTP_PROFILES_FILE || "").trim();
  const candidates = configuredPath
    ? [configuredPath, path.join(process.cwd(), "smtp-profiles.local.json")]
    : [path.join(process.cwd(), "smtp-profiles.local.json")];

  const filePath = candidates.find((candidate) => existsSync(candidate));

  if (!filePath) {
    return {};
  }

  const rawContent = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(rawContent) as
    | Record<string, unknown>
    | { profiles?: Record<string, unknown> };
  const profileMap =
    "profiles" in parsed && parsed.profiles ? parsed.profiles : parsed;

  const result: Record<string, SmtpProfile> = {};

  for (const [key, value] of Object.entries(profileMap)) {
    const normalized = normalizeProfile(value, key);
    if (normalized) {
      result[key] = normalized;
    }
  }

  return result;
}

function loadProfilesFromJsonEnv(): Record<string, SmtpProfile> {
  const rawJson = String(process.env.SMTP_PROFILES_JSON || "").trim();

  if (!rawJson) {
    return {};
  }

  const parsed = JSON.parse(rawJson) as
    | Record<string, unknown>
    | { profiles?: Record<string, unknown> };
  const profileMap =
    "profiles" in parsed && parsed.profiles ? parsed.profiles : parsed;

  const result: Record<string, SmtpProfile> = {};

  for (const [key, value] of Object.entries(profileMap)) {
    const normalized = normalizeProfile(value, key);
    if (normalized) {
      result[key] = normalized;
    }
  }

  return result;
}

function loadProfilesFromEnv(): Record<string, SmtpProfile> {
  const result: Record<string, SmtpProfile> = {};

  const infoHost = process.env.SMTP_INFO_HOST;
  const infoPort = Number(process.env.SMTP_INFO_PORT || 465);
  const infoUser = process.env.SMTP_INFO_USER;
  const infoPass = process.env.SMTP_INFO_PASS;
  const infoFrom = process.env.SMTP_INFO_FROM || "ScholarX <info@scholar-x.org>";

  if (infoHost && infoUser && infoPass) {
    result.info = {
      host: infoHost,
      port: infoPort,
      user: infoUser,
      pass: infoPass,
      from: infoFrom,
      secure: infoPort === 465,
    };
  }

  const gmailHost = process.env.SMTP_PROFILE_GMAIL_HOST || process.env.SMTP_HOST;
  const gmailPort = Number(
    process.env.SMTP_PROFILE_GMAIL_PORT || process.env.SMTP_PORT || 587,
  );
  const gmailUser = process.env.SMTP_PROFILE_GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.SMTP_PROFILE_GMAIL_PASS || process.env.SMTP_PASS;
  const gmailFrom =
    process.env.SMTP_PROFILE_GMAIL_FROM ||
    process.env.SMTP_FROM ||
    "ScholarX <scholarx.team@gmail.com>";

  if (gmailHost && gmailUser && gmailPass) {
    result.gmail = {
      host: gmailHost,
      port: gmailPort,
      user: gmailUser,
      pass: gmailPass,
      from: gmailFrom,
      secure: gmailPort === 465,
    };
  }

  return result;
}

type SmtpProfileRow = {
  key: string;
  host: string;
  port: number;
  secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  from_address: string;
};

async function loadProfilesFromDb(): Promise<Record<string, SmtpProfile>> {
  const { data, error } = await supabase
    .from("smtp_profiles")
    .select("key,host,port,secure,smtp_user,smtp_pass,from_address")
    .returns<SmtpProfileRow[]>();

  if (error) {
    throw new Error(
      `Failed to load SMTP profiles from database: ${error.message}`,
    );
  }

  const result: Record<string, SmtpProfile> = {};

  for (const row of data || []) {
    const normalized = normalizeProfile(
      {
        host: row.host,
        port: row.port,
        user: row.smtp_user,
        pass: row.smtp_pass,
        from: row.from_address,
        secure: row.secure,
      },
      row.key,
    );
    if (normalized) {
      result[row.key] = normalized;
    }
  }

  return result;
}

async function getAllSmtpProfiles(): Promise<Record<string, SmtpProfile>> {
  // Precedence: legacy env < JSON env < local file < database (most dynamic wins).
  const dbProfiles = await loadProfilesFromDb();

  return {
    ...loadProfilesFromEnv(),
    ...loadProfilesFromJsonEnv(),
    ...loadProfilesFromFile(),
    ...dbProfiles,
  };
}

async function toSenderProfile(value: unknown): Promise<SenderProfile> {
  const requested = String(value || "").trim();
  const available = await getAllSmtpProfiles();
  const keys = Object.keys(available);

  if (keys.length === 0) {
    throw new Error(
      "No SMTP profiles configured. Add one in the app, or via env SMTP vars / smtp-profiles.local.json.",
    );
  }

  if (requested && available[requested]) {
    return requested;
  }

  if (available.gmail) {
    return "gmail";
  }

  return keys[0];
}

async function getSmtpSettings(profile: SenderProfile) {
  const profiles = await getAllSmtpProfiles();
  const selected = profiles[profile];

  if (!selected) {
    const keys = Object.keys(profiles);
    throw new Error(
      `Unknown sender profile \"${profile}\". Available profiles: ${keys.join(", ")}`,
    );
  }

  return selected;
}

export async function getMailer(profileInput?: unknown) {
  const profile = await toSenderProfile(profileInput);
  const smtp = await getSmtpSettings(profile);

  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

export async function getSender(profileInput?: unknown) {
  const profile = await toSenderProfile(profileInput);
  return (await getSmtpSettings(profile)).from;
}

export async function listSenderProfiles() {
  const profiles = await getAllSmtpProfiles();

  return Object.entries(profiles).map(([key, value]) => ({
    key,
    from: value.from,
    user: value.user,
  }));
}

const RATE_LIMIT_RESPONSE_CODES = [421, 450, 451, 452, 454];
const RATE_LIMIT_TEXT_PATTERNS = [
  "rate limit",
  "rate-limited",
  "too many",
  "quota",
  "daily user sending limit",
  "try again later",
  "temporarily deferred",
  "temporarily rate limited",
  "5.4.5",
  "4.7.0",
];

export function isRateLimitError(err: unknown): boolean {
  const anyErr = err as
    | { responseCode?: number; response?: string; message?: string }
    | null
    | undefined;

  if (
    anyErr?.responseCode &&
    RATE_LIMIT_RESPONSE_CODES.includes(anyErr.responseCode)
  ) {
    return true;
  }

  const text = `${anyErr?.response || ""} ${anyErr?.message || ""}`.toLowerCase();
  return RATE_LIMIT_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
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
