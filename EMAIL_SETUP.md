# Daily Email Reminder System Setup

## ✅ Current Status

Your email system is **fully configured and ready to deploy**! Here's what's set up:

### 1. Resend Configuration

- ✅ Domain verified: `tantech-llc.com`
- ✅ Sender email: `hr@tantech-llc.com`
- ✅ API key configured in `.env.local`

### 2. Inngest Configuration

- ✅ Function created: `dailyReminder`
- ✅ Cron schedule: Every day at **9:00 AM UTC** (3:00 AM CT / 4:00 AM CDT)
- ✅ API endpoint: `/api/inngest`

### 3. Email Logic

The system sends daily task reminders based on **per-employee enrollment start dates**:

- Each employee has their own start date for each project
- Days unlock at 9:00 AM Central Time
- Only sends emails if tasks are incomplete
- Respects `daily_reminder_emails` flag on projects

---

## 🚀 How It Works

### Automatic Daily Schedule

**9:00 AM UTC (3:00 AM CT / 4:00 AM CDT)** - Daily reminder cron runs:

1. **Fetches active enrollments** - Gets all employees enrolled in active, published projects with `daily_reminder_emails = true`

2. **Calculates unlocked days** - For each enrollment:
   - Uses the employee's individual `start_date` from the enrollment
   - Calculates which day should be unlocked today using Central Time
   - Skips if project hasn't started yet or is completed

3. **Checks completion status**:
   - Fetches tasks for today's day
   - Checks if employee already completed all required tasks
   - Only sends email if there are incomplete tasks

4. **Sends personalized email**:
   - Lists remaining tasks with icons (📖 reading, 💻 coding, ❓ quiz, 🎥 video)
   - Includes direct link to the day's tasks
   - Branded TanTech design with gold/black theme

### Email Example

**Subject:** `React Fundamentals - Day 5 Tasks`

**Content:**

```
Hi John Doe,

You have new tasks available for React Fundamentals!

Day 5: Components and Props
2 tasks remaining

Today's Tasks:
📖 Reading: Understanding React Components
💻 Coding Challenge: Build Your First Component

[Start Learning →]
```

---

## 🔧 Local Development & Testing

### Option 1: Using Inngest Dev Server (Recommended)

1. **Install Inngest CLI** (if not already):

   ```bash
   npm install -g inngest-cli
   ```

2. **Start your Next.js dev server**:

   ```bash
   npm run dev
   ```

3. **In a separate terminal, start Inngest Dev Server**:

   ```bash
   inngest dev
   ```

4. **Access Inngest UI**: Open http://localhost:8288
   - You'll see your `dailyReminder` function registered
   - Click "Trigger" to manually test email sending
   - View logs and execution history

### Option 2: Manual API Testing

Create a test route to manually trigger the function:

**File:** `src/app/api/test-email/route.ts`

```typescript
import { NextResponse } from "next/server";
import { dailyReminder } from "@/lib/inngest-functions";

export async function GET() {
  try {
    // Manually invoke the function
    const result = await dailyReminder.handler({
      step: {
        run: async (id: string, fn: () => any) => await fn(),
      },
    } as any);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
```

Then visit: http://localhost:3000/api/test-email

---

## 🌐 Production Deployment (Vercel)

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables:

```env
# Resend
RESEND_API_KEY=re_9hGdC3JC_ABoadhqFWYG692NG1k197wFs
RESEND_FROM_EMAIL=hr@tantech-llc.com

# Inngest
INNGEST_EVENT_KEY=BY4shWAEEWZ9FMf0tc_uMjOQYImXjOKPE8Xz34fBpBWhD3S78I8uIO3qDmVz5dMOoZ9Tr_80ExseHMgpTFXWJQ
INNGEST_SIGNING_KEY=signkey-prod-90a708817e5e55ad0663f186986bdd0322759cccc84cc87a8ceda2f43710a242

# Remove INNGEST_DEV in production
# INNGEST_DEV=1  <-- Don't set this in production

# Next.js
NEXTAUTH_URL=https://your-domain.vercel.app

# Supabase (your existing variables)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

Or push to your connected Git repository (GitHub/GitLab).

### Step 3: Register with Inngest Cloud

Once deployed:

1. Go to https://app.inngest.com (or your Inngest dashboard)
2. Navigate to your app
3. Click "Sync" or "Register Functions"
4. Provide your Vercel URL: `https://your-domain.vercel.app/api/inngest`
5. Inngest will automatically discover the `dailyReminder` function

