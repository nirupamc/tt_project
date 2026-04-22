import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      message:
        "Deprecated route. Use /api/cron/daily-alerts or Inngest handlers for scheduled reminders.",
    },
    { status: 410 },
  );
}
