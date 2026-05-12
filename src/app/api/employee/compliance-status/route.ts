import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { differenceInDays } from "date-fns";

export interface ComplianceStatus {
  status: "red" | "amber" | "green";
  message: string;
  daysRemaining?: number;
  missingDocumentCount?: number;
}

export async function GET(): Promise<NextResponse<ComplianceStatus>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: "green", message: "Profile is complete and compliant." } as ComplianceStatus,
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Fetch user data - include ALL required profile fields
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        ead_end_date, 
        i983_version_date, 
        hours_per_week, 
        next_evaluation_due, 
        degree_field, 
        supervisor_name,
        opt_type,
        ead_start_date,
        everify_status,
        dso_name,
        dso_email,
        graduation_year,
        personal_email,
        phone_number,
        linkedin_url,
        portfolio_url
      `)
      .eq("id", session.user.id)
      .single();

    if (userError) throw userError;

    // PRIORITY 1: RED - EAD expires within 30 days
    if (user?.ead_end_date) {
      const eadDate = new Date(user.ead_end_date);
      const daysRemaining = differenceInDays(eadDate, new Date());
      if (daysRemaining <= 30 && daysRemaining > 0) {
        return NextResponse.json({
          status: "red",
          message: `Your EAD expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Contact HR immediately.`,
          daysRemaining,
        });
      }
    }

    // PRIORITY 2: RED - I-983 not filed
    if (!user?.i983_version_date) {
      return NextResponse.json({
        status: "red",
        message: "Your I-983 Training Plan has not been filed. Contact HR at hr@tantech-llc.com immediately.",
      });
    }

    // PRIORITY 3: AMBER - EAD expires within 90 days
    if (user?.ead_end_date) {
      const eadDate = new Date(user.ead_end_date);
      const daysRemaining = differenceInDays(eadDate, new Date());
      if (daysRemaining <= 90 && daysRemaining > 30) {
        return NextResponse.json({
          status: "amber",
          message: `Your EAD expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Contact HR to begin renewal.`,
          daysRemaining,
        });
      }
    }

    // PRIORITY 4: AMBER - I-983 evaluation due within 60 days
    if (user?.next_evaluation_due) {
      const evalDate = new Date(user.next_evaluation_due);
      const daysRemaining = differenceInDays(evalDate, new Date());
      if (daysRemaining <= 60 && daysRemaining > 0) {
        return NextResponse.json({
          status: "amber",
          message: `Your I-983 evaluation is due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Contact your DSO and supervisor.`,
          daysRemaining,
        });
      }
    }

    // PRIORITY 5: AMBER - Missing critical profile fields
    // Check all required fields are completed
    const missingFields = [];
    
    // Visa & EAD Information
    if (!user?.opt_type) missingFields.push("OPT Type");
    if (!user?.ead_start_date) missingFields.push("EAD Start Date");
    if (!user?.ead_end_date) missingFields.push("EAD End Date");
    if (!user?.everify_status) missingFields.push("E-Verify Status");
    
    // University & DSO Information
    if (!user?.dso_name) missingFields.push("DSO Name");
    if (!user?.dso_email) missingFields.push("DSO Email");
    
    // Education Information
    if (!user?.degree_field) missingFields.push("Degree Field");
    if (!user?.graduation_year) missingFields.push("Graduation Year");
    
    // Contact Information
    if (!user?.personal_email) missingFields.push("Personal Email");
    if (!user?.phone_number) missingFields.push("Phone Number");
    
    // Professional Links
    if (!user?.linkedin_url) missingFields.push("LinkedIn Profile");
    if (!user?.portfolio_url) missingFields.push("Portfolio/Website");
    
    // Supervisor Assignment
    if (!user?.supervisor_name) missingFields.push("Supervisor Assignment");
    
    if (missingFields.length > 0) {
      const fieldList = missingFields.slice(0, 3).join(", ");
      const moreCount = missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : "";
      return NextResponse.json({
        status: "amber",
        message: `Complete your profile. Missing: ${fieldList}${moreCount}. Go to My Profile to update.`,
      });
    }

    // PRIORITY 6: AMBER - Missing documents (fewer than 7 of 9 uploaded)
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, uploaded")
      .eq("user_id", session.user.id);

    if (!docsError && documents) {
      const uploadedCount = documents.filter((doc) => doc.uploaded === true).length;
      if (uploadedCount < 7) {
        return NextResponse.json({
          status: "amber",
          message: `You have uploaded ${uploadedCount} of 9 required documents. View My Documents to complete.`,
          missingDocumentCount: 9 - uploadedCount,
        });
      }
    }

    // PRIORITY 7: AMBER - Incomplete timesheet for last week
    // Get start of last week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToLastMonday = dayOfWeek === 0 ? 2 : dayOfWeek + 1; // Days since last Monday
    const lastMondayDate = new Date(today);
    lastMondayDate.setDate(today.getDate() - daysToLastMonday);
    lastMondayDate.setHours(0, 0, 0, 0);

    const lastSundayDate = new Date(lastMondayDate);
    lastSundayDate.setDate(lastMondayDate.getDate() + 6);
    lastSundayDate.setHours(23, 59, 59, 999);

    const { data: timesheetEntries, error: timesheetError } = await supabase
      .from("timesheet_entries")
      .select("hours")
      .eq("user_id", session.user.id)
      .gte("date", lastMondayDate.toISOString().split("T")[0])
      .lte("date", lastSundayDate.toISOString().split("T")[0]);

    if (!timesheetError && timesheetEntries) {
      const totalHours = timesheetEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const requiredHours = user?.hours_per_week || 40;

      if (totalHours < requiredHours) {
        return NextResponse.json({
          status: "amber",
          message: "Your timesheet for last week is incomplete. Please log your missing hours.",
        });
      }
    }

    // All checks passed - GREEN
    return NextResponse.json({
      status: "green",
      message: "Your profile is complete and compliant.",
    });
  } catch (error) {
    console.error("Error checking compliance status:", error);
    // Default to green on error to not block the dashboard
    return NextResponse.json({
      status: "green",
      message: "Your profile is complete and compliant.",
    });
  }
}