**That's it!** The cron will now run automatically every day at 9 AM UTC.

---

## 📊 Monitoring & Logs

### Inngest Dashboard

View execution logs at https://app.inngest.com:

- See all email send attempts
- Track success/failure rates
- View detailed execution traces
- Monitor cron schedule

### Resend Dashboard

View email delivery at https://resend.com/emails:

- See sent/delivered/bounced counts
- View individual email content
- Check delivery times
- Monitor domain reputation

---

## 🎨 Customizing the Email Template

Edit the email HTML in `src/lib/inngest-functions.ts`, function `generateEmailHTML()`:

### Current Design Features:

- **Header**: Black background with gold "TANTECH UPSKILL" logo
- **Body**: White card with task list
- **Task Icons**: 📖 reading, 💻 coding, ❓ quiz, 🎥 video
- **CTA Button**: Gold button with "Start Learning" link
- **Footer**: Gray footer with copyright

### Customization Tips:

- Change colors: Replace `#FFD700` (gold) and `#0A0A0A` (black)
- Update fonts: Modify `font-family` styles
- Add images: Use `<img src="https://...">` for logos
- Modify layout: Adjust padding, margins, table structure

---

## 🛠 Advanced Configuration

### Change Email Send Time

Edit `src/lib/inngest-functions.ts`:

```typescript
triggers: [{ cron: "0 9 * * *" }], // Current: 9 AM UTC
// Examples:
// "0 8 * * *"  - 8 AM UTC (2 AM CT / 3 AM CDT)
// "0 13 * * *" - 1 PM UTC (7 AM CT / 8 AM CDT)
// "0 0 * * 1-5" - Midnight UTC, Monday-Friday only
```

[Cron syntax help](https://crontab.guru/)

### Disable Emails for a Project

In admin panel → Edit Project → Toggle off "Daily Reminder Emails"

Or via database:

```sql
UPDATE projects SET daily_reminder_emails = false WHERE id = 'project-id';
```

### Send Test Email to Yourself

Temporarily modify the email logic to always send to your email:

```typescript
to: user.email, // Change to: "your-test@email.com"
```

---

## ❓ FAQ

**Q: When will employees receive their first email?**  
A: The first email is sent on their start date at 9 AM UTC, assuming there are tasks for Day 1.

**Q: What if an employee completes all tasks before 9 AM?**  
A: They won't receive an email for that day (the system checks completion status before sending).

**Q: Can I send emails at a different time per project?**  
A: Not currently - all projects use the same cron schedule. You could add per-project time settings by creating multiple Inngest functions.

**Q: Are emails sent on weekends?**  
A: Yes, unless you modify the cron pattern to exclude weekends (use `0 9 * * 1-5` for weekdays only).

**Q: What happens if Resend is down?**  
A: Inngest will retry failed sends automatically (3 retries with exponential backoff).

---

## 📝 Next Steps

✅ **Your email system is ready!** Here's what to do:

1. **Test locally** using Inngest Dev Server
2. **Deploy to Vercel**
3. **Register with Inngest Cloud**
4. **Create test employees** with start dates = tomorrow
5. **Monitor first email send** in Inngest + Resend dashboards

**Need help?** Check:

- [Inngest Docs](https://www.inngest.com/docs)
- [Resend Docs](https://resend.com/docs)
- Your Inngest dashboard for execution logs
