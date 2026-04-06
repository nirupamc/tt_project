import { NextResponse } from "next/server";
import { getUnlockedDayCount } from "@/lib/day-unlock";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || "2026-04-05";
  const totalDays = parseInt(searchParams.get("totalDays") || "2");

  const now = new Date();

  // Get CT time breakdown
  const ctFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "long",
  });

  const unlockedCount = getUnlockedDayCount(startDate, totalDays);

  return NextResponse.json({
    serverUTCTime: now.toISOString(),
    serverCTTime: ctFormatter.format(now),
    startDate,
    totalDays,
    unlockedDayCount: unlockedCount,
    days: Array.from({ length: totalDays }, (_, i) => ({
      dayNumber: i + 1,
      isUnlocked: i + 1 <= unlockedCount,
    })),
  });
}
