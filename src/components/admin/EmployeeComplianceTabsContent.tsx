"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import type { I983Plan, Project, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeComplianceTabsContentProps {
  employee: User;
}

interface SupervisorOption {
  id: string;
  name: string;
  role: string;
  job_title?: string | null;
}

const OBJECTIVE_STATUS = ["Not Started", "In Progress", "Completed"] as const;
type ObjectiveStatus = (typeof OBJECTIVE_STATUS)[number];

interface ComplianceFormState {
  joining_date: string;
  opt_type: string;
  ead_number: string;
  ead_start_date: string;
  ead_end_date: string;
  job_title: string;
  hours_per_week: number;
  pay_rate: number;
  work_location: string;
  university_name: string;
  dso_name: string;
  dso_email: string;
  i9_completion_date: string;
  everify_case_number: string;
  everify_status: string;
  supervisor_id: string;
}

interface PlanFormState {
  version_date: string;
  dso_submission_date: string;
  dso_ack_uploaded: boolean;
  dso_ack_file_url: string;
  objective_1_text: string;
  objective_1_status: ObjectiveStatus;
  objective_1_project_id: string;
  objective_2_text: string;
  objective_2_status: ObjectiveStatus;
  objective_2_project_id: string;
  objective_3_text: string;
  objective_3_status: ObjectiveStatus;
  objective_3_project_id: string;
}

