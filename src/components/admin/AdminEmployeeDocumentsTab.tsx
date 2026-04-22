"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REQUIRED_DOCUMENTS, countUploadedDocuments } from "@/lib/compliance-documents";
import type { EmployeeDocument } from "@/types";

interface AdminEmployeeDocumentsTabProps {
  employeeId: string;
}

export function AdminEmployeeDocumentsTab({
  employeeId,
}: AdminEmployeeDocumentsTabProps) {
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/employees/${employeeId}/documents`);
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [employeeId]);

  const documentMap = useMemo(() => {
    return new Map(documents.map((doc) => [doc.document_type, doc]));
  }, [documents]);

  const uploadedCount = countUploadedDocuments(documents);
  const progressPercent = Math.round((uploadedCount / REQUIRED_DOCUMENTS.length) * 100);

  const saveDocument = async (
    documentType: string,
    payload: Partial<Pick<EmployeeDocument, "file_url" | "expiry_date" | "version_date">>,
  ) => {
    try {
      setSavingType(documentType);
      const existing = documentMap.get(documentType as EmployeeDocument["document_type"]);
      const response = await fetch(`/api/admin/employees/${employeeId}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: documentType,
          file_url: payload.file_url ?? existing?.file_url ?? null,
          expiry_date: payload.expiry_date ?? existing?.expiry_date ?? null,
          version_date: payload.version_date ?? existing?.version_date ?? null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to save document");
      }
      const updated = await response.json();
      setDocuments((prev) => {
        const without = prev.filter((doc) => doc.document_type !== updated.document_type);
        return [...without, updated];
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save document");
    } finally {
      setSavingType(null);
    }
  };

  const handleUploadFile = async (documentType: string, file: File | null) => {
    if (!file) return;
    try {
      setSavingType(documentType);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      const uploadResponse = await fetch(
        `/api/admin/employees/${employeeId}/documents/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || "Failed to upload file");
      }

      await saveDocument(documentType, { file_url: uploadData.file_url });
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setSavingType(null);
    }
  };

  return (
    <TabsContent value="documents">
      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-[rgba(255,215,0,0.2)] p-4">
            <p className="font-space text-lg font-semibold text-[#F5F5F0]">
              {uploadedCount} of 9 documents complete
            </p>
            <div className="mt-3 h-3 w-full rounded-full bg-[rgba(245,245,240,0.1)] overflow-hidden">
              <div
                className="h-full bg-[#FFD700] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {uploadedCount === 9 && (
              <p className="font-space text-sm text-green-400 mt-2">All documents on file ✓</p>
            )}
          </div>

          {loading ? (
            <p className="font-space text-sm text-[rgba(245,245,240,0.6)]">Loading documents...</p>
          ) : (
            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.map((requiredDocument) => {
                const document = documentMap.get(requiredDocument.type);
                const uploaded = !!document?.file_url;
                return (
                  <div
                    key={requiredDocument.type}
                    className="rounded-lg border border-[rgba(255,215,0,0.12)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {uploaded ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <p className="font-space text-sm text-[#F5F5F0]">{requiredDocument.name}</p>
                        <Badge
                          className={
                            uploaded
                              ? "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.35)]"
                              : "bg-[rgba(239,68,68,0.14)] text-[#f87171] border border-[rgba(248,113,113,0.35)]"
                          }
                        >
                          {uploaded ? "Uploaded" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={(node) => {
                            fileInputsRef.current[requiredDocument.type] = node;
                          }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(event) =>
                            handleUploadFile(requiredDocument.type, event.target.files?.[0] || null)
                          }
                        />
                        <Button
                          size="sm"
                          disabled={savingType === requiredDocument.type}
                          className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space text-xs"
                          onClick={() => fileInputsRef.current[requiredDocument.type]?.click()}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          {uploaded ? "Replace File" : "Upload"}
                        </Button>
                        {uploaded && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[rgba(255,215,0,0.25)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space text-xs"
                            onClick={() => window.open(document.file_url!, "_blank", "noopener,noreferrer")}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download/Preview
                          </Button>
                        )}
                      </div>
                    </div>

                    {(requiredDocument.expiryLabel || requiredDocument.versionLabel) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {requiredDocument.expiryLabel && (
                          <div className="space-y-2">
                            <Label className="text-[rgba(245,245,240,0.65)]">
                              {requiredDocument.expiryLabel}
                            </Label>
                            <Input
                              type="date"
                              value={document?.expiry_date || ""}
                              onChange={(event) =>
                                saveDocument(requiredDocument.type, {
                                  expiry_date: event.target.value || null,
                                })
                              }
                              className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                            />
                          </div>
                        )}
                        {requiredDocument.versionLabel && (
                          <div className="space-y-2">
                            <Label className="text-[rgba(245,245,240,0.65)]">
                              {requiredDocument.versionLabel}
                            </Label>
                            <Input
                              type="date"
                              value={document?.version_date || ""}
                              onChange={(event) =>
                                saveDocument(requiredDocument.type, {
                                  version_date: event.target.value || null,
                                })
                              }
                              className="bg-[#0A0A0A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
