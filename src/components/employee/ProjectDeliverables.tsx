"use client";

import { useState, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileIcon, Trash2, ExternalLink, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { Deliverable, DeliverableStatus } from "@/types";

interface DeliverableInputData {
  projectId: string;
  date: string;
  title: string;
  description: string;
  externalLink?: string;
  status: DeliverableStatus;
  fileUrl?: string;
  fileName?: string;
}

interface ProjectDeliverablesProps {
  projectId: string;
  projectTitle: string;
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  in_progress: "In Progress",
  submitted: "Submitted to Supervisor",
  client_reviewed: "Client Reviewed",
  completed: "Completed",
};

const STATUS_COLORS: Record<DeliverableStatus, string> = {
  in_progress: "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.3)] text-blue-700",
  submitted: "bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.35)] text-amber-700",
  client_reviewed: "bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.35)] text-purple-700",
  completed: "bg-[rgba(34,197,94,0.14)] border-[rgba(34,197,94,0.35)] text-green-700",
};

function StatusBadge({ status }: { status: DeliverableStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-space font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function getFileIcon(fileName?: string | null): React.ReactNode {
  if (!fileName) return <FileIcon className="h-4 w-4" />;
  
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "📄";
    case "doc":
    case "docx":
      return "📝";
    case "xls":
    case "xlsx":
      return "📊";
    case "png":
    case "jpg":
    case "jpeg":
      return "🖼️";
    case "zip":
      return "📦";
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}

export function ProjectDeliverables({ projectId, projectTitle }: ProjectDeliverablesProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<DeliverableInputData>({
    projectId,
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    description: "",
    status: "in_progress",
  });

  const [charCounts, setCharCounts] = useState({
    title: 0,
    description: 0,
  });

  const loadDeliverables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employee/deliverables");
      if (!response.ok) throw new Error("Failed to load deliverables");
      
      const data = await response.json();
      const projectDeliverables = data.filter((d: Deliverable) => d.project_id === projectId);
      setDeliverables(projectDeliverables.sort((a: Deliverable, b: Deliverable) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error("Error loading deliverables:", error);
      toast.error("Failed to load deliverables");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load deliverables on mount
  useEffect(() => {
    loadDeliverables();
  }, [loadDeliverables]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formDataObj = new FormData();
      formDataObj.append("file", file);

      const response = await fetch("/api/employee/deliverables/upload", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const { file_url, file_name } = await response.json();
      setFormData((prev) => ({
        ...prev,
        fileUrl: file_url,
        fileName: file_name,
      }));
      toast.success("File uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (charCounts.title < 10) {
      toast.error("Title must be at least 10 characters");
      return;
    }

    if (charCounts.description < 80) {
      toast.error("Description must be at least 80 characters");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/employee/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          date: formData.date,
          title: formData.title,
          description: formData.description,
          file_url: formData.fileUrl || null,
          file_name: formData.fileName || null,
          external_link: formData.externalLink || null,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create deliverable");
      }

      await loadDeliverables();
      setShowForm(false);
      setFormData({
        projectId,
        date: format(new Date(), "yyyy-MM-dd"),
        title: "",
        description: "",
        status: "in_progress",
      });
      setCharCounts({ title: 0, description: 0 });
      toast.success("Deliverable added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create deliverable");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;

    try {
      setDeleting(id);
      const response = await fetch(`/api/employee/deliverables/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await loadDeliverables();
      toast.success("Deliverable deleted");
    } catch (error) {
      toast.error("Failed to delete deliverable");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-space text-[15px] font-semibold text-[#0A0A0A]">
          Deliverables {deliverables.length > 0 && <span className="text-[rgba(10,10,10,0.6)]">({deliverables.length})</span>}
        </h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className="bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space text-[12px]"
        >
          {showForm ? "Cancel" : "+ Add Deliverable"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-white border border-[rgba(10,10,10,0.12)]">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="font-space"
                />
                <p className="text-[12px] text-[rgba(10,10,10,0.5)]">Cannot be a future date</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">
                  Title <span className="text-[rgba(10,10,10,0.5)]">({charCounts.title}/10 min)</span>
                </Label>
                <Input
                  placeholder="e.g., Database Schema Design"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    setCharCounts({ ...charCounts, title: e.target.value.length });
                  }}
                  className="font-space"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">
                  Description <span className="text-[rgba(10,10,10,0.5)]">({charCounts.description}/80 min)</span>
                </Label>
                <Textarea
                  placeholder="Describe what you built, what problem it solves, and what technologies you used."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setCharCounts({ ...charCounts, description: e.target.value.length });
                  }}
                  rows={4}
                  className="font-space"
                />
                <p className="text-[12px] text-[rgba(10,10,10,0.5)]">
                  Include what you built, problem solved, and technologies used
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">
                  Upload File (Optional)
                </Label>
                <div className="border-2 border-dashed border-[rgba(10,10,10,0.12)] rounded-lg p-4">
                  {formData.fileUrl ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getFileIcon(formData.fileName)}</span>
                        <span className="font-space text-[13px] text-[#0A0A0A]">
                          {formData.fileName}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            fileUrl: undefined,
                            fileName: undefined,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.zip"
                        className="hidden"
                      />
                      <div className="text-center">
                        <p className="font-space text-[13px] text-[#0A0A0A] font-medium">
                          {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                        </p>
                        <p className="font-space text-[12px] text-[rgba(10,10,10,0.5)] mt-1">
                          PNG, JPG, PDF, DOCX, XLSX, ZIP up to 10MB
                        </p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-[12px] text-[rgba(10,10,10,0.5)]">
                  Upload a screenshot, document, diagram, or exported output of this work
                </p>
              </div>

              {/* External Link */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">
                  External Link (Optional)
                </Label>
                <Input
                  placeholder="https://... (Google Drive, Figma, deployed URL, etc.)"
                  type="url"
                  value={formData.externalLink || ""}
                  onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                  className="font-space"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="font-space text-[13px]">Status</Label>
                <Select value={formData.status} onValueChange={(value) =>
                  setFormData({ ...formData, status: value as DeliverableStatus })
                }>
                  <SelectTrigger className="font-space">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-space">
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="submitted">Submitted to Supervisor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-[rgba(10,10,10,0.5)]">
                  Client Reviewed and Completed are set by your supervisor
                </p>
              </div>

              <Button
                type="submit"
                disabled={saving || uploading}
                className="w-full bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space"
              >
                {saving ? "Creating..." : "Create Deliverable"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List of Deliverables */}
      {loading ? (
        <div className="text-center py-4">
          <p className="font-space text-[13px] text-[rgba(10,10,10,0.5)]">Loading...</p>
        </div>
      ) : deliverables.length === 0 ? (
        <div className="text-center py-4">
          <p className="font-space text-[13px] text-[rgba(10,10,10,0.5)]">
            No deliverables yet. Add one to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className="bg-white border border-[rgba(10,10,10,0.08)] rounded-lg p-3 hover:border-[rgba(10,10,10,0.15)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
                    <span className="font-space text-[12px] text-[rgba(10,10,10,0.65)]">
                      {format(parseISO(deliverable.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <p className="font-space text-[13px] font-semibold text-[#0A0A0A] truncate">
                    {deliverable.title}
                  </p>
                  <p className="font-space text-[12px] text-[rgba(10,10,10,0.65)] line-clamp-2 mt-1">
                    {deliverable.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={deliverable.status} />
                    {deliverable.file_url && (
                      <a
                        href={deliverable.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-[#FFD700] hover:underline"
                      >
                        <span>{getFileIcon(deliverable.file_name)}</span>
                        <span>File</span>
                      </a>
                    )}
                    {deliverable.external_link && (
                      <a
                        href={deliverable.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-[#FFD700] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Link</span>
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(deliverable.id)}
                  disabled={deleting === deliverable.id}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