export function EmployeeComplianceTabsContent({
  employee,
}: EmployeeComplianceTabsContentProps) {
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [uploadingAck, setUploadingAck] = useState(false);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [i983Plan, setI983Plan] = useState<I983Plan | null>(null);

  const [complianceForm, setComplianceForm] = useState<ComplianceFormState>({
    joining_date: employee.joining_date || "",
    opt_type: employee.opt_type || "",
    ead_number: employee.ead_number || "",
    ead_start_date: employee.ead_start_date || "",
    ead_end_date: employee.ead_end_date || "",
    job_title: employee.job_title || "",
    hours_per_week: employee.hours_per_week ?? 30,
    pay_rate: employee.pay_rate ?? 0,
    work_location: employee.work_location || "",
    university_name: employee.university_name || "",
    dso_name: employee.dso_name || "",
    dso_email: employee.dso_email || "",
    i9_completion_date: employee.i9_completion_date || "",
    everify_case_number: employee.everify_case_number || "",
    everify_status: employee.everify_status || "",
    supervisor_id: employee.supervisor_id || "",
  });

  const [planForm, setPlanForm] = useState<PlanFormState>({
    version_date: "",
    dso_submission_date: "",
    dso_ack_uploaded: false,
    dso_ack_file_url: "",
    objective_1_text: "",
    objective_1_status: "Not Started" as ObjectiveStatus,
    objective_1_project_id: "",
    objective_2_text: "",
    objective_2_status: "Not Started" as ObjectiveStatus,
    objective_2_project_id: "",
    objective_3_text: "",
    objective_3_status: "Not Started" as ObjectiveStatus,
    objective_3_project_id: "",
  });

  const nextEvaluationDate = useMemo(() => {
    if (!complianceForm.joining_date) return null;
    return addDays(new Date(complianceForm.joining_date), 365);
  }, [complianceForm.joining_date]);

  const daysRemaining = useMemo(() => {
    if (!nextEvaluationDate) return null;
    return differenceInCalendarDays(nextEvaluationDate, new Date());
  }, [nextEvaluationDate]);

  const warningDueSoon =
    daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;

  useEffect(() => {
    const load = async () => {
      try {
        const [supervisorRes, projectRes, i983Res] = await Promise.all([
          fetch("/api/admin/employees?scope=supervisors"),
          fetch("/api/admin/projects"),
          fetch(`/api/admin/employees/${employee.id}/i983`),
        ]);

        if (supervisorRes.ok) {
          const supervisorData = await supervisorRes.json();
          setSupervisors(supervisorData || []);
        }

        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProjects(projectData || []);
        }

        if (i983Res.ok) {
          const i983Data = await i983Res.json();
          setI983Plan(i983Data);
          if (i983Data) {
            setPlanForm({
              version_date: i983Data.version_date || "",
              dso_submission_date: i983Data.dso_submission_date || "",
              dso_ack_uploaded: !!i983Data.dso_ack_uploaded,
              dso_ack_file_url: i983Data.dso_ack_file_url || "",
              objective_1_text: i983Data.objective_1_text || "",
              objective_1_status: (i983Data.objective_1_status || "Not Started") as ObjectiveStatus,
              objective_1_project_id: i983Data.objective_1_project_id || "",
              objective_2_text: i983Data.objective_2_text || "",
              objective_2_status: (i983Data.objective_2_status || "Not Started") as ObjectiveStatus,
              objective_2_project_id: i983Data.objective_2_project_id || "",
              objective_3_text: i983Data.objective_3_text || "",
              objective_3_status: (i983Data.objective_3_status || "Not Started") as ObjectiveStatus,
              objective_3_project_id: i983Data.objective_3_project_id || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed loading compliance context:", error);
      }
    };

    load();
  }, [employee.id]);

  const saveCompliance = async () => {
    if (!complianceForm.joining_date) {
      toast.error("Joining Date is required");
      return;
    }

    setSavingCompliance(true);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...complianceForm,
          hours_per_week: Number(complianceForm.hours_per_week),
          pay_rate: Number(complianceForm.pay_rate),
          name: employee.name,
          email: employee.email,
          hours_per_day: employee.hours_per_day,
          hourly_rate: employee.hourly_rate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save compliance details");
      }

      toast.success("Compliance profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save compliance details",
      );
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleAckUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAck(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/admin/employees/${employee.id}/i983/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!response.ok) {
        throw new Error("Failed to upload acknowledgement");
      }
      const data = await response.json();
      setPlanForm((prev) => ({
        ...prev,
        dso_ack_uploaded: true,
        dso_ack_file_url: data.url,
      }));
      toast.success("Acknowledgement uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload acknowledgement",
      );
    } finally {
      setUploadingAck(false);
    }
  };

  const saveTrainingPlan = async () => {
    if (planForm.objective_1_text && planForm.objective_1_text.length < 150) {
      toast.error("Objective 1 must be at least 150 characters");
      return;
    }
    if (planForm.objective_2_text && planForm.objective_2_text.length < 150) {
      toast.error("Objective 2 must be at least 150 characters");
      return;
    }
    if (planForm.objective_3_text && planForm.objective_3_text.length < 150) {
      toast.error("Objective 3 must be at least 150 characters");
      return;
    }

    setSavingPlan(true);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/i983`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...planForm,
          next_eval_due: nextEvaluationDate
            ? format(nextEvaluationDate, "yyyy-MM-dd")
            : null,
          objective_1_project_id: planForm.objective_1_project_id || null,
          objective_2_project_id: planForm.objective_2_project_id || null,
          objective_3_project_id: planForm.objective_3_project_id || null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save training plan");
      }
      const data = await response.json();
      setI983Plan(data);
      toast.success("I-983 training plan updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save training plan",
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const ackFilename = planForm.dso_ack_file_url
    ? decodeURIComponent(planForm.dso_ack_file_url.split("/").pop() || "Uploaded file")
    : i983Plan?.dso_ack_file_url
      ? decodeURIComponent(i983Plan.dso_ack_file_url.split("/").pop() || "Uploaded file")
      : null;

  return (
    <>
      <TabsContent value="compliance">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">
              Compliance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h3 className="font-space text-sm font-semibold tracking-wider uppercase text-[#FFD700] mb-4">
                Employment &amp; Visa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[rgba(245,245,240,0.7)]">OPT Type</Label>
                  <Select
                    value={complianceForm.opt_type || ""}
                    onValueChange={(value) =>
                      setComplianceForm((prev) => ({ ...prev, opt_type: value || "" }))
                    }
                  >
                    <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectValue placeholder="Select OPT type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectItem value="OPT">OPT</SelectItem>
                      <SelectItem value="STEM OPT">STEM OPT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="EAD Card Number"
                  value={complianceForm.ead_number}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, ead_number: value }))
                  }
                />
                <Field
                  label="EAD Start Date"
                  type="date"
                  value={complianceForm.ead_start_date}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, ead_start_date: value }))
                  }
                />
                <Field
                  label="EAD End Date"
                  type="date"
                  value={complianceForm.ead_end_date}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, ead_end_date: value }))
                  }
                />
                <Field
                  label="Job Title (Must match offer letter)"
                  value={complianceForm.job_title}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, job_title: value }))
                  }
                />
                <Field
                  label="Hours Per Week"
                  type="number"
                  value={String(complianceForm.hours_per_week)}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, hours_per_week: Number(value) }))
                  }
                />
                <Field
                  label="Pay Rate"
                  type="number"
                  step="0.01"
                  value={String(complianceForm.pay_rate)}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, pay_rate: Number(value) }))
                  }
                />
                <Field
                  label="Work Location"
                  value={complianceForm.work_location}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, work_location: value }))
                  }
                />
              </div>
            </section>

            <section>
              <h3 className="font-space text-sm font-semibold tracking-wider uppercase text-[#FFD700] mb-4">
                University &amp; DSO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field
                  label="University Name"
                  value={complianceForm.university_name}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, university_name: value }))
                  }
                />
                <Field
                  label="DSO Name"
                  value={complianceForm.dso_name}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, dso_name: value }))
                  }
                />
                <Field
                  label="DSO Email"
                  type="email"
                  value={complianceForm.dso_email}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, dso_email: value }))
                  }
                />
              </div>
            </section>

            <section>
              <h3 className="font-space text-sm font-semibold tracking-wider uppercase text-[#FFD700] mb-4">
                Compliance Records
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Joining Date"
                  type="date"
                  value={complianceForm.joining_date}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, joining_date: value }))
                  }
                />
                <Field
                  label="I-9 Completion Date"
                  type="date"
                  value={complianceForm.i9_completion_date}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, i9_completion_date: value }))
                  }
                />
                <Field
                  label="E-Verify Case Number"
                  value={complianceForm.everify_case_number}
                  onChange={(value) =>
                    setComplianceForm((prev) => ({ ...prev, everify_case_number: value }))
                  }
                />
                <div className="space-y-2">
                  <Label className="text-[rgba(245,245,240,0.7)]">E-Verify Status</Label>
                  <Select
                    value={complianceForm.everify_status || ""}
                    onValueChange={(value) =>
                      setComplianceForm((prev) => ({ ...prev, everify_status: value || "" }))
                    }
                  >
                    <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectItem value="Employment Authorized">Employment Authorized</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[rgba(245,245,240,0.7)]">Assigned Supervisor</Label>
                  <Select
                      value={complianceForm.supervisor_id || "none"}
                      onValueChange={(value) =>
                        setComplianceForm((prev) => ({
                          ...prev,
                          supervisor_id: value && value !== "none" ? value : "",
                        }))
                      }
                  >
                    <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectItem value="none">None assigned</SelectItem>
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} — {supervisor.job_title || supervisor.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Button
              onClick={saveCompliance}
              disabled={savingCompliance}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space font-semibold"
            >
              {savingCompliance ? "Saving..." : "Save Compliance Information"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trainingPlan">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">
              Training Plan (I-983)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {warningDueSoon && daysRemaining !== null && (
              <div className="rounded-lg border border-[rgba(250,204,21,0.45)] bg-[rgba(250,204,21,0.12)] p-4 font-space text-sm text-yellow-300">
                ⚠️ I-983 evaluation is due in {daysRemaining} days. Please schedule a review.
              </div>
            )}

            <section className="space-y-4">
              <h3 className="font-space text-sm font-semibold tracking-wider uppercase text-[#FFD700]">
                Document Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="I-983 Version Date"
                  type="date"
                  value={planForm.version_date}
                  onChange={(value) =>
                    setPlanForm((prev) => ({ ...prev, version_date: value }))
                  }
                />
                <Field
                  label="DSO Submission Date"
                  type="date"
                  value={planForm.dso_submission_date}
                  onChange={(value) =>
                    setPlanForm((prev) => ({ ...prev, dso_submission_date: value }))
                  }
                />
              </div>
              <div className="space-y-3 rounded-lg border border-[rgba(255,215,0,0.12)] p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[rgba(245,245,240,0.7)]">
                    DSO Acknowledgement on File
                  </Label>
                  <Switch
                    checked={planForm.dso_ack_uploaded}
                    onCheckedChange={(checked) =>
                      setPlanForm((prev) => ({ ...prev, dso_ack_uploaded: checked }))
                    }
                  />
                </div>
                <Input
                  type="file"
                  disabled={uploadingAck}
                  onChange={(event) =>
                    handleAckUpload(event.target.files?.[0] || null)
                  }
                  className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                />
                {ackFilename && (
                  <p className="font-space text-xs text-[rgba(245,245,240,0.65)]">
                    Uploaded: {ackFilename}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-[rgba(255,215,0,0.12)] p-4">
                <p className="font-space text-sm text-[#F5F5F0]">
                  Next Evaluation Due Date
                </p>
                {nextEvaluationDate ? (
                  <>
                    <p className="font-space text-base font-semibold text-[#FFD700] mt-1">
                      {format(nextEvaluationDate, "MMM d, yyyy")}
                    </p>
                    <p className="font-space text-xs text-[rgba(245,245,240,0.65)] mt-1">
                      {daysRemaining !== null ? `${daysRemaining} days remaining` : "—"}
                    </p>
                  </>
                ) : (
                  <p className="font-space text-xs text-[rgba(245,245,240,0.65)] mt-1">
                    Set joining date to calculate
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-space text-sm font-semibold tracking-wider uppercase text-[#FFD700]">
                Learning Objectives
              </h3>
              {([
                { number: 1, textKey: "objective_1_text", statusKey: "objective_1_status", projectKey: "objective_1_project_id" },
                { number: 2, textKey: "objective_2_text", statusKey: "objective_2_status", projectKey: "objective_2_project_id" },
                { number: 3, textKey: "objective_3_text", statusKey: "objective_3_status", projectKey: "objective_3_project_id" },
              ] as const).map(({ number: objectiveNumber, textKey, statusKey, projectKey }) => {
                const currentText = planForm[textKey] || "";
                const meetsMin = currentText.length >= 150;
                return (
                  <div
                    key={objectiveNumber}
                    className="rounded-lg border border-[rgba(255,215,0,0.12)] p-4 space-y-3"
                  >
                    <h4 className="font-space text-sm font-semibold text-[#F5F5F0]">
                      Objective {objectiveNumber}
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-[rgba(245,245,240,0.7)]">
                        Objective Text
                      </Label>
                      <Textarea
                        value={currentText}
                        onChange={(event) =>
                          setPlanForm((prev) => ({
                            ...prev,
                            [textKey]: event.target.value,
                          }))
                        }
                        className="min-h-28 bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                      />
                      <p
                        className={`font-space text-xs ${meetsMin ? "text-green-400" : "text-[rgba(245,245,240,0.6)]"}`}
                      >
                        {currentText.length} / 150 characters
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[rgba(245,245,240,0.7)]">Status</Label>
                        <Select
                          value={planForm[statusKey] || "Not Started"}
                          onValueChange={(value) =>
                            setPlanForm((prev) => ({
                              ...prev,
                              [statusKey]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            {OBJECTIVE_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[rgba(245,245,240,0.7)]">Mapped Project</Label>
                        <Select
                          value={planForm[projectKey] || "none"}
                          onValueChange={(value) =>
                            setPlanForm((prev) => ({
                              ...prev,
                              [projectKey]: value === "none" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            <SelectItem value="none">Unmapped</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <Button
              onClick={saveTrainingPlan}
              disabled={savingPlan}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space font-semibold"
            >
              {savingPlan ? "Saving..." : "Save Training Plan"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[rgba(245,245,240,0.7)]">{label}</Label>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
      />
    </div>
  );
}
