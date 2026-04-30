"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Mail,
  PencilLine,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WeekStatus = "approved" | "awaiting_approval" | "no_entries";

interface ProfilePayload {
  employee: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    joining_date: string | null;
    job_title: string | null;
    opt_type: "OPT" | "STEM OPT" | null;
    ead_number: string | null;
    ead_start_date: string | null;
    ead_end_date: string | null;
    hours_per_week: number | null;
    pay_rate: number | null;
    work_location: string | null;
    university_name: string | null;
    dso_name: string | null;
    dso_email: string | null;
    i9_completion_date: string | null;
    everify_case_number: string | null;
    everify_status: "Employment Authorized" | "Pending" | "Not Started" | null;
    supervisor_id: string | null;
  };
  supervisor: {
    id: string;
    name: string;
    email: string;
    job_title: string | null;
  } | null;
  documents: Array<{
    document_type: string;
    name: string;
    file_url: string | null;
    status: "uploaded" | "missing";
  }>;
  documents_uploaded_count: number;
  i983_plan: {
    version_date: string | null;
    objective_1_text: string | null;
    objective_1_status: "Not Started" | "In Progress" | "Completed" | null;
    objective_1_project?: { title?: string } | null;
    objective_2_text: string | null;
    objective_2_status: "Not Started" | "In Progress" | "Completed" | null;
    objective_2_project?: { title?: string } | null;
    objective_3_text: string | null;
    objective_3_status: "Not Started" | "In Progress" | "Completed" | null;
    objective_3_project?: { title?: string } | null;
  } | null;
  next_evaluation_due: string | null;
  timesheet: {
    last_approval_date: string | null;
    current_week_status: WeekStatus;
  };
  empty_state: boolean;
}

type EditableSection = "visa" | "university";

interface ComplianceFormValues {
  opt_type: string;
  ead_number: string;
  ead_start_date: string;
  ead_end_date: string;
  i9_completion_date: string;
  everify_case_number: string;
  everify_status: string;
  university_name: string;
  dso_name: string;
  dso_email: string;
}

const EMPTY_COMPLIANCE_FORM_VALUES: ComplianceFormValues = {
  opt_type: "",
  ead_number: "",
  ead_start_date: "",
  ead_end_date: "",
  i9_completion_date: "",
  everify_case_number: "",
  everify_status: "",
  university_name: "",
  dso_name: "",
  dso_email: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return format(parsed, "MMMM d, yyyy");
}

function missingValue() {
  return (
    <span className="text-[rgba(245,245,240,0.5)] italic">
      Not set — contact HR
    </span>
  );
}

function statusBadge(status: string | null) {
  if (status === "Completed") {
    return "bg-[rgba(34,197,94,0.14)] text-green-400 border border-[rgba(34,197,94,0.35)]";
  }
  if (status === "In Progress") {
    return "bg-[rgba(251,191,36,0.14)] text-amber-300 border border-[rgba(251,191,36,0.35)]";
  }
  return "bg-[rgba(245,245,240,0.09)] text-[rgba(245,245,240,0.65)] border border-[rgba(245,245,240,0.2)]";
}

