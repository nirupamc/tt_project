import { serve } from "inngest/next";
import {
  inngest,
  dailyReminderEmail,
  autoCompleteTasksCron,
} from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyReminderEmail, autoCompleteTasksCron],
});
