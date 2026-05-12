"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { FileIcon, Trash2, ExternalLink, Upload, Loader2 } from "lucide-react";
import type { Deliverable } from "@/types";

interface ProjectDeliverablesProps {
  projectId: string;
}

export function ProjectDeliverables({ projectId }: ProjectDeliverablesProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [externalLink, setExternalLink] = useState("");
  const [status, setStatus] = useState("in_progress");

  // Fetch deliverables on mount
  useEffect(() => {
    fetchDeliverables();
  }, [projectId]);

  async function fetchDeliverables() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/employee/deliverables?projectId=${projectId}`
      );
      if (response.ok) {
        const data = await response.json();
        setDeliverables(data);
      }
    } catch (error) {
      console.error("Failed to fetch deliverables:", error);
      toast.error("Failed to load deliverables");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not allowed. Accepted: PNG, JPG, PDF, DOCX, XLSX, ZIP");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const response = await fetch("/api/employee/deliverables/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const { url, filename } = await response.json();
      setFileUrl(url);
      setFileName(filename);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || title.length < 10) {
      toast.error("Title must be at least 10 characters");
      return;
    }

    if (!description || description.length < 80) {
      toast.error("Description must be at least 80 characters");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/employee/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          date,
          title,
          description,
          file_url: fileUrl,
          file_name: fileName,
          external_link: externalLink || null,
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const newDeliverable = await response.json();
      setDeliverables([newDeliverable, ...deliverables]);

      // Reset form
      setTitle("");
      setDescription("");
      setFileUrl(null);
      setFileName(null);
      setExternalLink("");
      setStatus("in_progress");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setShowForm(false);

      toast.success("Deliverable created successfully");
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create deliverable"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;

    try {
      const response = await fetch(`/api/employee/deliverables/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setDeliverables(deliverables.filter((d) => d.id !== id));
      toast.success("Deliverable deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete deliverable");
    }
  }

  const statusColors = {
    in_progress: "bg-blue-100 text-blue-800",
    submitted: "bg-amber-100 text-amber-800",
    client_reviewed: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[rgba(10,10,10,0.5)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-[#FFD700] text-[#0A0A0A] hover:bg-[#E6C200] font-space text-[13px] font-semibold"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Deliverable
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-[rgba(255,215,0,0.05)] rounded-lg border border-[rgba(255,215,0,0.2)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
                Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                className="font-space text-[13px]"
              />
            </div>
            <div>
              <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
                Status
              </Label>
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger className="font-space text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted to Supervisor</SelectItem>
                  <SelectItem value="client_reviewed">Client Reviewed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
              Title ({title.length}/10+)
            </Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., REST API for user authentication — Node.js"
              minLength={10}
              className="font-space text-[13px]"
            />
            {title && title.length < 10 && (
              <p className="text-red-600 text-[12px] mt-1">
                Minimum 10 characters required
              </p>
            )}
          </div>

          <div>
            <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
              Description ({description.length}/80+)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you built, what problem it solves, and what technologies you used."
              minLength={80}
              rows={4}
              className="font-space text-[13px]"
            />
            {description && description.length < 80 && (
              <p className="text-red-600 text-[12px] mt-1">
                Minimum 80 characters required
              </p>
            )}
          </div>

          <div>
            <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
              File Upload (PNG, JPG, PDF, DOCX, XLSX, ZIP, max 10MB)
            </Label>
            {fileUrl && fileName ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileIcon className="h-4 w-4 text-green-600" />
                <span className="font-space text-[13px] text-green-800">{fileName}</span>
              </div>
            ) : (
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.zip"
                className="font-space text-[13px]"
              />
            )}
            {uploading && (
              <p className="text-amber-600 text-[12px] mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </p>
            )}
          </div>

          <div>
            <Label className="font-space text-[13px] font-semibold text-[#0A0A0A]">
              External Link (optional)
            </Label>
            <Input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://... (Google Drive, Figma, deployed URL, etc)"
              className="font-space text-[13px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space text-[13px] font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Deliverable"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="font-space text-[13px] font-semibold"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {deliverables.length === 0 ? (
        !showForm && (
          <p className="text-center text-[rgba(10,10,10,0.5)] font-space text-[13px] py-6">
            No deliverables yet. Add one to show your work output.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {deliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className="flex items-start justify-between p-3 border border-[rgba(10,10,10,0.08)] rounded-lg hover:bg-[rgba(10,10,10,0.02)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-space text-[13px] font-semibold text-[#0A0A0A] truncate">
                    {deliverable.title}
                  </span>
                  <Badge
                    className={`shrink-0 font-space text-[10px] font-semibold ${
                      statusColors[deliverable.status]
                    }`}
                  >
                    {deliverable.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="font-space text-[12px] text-[rgba(10,10,10,0.5)] mb-2">
                  {format(new Date(deliverable.date), "MMM d, yyyy")}
                </p>
                <p className="font-space text-[12px] text-[rgba(10,10,10,0.6)] line-clamp-2 mb-2">
                  {deliverable.description}
                </p>
                <div className="flex items-center gap-3">
                  {deliverable.file_url && (
                    <a
                      href={deliverable.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#FFD700] hover:text-[#E6C200] font-space text-[12px] font-semibold"
                    >
                      <FileIcon className="h-3 w-3" />
                      File
                    </a>
                  )}
                  {deliverable.external_link && (
                    <a
                      href={deliverable.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#FFD700] hover:text-[#E6C200] font-space text-[12px] font-semibold"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Link
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(deliverable.id)}
                className="ml-2 p-1.5 text-[rgba(10,10,10,0.5)] hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