function eVerifyBadge(status: string | null) {
  if (status === "Employment Authorized") {
    return "bg-[rgba(34,197,94,0.14)] text-green-400 border border-[rgba(34,197,94,0.35)]";
  }
  if (status === "Pending") {
    return "bg-[rgba(251,191,36,0.14)] text-amber-300 border border-[rgba(251,191,36,0.35)]";
  }
  return "bg-[rgba(245,245,240,0.09)] text-[rgba(245,245,240,0.65)] border border-[rgba(245,245,240,0.2)]";
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 bg-[#1A1A1A]" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Skeleton className="h-60 bg-[#1A1A1A]" />
          <Skeleton className="h-72 bg-[#1A1A1A]" />
          <Skeleton className="h-56 bg-[#1A1A1A]" />
          <Skeleton className="h-64 bg-[#1A1A1A]" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-105 bg-[#1A1A1A]" />
          <Skeleton className="h-90 bg-[#1A1A1A]" />
        </div>
      </div>
      <Skeleton className="h-16 bg-[#1A1A1A]" />
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-[rgba(255,215,0,0.08)] last:border-b-0">
      <p className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">{label}</p>
      <p className="font-space text-[13px] text-[#F5F5F0] text-right">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`profile-card bg-[#1A1A1A] border border-[rgba(255,215,0,0.16)] rounded-xl p-5 ${className}`}>
      <h2 className="font-space text-[16px] font-semibold text-[#FFD700] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function toComplianceFormValues(employee: ProfilePayload["employee"]): ComplianceFormValues {
  return {
    opt_type: employee.opt_type || "",
    ead_number: employee.ead_number || "",
    ead_start_date: employee.ead_start_date || "",
    ead_end_date: employee.ead_end_date || "",
    i9_completion_date: employee.i9_completion_date || "",
    everify_case_number: employee.everify_case_number || "",
    everify_status: employee.everify_status || "",
    university_name: employee.university_name || "",
    dso_name: employee.dso_name || "",
    dso_email: employee.dso_email || "",
  };
}

export default function EmployeeProfilePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [editingSection, setEditingSection] = useState<EditableSection | null>(null);
  const [formValues, setFormValues] = useState<ComplianceFormValues>(EMPTY_COMPLIANCE_FORM_VALUES);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!session?.user?.id) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/employee/profile/${session.user.id}`);
        if (!response.ok) throw new Error("Failed to load profile");
        const data = (await response.json()) as ProfilePayload;
        setProfile(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session?.user?.id]);

  const initials = useMemo(() => {
    const name = profile?.employee.name || session?.user?.name || "";
    return (
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"
    );
  }, [profile?.employee.name, session?.user?.name]);

  if (status === "loading" || loading || !profile) {
    return <ProfileSkeleton />;
  }

  if (profile.empty_state) {
    return (
      <div className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.16)] rounded-xl p-12 text-center">
        <p className="font-space text-[15px] text-[rgba(245,245,240,0.7)]">
          Your profile is being set up. Please check back after your HR onboarding is complete.
        </p>
      </div>
    );
  }

  const eadEndDate = profile.employee.ead_end_date
    ? new Date(profile.employee.ead_end_date)
    : null;
  const eadDaysRemaining = eadEndDate
    ? differenceInCalendarDays(eadEndDate, new Date())
    : null;
  const eadExpiringSoon =
    eadDaysRemaining !== null && eadDaysRemaining <= 90;

  const evaluationDueDate = profile.next_evaluation_due
    ? parseISO(profile.next_evaluation_due)
    : null;
  const evaluationDaysRemaining = evaluationDueDate
    ? differenceInCalendarDays(evaluationDueDate, new Date())
    : null;

  const hasObjectives = !!(
    profile.i983_plan &&
    (profile.i983_plan.objective_1_text ||
      profile.i983_plan.objective_2_text ||
      profile.i983_plan.objective_3_text)
  );

  const beginEditing = (section: EditableSection) => {
    setSaveError(null);
    setFormValues(toComplianceFormValues(profile.employee));
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setFormValues(toComplianceFormValues(profile.employee));
    setSaveError(null);
    setEditingSection(null);
  };

  const handleSave = async (section: EditableSection) => {
    const visaPayload = {
      opt_type: formValues.opt_type || null,
      ead_number: formValues.ead_number || null,
      ead_start_date: formValues.ead_start_date || null,
      ead_end_date: formValues.ead_end_date || null,
      i9_completion_date: formValues.i9_completion_date || null,
      everify_case_number: formValues.everify_case_number || null,
      everify_status: formValues.everify_status || null,
    };
    const universityPayload = {
      university_name: formValues.university_name || null,
      dso_name: formValues.dso_name || null,
      dso_email: formValues.dso_email || null,
    };

    if (
      section === "visa" &&
      formValues.ead_start_date &&
      formValues.ead_end_date &&
      formValues.ead_end_date < formValues.ead_start_date
    ) {
      setSaveError("EAD End Date must be on or after EAD Start Date.");
      return;
    }

    if (section === "university" && formValues.dso_email && !EMAIL_PATTERN.test(formValues.dso_email)) {
      setSaveError("DSO Email must be a valid email address.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/employee/profile/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section === "visa" ? visaPayload : universityPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        setSaveError(error.message ?? "Failed to save. Please try again.");
        return;
      }

      const updatedEmployee = (await response.json()) as ProfilePayload["employee"];
      setProfile((current) =>
        current
          ? {
              ...current,
              employee: {
                ...current.employee,
                ...updatedEmployee,
              },
            }
          : current,
      );
      setFormValues(toComplianceFormValues({ ...profile.employee, ...updatedEmployee }));
      setEditingSection(null);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName =
    "w-full rounded-md border border-[rgba(255,215,0,0.18)] bg-[#0F0F0F] px-3 py-2 font-space text-sm text-white outline-none transition focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.12)]";

  return (
    <div className="employee-profile-page space-y-6">
      <div className="print-only-header">
        <span>TanTech LLC — Employee Profile</span>
        <span>{format(new Date(), "MMMM d, yyyy")}</span>
      </div>

      <div className="profile-card bg-[#1A1A1A] border border-[rgba(255,215,0,0.2)] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-[#1A1A1A] border border-[rgba(255,215,0,0.35)] flex items-center justify-center overflow-hidden">
              {profile.employee.avatar_url ? (
                <img
                  src={profile.employee.avatar_url}
                  alt={profile.employee.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bebas text-3xl text-[#FFD700]">{initials}</span>
              )}
            </div>
            <div>
              <h1 className="font-space text-2xl font-bold text-white">{profile.employee.name}</h1>
              <p className="font-space text-sm text-[#A0A0A0] mt-1">
                {profile.employee.job_title || "Not set — contact HR"}
              </p>
              <div className="flex items-center gap-2 mt-3">
                {profile.employee.opt_type === "STEM OPT" && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#FFD700] text-[#0A0A0A]">
                    STEM OPT
                  </span>
                )}
                {profile.employee.opt_type === "OPT" && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#6B7280] text-white">
                    OPT
                  </span>
                )}
                {profile.employee.everify_status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${eVerifyBadge(profile.employee.everify_status)}`}>
                    {profile.employee.everify_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`${eadExpiringSoon ? "border border-red-500 rounded-full px-4 py-2" : ""}`}>
            {eadEndDate ? (
              <div className="text-right">
                <p className={`font-space text-sm ${eadExpiringSoon ? "text-red-400" : "text-[#FFD700]"}`}>
                  EAD Expires: {format(eadEndDate, "MMMM d, yyyy")}
                </p>
                <p className={`font-space text-xs mt-1 ${eadExpiringSoon ? "text-red-400" : "text-[#FFD700]"}`}>
                  {eadExpiringSoon && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                  {eadDaysRemaining} days remaining
                </p>
              </div>
            ) : (
              <p className="font-space text-sm text-[rgba(245,245,240,0.5)]">
                EAD expiry not on file
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card title="Employment Details">
            <KeyValueRow label="Joining Date" value={formatDate(profile.employee.joining_date) || missingValue()} />
            <KeyValueRow label="Job Title" value={profile.employee.job_title || missingValue()} />
            <KeyValueRow
              label="Hours Per Week"
              value={
                profile.employee.hours_per_week != null
                  ? `${profile.employee.hours_per_week} hrs/week`
                  : missingValue()
              }
            />
            <KeyValueRow
              label="Pay Rate"
              value={
                profile.employee.pay_rate != null && Number.isFinite(Number(profile.employee.pay_rate))
                  ? `$${Number(profile.employee.pay_rate).toFixed(2)}/hr`
                  : missingValue()
              }
            />
            <KeyValueRow label="Work Location" value={profile.employee.work_location || missingValue()} />
            <KeyValueRow label="OPT Type" value={profile.employee.opt_type || missingValue()} />
          </Card>

          <Card title="Visa & EAD Information">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-space text-xs uppercase tracking-[0.2em] text-[rgba(245,245,240,0.45)]">
                Visa & EAD details
              </p>
              {editingSection !== "visa" ? (
                <Button
                  variant="outline"
                  onClick={() => beginEditing("visa")}
                  className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space gap-2"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}
            </div>

            {editingSection === "visa" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">OPT Type</span>
                    <select
                      value={formValues.opt_type}
                      onChange={(event) => setFormValues((current) => ({ ...current, opt_type: event.target.value }))}
                      className={inputClassName}
                    >
                      <option value="">Select...</option>
                      <option value="OPT">OPT</option>
                      <option value="STEM OPT">STEM OPT</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">EAD Card Number</span>
                    <input
                      value={formValues.ead_number}
                      onChange={(event) => setFormValues((current) => ({ ...current, ead_number: event.target.value }))}
                      placeholder="e.g. SRC-12-345-67890"
                      className={inputClassName}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">EAD Start Date</span>
                    <input
                      type="date"
                      value={formValues.ead_start_date}
                      onChange={(event) => setFormValues((current) => ({ ...current, ead_start_date: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">EAD End Date</span>
                    <input
                      type="date"
                      value={formValues.ead_end_date}
                      onChange={(event) => setFormValues((current) => ({ ...current, ead_end_date: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">I-9 Completion Date</span>
                    <input
                      type="date"
                      value={formValues.i9_completion_date}
                      onChange={(event) => setFormValues((current) => ({ ...current, i9_completion_date: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">E-Verify Case Number</span>
                    <input
                      value={formValues.everify_case_number}
                      onChange={(event) => setFormValues((current) => ({ ...current, everify_case_number: event.target.value }))}
                      className={inputClassName}
                    />
                  </label>
                </div>
                <label className="space-y-2 block">
                  <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">E-Verify Status</span>
                  <select
                    value={formValues.everify_status}
                    onChange={(event) => setFormValues((current) => ({ ...current, everify_status: event.target.value }))}
                    className={inputClassName}
                  >
                    <option value="">Select...</option>
                    <option value="Employment Authorized">Employment Authorized</option>
                    <option value="Pending">Pending</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </label>
                {saveError && <p className="font-space text-sm text-red-400">{saveError}</p>}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={() => handleSave("visa")}
                    disabled={saving}
                    className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <KeyValueRow label="OPT Type" value={profile.employee.opt_type || missingValue()} />
                <KeyValueRow label="EAD Card Number" value={profile.employee.ead_number || missingValue()} />
                <KeyValueRow label="EAD Start Date" value={formatDate(profile.employee.ead_start_date) || missingValue()} />
                <KeyValueRow
                  label="EAD End Date"
                  value={
                    profile.employee.ead_end_date ? (
                      <span className={eadExpiringSoon ? "text-red-400" : "text-[#F5F5F0]"}>
                        {eadExpiringSoon && <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />}
                        {formatDate(profile.employee.ead_end_date)}
                      </span>
                    ) : (
                      missingValue()
                    )
                  }
                />
                <KeyValueRow label="I-9 Completion Date" value={formatDate(profile.employee.i9_completion_date) || missingValue()} />
                <KeyValueRow label="E-Verify Case Number" value={profile.employee.everify_case_number || missingValue()} />
                <KeyValueRow label="E-Verify Status" value={profile.employee.everify_status || missingValue()} />
              </>
            )}
          </Card>

          <Card title="University & DSO Information">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-space text-xs uppercase tracking-[0.2em] text-[rgba(245,245,240,0.45)]">
                University & DSO details
              </p>
              {editingSection !== "university" ? (
                <Button
                  variant="outline"
                  onClick={() => beginEditing("university")}
                  className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space gap-2"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}
            </div>

            {editingSection === "university" ? (
              <div className="space-y-4">
                <label className="space-y-2 block">
                  <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">University Name</span>
                  <input
                    value={formValues.university_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, university_name: event.target.value }))}
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">DSO Name</span>
                  <input
                    value={formValues.dso_name}
                    onChange={(event) => setFormValues((current) => ({ ...current, dso_name: event.target.value }))}
                    className={inputClassName}
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">DSO Email</span>
                  <input
                    type="email"
                    value={formValues.dso_email}
                    onChange={(event) => setFormValues((current) => ({ ...current, dso_email: event.target.value }))}
                    className={inputClassName}
                  />
                </label>
                {saveError && <p className="font-space text-sm text-red-400">{saveError}</p>}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={() => handleSave("university")}
                    disabled={saving}
                    className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <KeyValueRow label="University Name" value={profile.employee.university_name || missingValue()} />
                <KeyValueRow label="DSO Name" value={profile.employee.dso_name || missingValue()} />
                <KeyValueRow
                  label="DSO Email"
                  value={
                    profile.employee.dso_email ? (
                      <a href={`mailto:${profile.employee.dso_email}`} className="text-[#FFD700] hover:underline">
                        {profile.employee.dso_email}
                      </a>
                    ) : (
                      missingValue()
                    )
                  }
                />
              </>
            )}
          </Card>

          <Card title="My Supervisor">
            {!profile.employee.supervisor_id || !profile.supervisor ? (
              <p className="font-space text-sm text-[rgba(245,245,240,0.65)]">
                No supervisor assigned. Please contact HR.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-space text-[16px] font-semibold text-white">{profile.supervisor.name}</p>
                  <p className="font-space text-xs text-[rgba(245,245,240,0.6)] mt-1">
                    {profile.supervisor.job_title || "Not set — contact HR"}
                  </p>
                  <a href={`mailto:${profile.supervisor.email === "admin@tantechllc.com" ? "omer@tantech-llc.com" : profile.supervisor.email}`} className="font-space text-sm text-[#FFD700] hover:underline mt-2 inline-block">
                    {profile.supervisor.email === "admin@tantechllc.com" ? "omer@tantech-llc.com" : profile.supervisor.email}
                  </a>
                </div>
                <a
                  href={`mailto:${profile.supervisor.email === "admin@tantechllc.com" ? "omer@tantech-llc.com" : profile.supervisor.email}`}
                  className="inline-flex items-center rounded-md border border-[#FFD700] px-3 py-2 text-sm text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)]"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Supervisor
                </a>
                <p className="font-space text-sm text-[rgba(245,245,240,0.75)]">
                  {profile.timesheet.last_approval_date
                    ? `Last approved: ${format(parseISO(profile.timesheet.last_approval_date), "MMMM d, yyyy")}`
                    : "No approvals yet"}
                </p>
                {profile.timesheet.current_week_status === "approved" && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-[rgba(34,197,94,0.14)] text-green-400 border border-[rgba(34,197,94,0.35)]">
                    ✓ This week approved
                  </span>
                )}
                {profile.timesheet.current_week_status === "awaiting_approval" && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-[rgba(251,191,36,0.14)] text-amber-300 border border-[rgba(251,191,36,0.35)]">
                    ⏳ Awaiting approval
                  </span>
                )}
                {profile.timesheet.current_week_status === "no_entries" && (
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-[rgba(245,245,240,0.09)] text-[rgba(245,245,240,0.65)] border border-[rgba(245,245,240,0.2)]">
                    No entries this week
                  </span>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="My Documents" className="print-break-before-docs">
            <p className="font-space text-2xl text-white font-semibold">
              {profile.documents_uploaded_count} of 9 documents on file
            </p>
            <div className="mt-3 h-2 rounded-full bg-[rgba(245,245,240,0.12)] overflow-hidden">
              <div
                className="h-full bg-[#FFD700]"
                style={{ width: `${(profile.documents_uploaded_count / 9) * 100}%` }}
              />
            </div>

            <div className="mt-5 space-y-2">
              {profile.documents.map((doc) => {
                const uploaded = !!doc.file_url && doc.status === "uploaded";
                return (
                  <div key={doc.document_type} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {uploaded ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      )}
                      <span className="font-space text-sm text-[#F5F5F0] truncate">{doc.name}</span>
                    </div>
                    {uploaded ? (
                      <button
                        type="button"
                        className="text-xs text-[#FFD700] hover:underline"
                        onClick={() => window.open(doc.file_url!, "_blank", "noopener,noreferrer")}
                      >
                        View
                      </button>
                    ) : (
                      <span className="font-space text-xs text-red-400 italic">Missing</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="font-space text-sm mt-4">
              {profile.documents_uploaded_count < 9 ? (
                <span className="text-[rgba(245,245,240,0.6)] italic">
                  To upload missing documents, go to My Documents in your dashboard.
                </span>
              ) : (
                <span className="text-green-400">✓ All documents on file.</span>
              )}
            </p>
          </Card>

          <Card title="My Training Plan (I-983)">
            <div className="space-y-2">
              <p className="font-space text-sm text-[rgba(245,245,240,0.65)]">Next Evaluation Due</p>
              <p className="font-space text-lg text-white font-semibold">
                {evaluationDueDate ? format(evaluationDueDate, "MMMM d, yyyy") : "Not set"}
              </p>
              {evaluationDaysRemaining !== null && (
                <p
                  className={`font-space text-sm ${
                    evaluationDaysRemaining < 30
                      ? "text-red-400"
                      : evaluationDaysRemaining <= 60
                        ? "text-amber-300"
                        : "text-white"
                  }`}
                >
                  {evaluationDaysRemaining} days remaining
                </p>
              )}
              <p className="font-space text-sm text-[rgba(245,245,240,0.65)] mt-3">
                I-983 Version Date:{" "}
                <span className="text-[#F5F5F0]">
                  {formatDate(profile.i983_plan?.version_date || null) || "Not set"}
                </span>
              </p>
            </div>

            {!hasObjectives ? (
              <p className="font-space text-sm text-[rgba(245,245,240,0.6)] text-center py-8">
                Your training plan is being set up by your supervisor. Check back soon.
              </p>
            ) : (
              <div className="space-y-4 mt-5">
                {[
                  {
                    label: "Objective 1",
                    text: profile.i983_plan?.objective_1_text,
                    status: profile.i983_plan?.objective_1_status,
                    project: profile.i983_plan?.objective_1_project?.title,
                  },
                  {
                    label: "Objective 2",
                    text: profile.i983_plan?.objective_2_text,
                    status: profile.i983_plan?.objective_2_status,
                    project: profile.i983_plan?.objective_2_project?.title,
                  },
                  {
                    label: "Objective 3",
                    text: profile.i983_plan?.objective_3_text,
                    status: profile.i983_plan?.objective_3_status,
                    project: profile.i983_plan?.objective_3_project?.title,
                  },
                ]
                  .filter((objective) => !!objective.text)
                  .map((objective) => (
                    <div key={objective.label} className="min-w-0 rounded-lg border border-[rgba(255,215,0,0.12)] p-3">
                      <p className="font-space text-sm text-[#FFD700] font-semibold">{objective.label}</p>
                      <p className="font-space text-sm text-[#F5F5F0] mt-2 whitespace-pre-wrap wrap-break-word overflow-hidden">{objective.text}</p>
                      <span className={`inline-flex mt-3 rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(objective.status || "Not Started")}`}>
                        {objective.status || "Not Started"}
                      </span>
                      <p className="font-space text-xs text-[rgba(245,245,240,0.6)] mt-2">
                        Mapped Project: {objective.project || "Not set — contact HR"}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="profile-card print-hide bg-[#1A1A1A] border border-[rgba(255,215,0,0.16)] rounded-xl p-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center rounded-md bg-[#FFD700] px-4 py-2 text-sm font-semibold text-[#0A0A0A] hover:bg-[#FFE44D]"
        >
          <Download className="h-4 w-4 mr-2" />
          Save Profile as PDF
        </button>
      </div>

      <div className="print-only-footer">Archway Compliance Platform — Confidential</div>

      <style jsx global>{`
        .print-only-header,
        .print-only-footer {
          display: none;
        }

        @media print {
          html,
          body,
          body * {
            background: #ffffff !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
          }

          header,
          aside,
          nav,
          .print-hide,
          [data-radix-popper-content-wrapper] {
            display: none !important;
          }

          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .employee-profile-page {
            padding-top: 56px;
            padding-bottom: 34px;
          }

          .print-only-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            display: flex !important;
            justify-content: space-between;
            border-bottom: 1px solid #d1d5db;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
          }

          .print-only-footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            display: block !important;
            text-align: center;
            border-top: 1px solid #d1d5db;
            padding: 8px 0;
            font-size: 11px;
            z-index: 1000;
          }

          .profile-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #e5e7eb !important;
          }

          .print-break-before-docs {
            break-before: page;
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
