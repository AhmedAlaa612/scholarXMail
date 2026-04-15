import { NextResponse } from "next/server";
import { listSenderProfiles } from "../../../lib/server";

export async function GET() {
  try {
    const profiles = listSenderProfiles();

    if (profiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No sender profiles configured. Add SMTP env vars or smtp-profiles.local.json.",
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
