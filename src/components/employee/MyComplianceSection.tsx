"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Upload, XCircle } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";
import type { EmployeeDocument } from "@/types";

type TrainingStatus = "Not Started" | "In Progress" | "Completed";

interface TrainingPlanPayload {
  plan: {
    objective_1_text: string | null;
    objective_1_status: TrainingStatus | null;
    objective_1_project?: { title?: string } | null;
    objective_2_text: string | null;
    objective_2_status: TrainingStatus | null;
    objective_2_project?: { title?: string } | null;
    objective_3_text: string | null;
    objective_3_status: TrainingStatus | null;
    objective_3_project?: { title?: string } | null;
  } | null;
  next_evaluation_due: string | null;
  days_remaining: number | null;
}

interface EmployeeDocumentsPayload {
  documents: EmployeeDocument[];
  ead_end_date: string | null;
}

function getStatusClass(status: TrainingStatus | null) {
  if (status === "Completed") {
    return "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.35)]";
  }
  if (status === "In Progress") {
    return "bg-[rgba(255,215,0,0.16)] text-[#FFD700] border border-[rgba(255,215,0,0.35)]";
  }
  return "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.7)] border border-[rgba(245,245,240,0.2)]";
}

export function MyComplianceSection() {
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [training, setTraining] = useState<TrainingPlanPayload | null>(null);
  const [documentsData, setDocumentsData] = useState<EmployeeDocumentsPayload | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [trainingRes, docsRes] = await Promise.all([
        fetch("/api/employee/training-plan"),
        fetch("/api/employee/documents"),
      ]);
      if (!trainingRes.ok || !docsRes.ok) {
        throw new Error("Failed to load compliance data");
      }
      const trainingPayload = (await trainingRes.json()) as TrainingPlanPayload;
      const docsPayload = (await docsRes.json()) as EmployeeDocumentsPayload;
      setTraining(trainingPayload);
      setDocumentsData(docsPayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const documentMap = useMemo(
    () => new Map((documentsData?.documents || []).map((doc) => [doc.document_type, doc])),
    [documentsData?.documents],
  );

  const uploadedCount = REQUIRED_DOCUMENTS.filter((doc) => {
    const item = documentMap.get(doc.type);
    return !!item?.file_url && item.status === "uploaded";
  }).length;
  const missingCount = REQUIRED_DOCUMENTS.length - uploadedCount;

  const eadDocument = documentMap.get("ead_card");
  const eadExpiry = eadDocument?.expiry_date || documentsData?.ead_end_date || null;
  const eadDaysRemaining = eadExpiry
    ? differenceInCalendarDays(new Date(eadExpiry), new Date())
    : null;

  const uploadDocument = async (documentType: string, file: File | null) => {
    if (!file) return;
    try {
      setUploadingType(documentType);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      const uploadRes = await fetch("/api/employee/documents/upload", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadPayload.message || "Upload failed");
      }

      const saveRes = await fetch("/api/employee/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: documentType,
          file_url: uploadPayload.file_url,
        }),
      });
      const savePayload = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(savePayload.message || "Save failed");
      }
      setDocumentsData((prev) => {
        const current = prev?.documents || [];
        const next = current.filter((doc) => doc.document_type !== savePayload.document_type);
        return {
          documents: [...next, savePayload],
          ead_end_date: prev?.ead_end_date || null,
        };
      });
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload");
    } finally {
      setUploadingType(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-10">
        <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
          <CardContent className="py-8">
            <p className="font-space text-sm text-[rgba(10,10,10,0.6)]">Loading compliance sections...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const objectiveCards = training?.plan
    ? [
        {
          label: "Objective 1",
          text: training.plan.objective_1_text,
          status: training.plan.objective_1_status,
          projectName: training.plan.objective_1_project?.title || "Unmapped",
        },
        {
          label: "Objective 2",
          text: training.plan.objective_2_text,
          status: training.plan.objective_2_status,
          projectName: training.plan.objective_2_project?.title || "Unmapped",
        },
        {
          label: "Objective 3",
          text: training.plan.objective_3_text,
          status: training.plan.objective_3_status,
          projectName: training.plan.objective_3_project?.title || "Unmapped",
        },
      ]
    : [];

  return (
    <div className="space-y-6 mt-10">
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">My Training Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {objectiveCards.length === 0 || objectiveCards.every((item) => !item.text) ? (
            <div className="text-center py-8">
              <p className="font-space text-sm text-[rgba(10,10,10,0.65)]">
                Your training plan is being set up by your supervisor. Check back soon.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {objectiveCards.map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-lg border border-[rgba(10,10,10,0.08)] p-4"
                  >
                    <p className="font-space text-xs uppercase tracking-wider text-[rgba(10,10,10,0.55)]">
                      {item.label}
                    </p>
                    <p className="font-space text-sm text-[#0A0A0A] mt-2 min-h-16 whitespace-pre-wrap break-all">
                      {item.text || "Not set"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Badge className={getStatusClass(item.status)}>
                        {item.status || "Not Started"}
                      </Badge>
                    </div>
                    <p className="font-space text-xs text-[rgba(10,10,10,0.6)] mt-3">
                      Mapped project:{" "}
                      <span className="font-semibold text-[#0A0A0A]">{item.projectName}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[rgba(255,215,0,0.2)] p-4">
                <p className="font-space text-sm text-[rgba(10,10,10,0.6)]">Next Evaluation Due Date</p>
                <p className="font-space text-lg font-semibold text-[#0A0A0A] mt-1">
                  {training?.next_evaluation_due
                    ? format(parseISO(training.next_evaluation_due), "MMM d, yyyy")
                    : "Not available"}
                </p>
                {training?.days_remaining !== null && training?.days_remaining !== undefined && (
                  <p
                    className={`font-space text-sm mt-1 ${
                      training.days_remaining < 30
                        ? "text-red-600"
                        : training.days_remaining <= 60
                          ? "text-amber-600"
                          : "text-[rgba(10,10,10,0.65)]"
                    }`}
                  >
                    {training.days_remaining < 30 && (
                      <AlertTriangle className="inline h-4 w-4 mr-1 align-text-bottom" />
                    )}
                    {training.days_remaining} days remaining
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#0A0A0A]">My Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingCount > 0 ? (
            <div className="rounded-lg border-l-4 border-[#FFD700] border bg-[rgba(239,68,68,0.06)] p-4">
              <p className="font-space text-sm text-[#7f1d1d]">
                ⚠️ Action Required: {missingCount} documents are missing from your profile.
                Please upload them below.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] p-4">
              <p className="font-space text-sm text-green-700">
                ✓ All documents on file. Your profile is complete.
              </p>
            </div>
          )}

          <div
            className={`rounded-lg border p-4 ${
              eadDaysRemaining !== null && eadDaysRemaining <= 90
                ? "border-[rgba(248,113,113,0.5)] bg-[rgba(248,113,113,0.08)]"
                : "border-[rgba(10,10,10,0.08)]"
            }`}
          >
            {eadExpiry ? (
              <>
                <p className="font-space text-sm text-[#0A0A0A]">
                  EAD Card expires on{" "}
                  <span className="font-semibold">{format(new Date(eadExpiry), "MMM d, yyyy")}</span>
                </p>
                {eadDaysRemaining !== null && (
                  <p className="font-space text-xs mt-1 text-[rgba(10,10,10,0.65)]">
                    {eadDaysRemaining} days remaining
                    {eadDaysRemaining <= 90 && (
                      <span className="ml-2 text-red-600 font-semibold">Expiring Soon</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="font-space text-sm text-[rgba(10,10,10,0.65)]">
                EAD expiry date not on file — contact HR
              </p>
            )}
          </div>

          <div className="space-y-2">
            {REQUIRED_DOCUMENTS.map((requiredDocument) => {
              const document = documentMap.get(requiredDocument.type);
              const uploaded = !!document?.file_url && document.status === "uploaded";
              return (
                <div
                  key={requiredDocument.type}
                  className="rounded-lg border border-[rgba(10,10,10,0.08)] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    {uploaded ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <p className="font-space text-sm text-[#0A0A0A]">{requiredDocument.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={(node) => {
                        fileRefs.current[requiredDocument.type] = node;
                      }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(event) =>
                        uploadDocument(requiredDocument.type, event.target.files?.[0] || null)
                      }
                    />
                    {uploaded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-space text-xs"
                        onClick={() =>
                          window.open(document.file_url!, "_blank", "noopener,noreferrer")
                        }
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={uploadingType === requiredDocument.type}
                        className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-xs"
                        onClick={() => fileRefs.current[requiredDocument.type]?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
