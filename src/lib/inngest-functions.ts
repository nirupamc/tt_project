import { inngest } from "./inngest";

export const dailyReminder = inngest.createFunction(
  { id: "daily-reminder", cron: "0 8 * * *" }, // 8 AM every day
  async ({
    step,
  }: {
    step: {
      run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
    };
  }) => {
    // We'll fill this in later
    await step.run("send-reminders", async () => {
      console.log("Daily reminder triggered");
      return { sent: true };
    });
  }
);