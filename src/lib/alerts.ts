import { addDays, differenceInCalendarDays, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { createAdminClient } from "@/lib/supabase";

export type AlertType = "ead_expiry" | "i983_due" | "timesheet_missing" | "approval_pending";

export function formatLongDate(date: Date) {
  return format(date, "MMMM d, yyyy");
}

export function getPreviousFullWeek(reference = new Date()) {
  const previousWeekReference = subWeeks(reference, 1);
  const weekStart = startOfWeek(previousWeekReference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(previousWeekReference, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

export function getCurrentWeek(reference = new Date()) {
  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(reference, { weekStartsOn: 1 });
  return { weekStart, weekEnd };
}

export function weekRangeLabel(weekStart: Date, weekEnd: Date) {
  return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
}

export function daysRemaining(target: Date, from = new Date()) {
  return differenceInCalendarDays(target, from);
}

export function withinInclusiveWindow(date: Date, start = new Date(), daysAhead: number) {
  const end = addDays(start, daysAhead);
  return date >= startOfDay(start) && date <= endOfDay(end);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function hasSentAlertToday(employeeId: string, alertType: AlertType) {
  const supabase = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = await supabase
    .from("sent_alerts")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("alert_type", alertType)
    .eq("sent_date", today)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function hasSentWeeklyAlert(employeeId: string, alertType: AlertType, weekStartDate: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sent_alerts")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("alert_type", alertType)
    .eq("week_start_date", weekStartDate)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function logAlertSent({
  employeeId,
  alertType,
  weekStartDate,
}: {
  employeeId: string;
  alertType: AlertType;
  weekStartDate?: string;
}) {
  const supabase = createAdminClient();
  const payload: {
    employee_id: string;
    alert_type: AlertType;
    sent_date: string;
    week_start_date?: string;
  } = {
    employee_id: employeeId,
    alert_type: alertType,
    sent_date: format(new Date(), "yyyy-MM-dd"),
  };
  if (weekStartDate) payload.week_start_date = weekStartDate;
  await supabase.from("sent_alerts").insert(payload);
}

export async function createNotification({
  recipientUserId,
  message,
  type,
  relatedUrl,
}: {
  recipientUserId: string;
  message: string;
  type: AlertType;
  relatedUrl?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    recipient_user_id: recipientUserId,
    message,
    type,
    related_url: relatedUrl || null,
  });
}
