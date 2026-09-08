import { NextResponse } from "next/server";
import { listSenderProfiles } from "../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = await listSenderProfiles();

    if (profiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No sender profiles configured. Add one in the Sender Profiles section of the app, or via SMTP env vars / smtp-profiles.local.json.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ profiles });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load sender profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
