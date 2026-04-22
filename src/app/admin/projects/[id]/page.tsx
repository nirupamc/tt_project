"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Pencil, Trash2, Users } from "lucide-react";
import type {
  EnrollmentWithUser,
  PaymentLog,
  Project,
  ProjectDayWithTasks,
  User,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectDetailData extends Project {
  days: ProjectDayWithTasks[];
  enrollments: EnrollmentWithUser[];
  payment_logs: PaymentLog[];
}

interface PaymentDraft {
  id: string;
  payment_date: string;
  inr_amount: string;
  utr_reference: string;
  usd_equivalent: string;
  payment_method: "UPI" | "NEFT" | "Bank Transfer" | "Wire";
  notes: string;
  persisted: boolean;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingProjectMeta, setSavingProjectMeta] = useState(false);
  const [assigningTeam, setAssigningTeam] = useState(false);
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentDraft[]>([]);
  const [projectForm, setProjectForm] = useState({
    client_code: "",
    client_name: "",
    client_location: "",
    sow_reference: "",
    sow_status: "Not Started",
    invoice_status: "Not Issued",
  });

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/admin/projects/${id}`);
      if (!response.ok) {
        router.push("/admin/projects");
        return;
      }
      const payload = (await response.json()) as ProjectDetailData;
      setProject(payload);
      setProjectForm({
        client_code: payload.client_code || "",
        client_name: payload.client_name || "",
        client_location: payload.client_location || "",
        sow_reference: payload.sow_reference || "",
        sow_status: payload.sow_status || "Not Started",
        invoice_status: payload.invoice_status || "Not Issued",
      });
      setPaymentRows(
        (payload.payment_logs || []).map((log) => ({
          id: log.id,
          payment_date: log.payment_date,
          inr_amount: String(log.inr_amount),
          utr_reference: log.utr_reference,
          usd_equivalent: String(log.usd_equivalent),
          payment_method: log.payment_method,
          notes: log.notes || "",
          persisted: true,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) return;
      const payload = (await response.json()) as User[];
      setAllEmployees(payload.filter((employee) => employee.role === "employee"));
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchEmployees()]);
      setLoading(false);
    };
    load();
  }, [id]);

  const enrolledUserIds = useMemo(
    () => new Set((project?.enrollments || []).map((enrollment) => enrollment.user_id)),
    [project?.enrollments],
  );

  const assignableEmployees = allEmployees.filter(
    (employee) => !enrolledUserIds.has(employee.id),
  );

  const totalInr = paymentRows.reduce((sum, row) => sum + (Number(row.inr_amount) || 0), 0);
  const totalUsd = paymentRows.reduce((sum, row) => sum + (Number(row.usd_equivalent) || 0), 0);

  const saveProjectMeta = async () => {
    try {
      setSavingProjectMeta(true);
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_code: projectForm.client_code || null,
          client_name: projectForm.client_name || null,
          client_location: projectForm.client_location || null,
          sow_reference: projectForm.sow_reference || null,
          sow_status: projectForm.sow_status || null,
          invoice_status: projectForm.invoice_status || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to save project details");
      toast.success("Project registry details saved");
      await fetchProject();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save project details");
    } finally {
      setSavingProjectMeta(false);
    }
  };

  const addPaymentRow = () => {
    setPaymentRows((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}`,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        inr_amount: "",
        utr_reference: "",
        usd_equivalent: "",
        payment_method: "UPI",
        notes: "",
        persisted: false,
      },
    ]);
  };

  const updatePaymentRow = (idValue: string, patch: Partial<PaymentDraft>) => {
    setPaymentRows((prev) =>
      prev.map((row) => (row.id === idValue ? { ...row, ...patch } : row)),
    );
  };

  const savePaymentRow = async (row: PaymentDraft) => {
    if (!row.payment_date || !row.inr_amount || !row.utr_reference || !row.usd_equivalent) {
      toast.error("Please complete all required payment fields");
      return;
    }
    try {
      const endpoint = row.persisted
        ? `/api/admin/projects/${id}/payments/${row.id}`
        : `/api/admin/projects/${id}/payments`;
      const method = row.persisted ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: row.payment_date,
          inr_amount: Number(row.inr_amount),
          utr_reference: row.utr_reference,
          usd_equivalent: Number(row.usd_equivalent),
          payment_method: row.payment_method,
          notes: row.notes || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to save payment row");
      const payload = (await response.json()) as PaymentLog;
      setPaymentRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                id: payload.id,
                payment_date: payload.payment_date,
                inr_amount: String(payload.inr_amount),
                utr_reference: payload.utr_reference,
                usd_equivalent: String(payload.usd_equivalent),
                payment_method: payload.payment_method,
                notes: payload.notes || "",
                persisted: true,
              }
            : item,
        ),
      );
      toast.success("Payment saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save payment row");
    }
  };

  const deletePaymentRow = async (row: PaymentDraft) => {
    const confirmed = confirm("Delete this payment row?");
    if (!confirmed) return;

    if (!row.persisted) {
      setPaymentRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${id}/payments/${row.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment");
      setPaymentRows((prev) => prev.filter((item) => item.id !== row.id));
      toast.success("Payment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete payment");
    }
  };

  const assignTeamMembers = async () => {
    if (selectedTeamIds.length === 0) return;
    try {
      setAssigningTeam(true);
      const response = await fetch(`/api/admin/projects/${id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollments: selectedTeamIds.map((employeeId) => ({
            user_id: employeeId,
            start_date: format(new Date(), "yyyy-MM-dd"),
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to assign employee");
      setSelectedTeamIds([]);
      toast.success("Team updated");
      await fetchProject();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign employee");
    } finally {
      setAssigningTeam(false);
    }
  };

  const removeTeamMember = async (userId: string) => {
    const confirmed = confirm("Remove this employee from the project?");
    if (!confirmed) return;
    try {
      const response = await fetch(
        `/api/admin/projects/${id}/enrollments?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to remove employee");
      toast.success("Team member removed");
      await fetchProject();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove employee");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-8 w-64 bg-[#2A2A2A] mb-4" />
        <Skeleton className="h-64 bg-[#2A2A2A]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link
          href="/admin/projects"
          className="inline-flex items-center text-[#FFD700] hover:text-[#FFE44D] font-space mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-bebas text-4xl text-[#F5F5F0]">{project.title}</h1>
            <Badge
              className={
                project.is_published
                  ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700] border border-[rgba(255,215,0,0.3)]"
                  : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.6)] border border-[rgba(245,245,240,0.2)]"
              }
            >
              {project.is_published ? "Published" : "Draft"}
            </Badge>
            {project.is_active && (
              <Badge className="bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)]">
                Active
              </Badge>
            )}
          </div>
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.55)] max-w-2xl">
            {project.description || "No description provided."}
          </p>
        </div>
        <Link href={`/admin/projects/${id}/build`}>
          <Button
            variant="outline"
            className="bg-transparent border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space text-[13px] font-semibold"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Build Days
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <Clock className="h-5 w-5 text-[#FFD700]" />
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Duration</p>
              <p className="font-bebas text-[42px] text-[#F5F5F0] leading-none">{project.total_days}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <Calendar className="h-5 w-5 text-[#FFD700]" />
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Start Date</p>
              <p className="font-space text-[13px] text-[#F5F5F0]">
                {project.start_date ? format(new Date(project.start_date), "MMM d, yyyy") : "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <Users className="h-5 w-5 text-[#FFD700]" />
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Students Assigned</p>
              <p className="font-bebas text-[42px] text-[#F5F5F0] leading-none">{project.enrollments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="border-[rgba(255,215,0,0.1)]" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Client Code (used for confidentiality, e.g. Client-IN-001)"
              value={projectForm.client_code}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, client_code: value }))}
            />
            <Field
              label="Client Name (visible to admin only)"
              value={projectForm.client_name}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, client_name: value }))}
            />
            <Field
              label="Client Location"
              value={projectForm.client_location}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, client_location: value }))}
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Contract Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="SOW Reference Number"
              value={projectForm.sow_reference}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, sow_reference: value }))}
              placeholder="TT-SOW-2026-001"
            />
            <div className="space-y-2">
              <Label className="font-space text-[12px] text-[rgba(245,245,240,0.65)]">SOW Status</Label>
              <Select
                value={projectForm.sow_status}
                onValueChange={(value) => setProjectForm((prev) => ({ ...prev, sow_status: value || "" }))}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="Sent to Client">Sent to Client</SelectItem>
                  <SelectItem value="Signed">Signed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-space text-[12px] text-[rgba(245,245,240,0.65)]">Invoice Status</Label>
              <Select
                value={projectForm.invoice_status}
                onValueChange={(value) => setProjectForm((prev) => ({ ...prev, invoice_status: value || "" }))}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectItem value="Not Issued">Not Issued</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                  <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={saveProjectMeta}
              disabled={savingProjectMeta}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-[13px] font-semibold"
            >
              {savingProjectMeta ? "Saving..." : "Save Client & Contract"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Payment Log</CardTitle>
          <Button
            onClick={addPaymentRow}
            className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-[13px] font-semibold"
          >
            Add Payment
          </Button>
        </CardHeader>
        <CardContent>
          {paymentRows.length === 0 ? (
            <p className="font-space text-[13px] text-[rgba(245,245,240,0.55)]">
              No payments logged yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[rgba(255,215,0,0.1)]">
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">Date</th>
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">INR Amount</th>
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">UPI/UTR Reference</th>
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">USD Equivalent</th>
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">Payment Method</th>
                    <th className="py-2 text-left font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">Notes</th>
                    <th className="py-2 text-right font-space text-xs uppercase text-[rgba(245,245,240,0.65)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row) => (
                    <tr key={row.id} className="border-b border-[rgba(255,215,0,0.06)]">
                      <td className="py-2 pr-2">
                        <Input
                          type="date"
                          value={row.payment_date}
                          onChange={(event) =>
                            updatePaymentRow(row.id, { payment_date: event.target.value })
                          }
                          className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          value={row.inr_amount}
                          onChange={(event) =>
                            updatePaymentRow(row.id, { inr_amount: event.target.value })
                          }
                          placeholder="₹50000"
                          className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={row.utr_reference}
                          onChange={(event) =>
                            updatePaymentRow(row.id, { utr_reference: event.target.value })
                          }
                          className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          value={row.usd_equivalent}
                          onChange={(event) =>
                            updatePaymentRow(row.id, { usd_equivalent: event.target.value })
                          }
                          placeholder="$600"
                          className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={row.payment_method}
                          onValueChange={(value) =>
                            updatePaymentRow(row.id, {
                              payment_method: value as PaymentDraft["payment_method"],
                            })
                          }
                        >
                          <SelectTrigger className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="NEFT">NEFT</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Wire">Wire</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={row.notes}
                          onChange={(event) =>
                            updatePaymentRow(row.id, { notes: event.target.value })
                          }
                          className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[rgba(255,215,0,0.25)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)]"
                            onClick={() => savePaymentRow(row)}
                          >
                            Save
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => deletePaymentRow(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.7)] mt-4">
            Total Received: ₹{totalInr.toLocaleString("en-IN")} (≈ $
            {totalUsd.toLocaleString("en-US")} USD)
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label className="font-space text-[12px] text-[rgba(245,245,240,0.65)] mb-2 block">
                Students Assigned
              </Label>
              <select
                multiple
                value={selectedTeamIds}
                onChange={(event) =>
                  setSelectedTeamIds(
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )
                }
                className="w-full min-h-28 rounded-md bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] p-2 font-space text-sm"
              >
                {assignableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={assignTeamMembers}
              disabled={selectedTeamIds.length === 0 || assigningTeam}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-[13px] font-semibold"
            >
              {assigningTeam ? "Adding..." : "Add Selected"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.enrollments.map((enrollment) => {
              const teamMember = enrollment.user;
              if (!teamMember) return null;
              return (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-2 rounded-full px-3 py-1 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.25)]"
                >
                  <span className="font-space text-xs text-[#F5F5F0]">{teamMember.name}</span>
                  <Badge className="bg-[rgba(245,245,240,0.12)] text-[rgba(245,245,240,0.9)] border border-[rgba(245,245,240,0.2)]">
                    {teamMember.role}
                  </Badge>
                  <button
                    type="button"
                    className="text-[rgba(245,245,240,0.7)] hover:text-red-400"
                    onClick={() => removeTeamMember(teamMember.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Project Days Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {project.days.length === 0 ? (
            <p className="font-space text-[13px] text-[rgba(245,245,240,0.55)]">
              No days configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {project.days.slice(0, 10).map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[rgba(255,215,0,0.08)] rounded-lg hover:bg-[rgba(255,215,0,0.03)]"
                >
                  <div>
                    <p className="font-space font-medium text-[#F5F5F0]">Day {day.day_number}</p>
                    <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                      {day.title || "Untitled"}
                    </p>
                  </div>
                  <Badge className="bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.7)] border border-[rgba(245,245,240,0.2)]">
                    {day.tasks?.length || 0} tasks
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-space text-[12px] text-[rgba(245,245,240,0.65)]">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
      />
    </div>
  );
}
