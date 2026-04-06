import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";

// Manual trigger for daily reminder (for testing)
export async function POST() {
  try {
    await inngest.send({
      name: "tantech-upskill/daily-reminder.requested",
      data: {},
    });

    return NextResponse.json({ message: "Daily reminder triggered" });
  } catch (error) {
    console.error("Error triggering daily reminder:", error);
    return NextResponse.json(
      { message: "Failed to trigger reminder" },
      { status: 500 },
    );
  }
}
