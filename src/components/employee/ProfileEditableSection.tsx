"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="profile-card bg-[#1A1A1A] border border-[rgba(255,215,0,0.16)] rounded-xl p-6">
      <h2 className="font-space font-semibold text-[#F5F5F0] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface EditableSectionProps {
  title: string;
  fields: Array<{
    key: string;
    label: string;
    value: string | number | null | undefined;
    placeholder?: string;
    type?: "text" | "email" | "url" | "number";
    hint?: string;
  }>;
  onSave: (updates: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const inputClassName =
  "w-full rounded-md border border-[rgba(255,215,0,0.18)] bg-[#0F0F0F] px-3 py-2 font-space text-sm text-white outline-none transition focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.12)]";

export function ProfileEditableSection({
  title,
  fields,
  onSave,
  isSaving,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      initial[field.key] = field.value || "";
    });
    setFormData(initial);
  }, [fields]);

  const hasChanges = fields.some(
    (field) => formData[field.key] !== (field.value || "")
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      setIsEditing(false);
      toast.success(`${title} updated successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={title}>
      {isEditing ? (
        <div className="space-y-4">
          {fields.map((field) => (
            <label key={field.key} className="space-y-2 block">
              <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">
                {field.label}
              </span>
              <input
                type={field.type || "text"}
                value={formData[field.key]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className={inputClassName}
              />
              {field.hint && (
                <p className="font-space text-xs text-[rgba(245,245,240,0.5)]">
                  {field.hint}
                </p>
              )}
            </label>
          ))}
          {error && <p className="font-space text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {fields.map((field) => (
            <div key={field.key} className="flex justify-between items-start">
              <span className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">
                {field.label}
              </span>
              <span className="font-space text-[13px] text-[#F5F5F0] text-right max-w-xs break-words">
                {field.value || (
                  <span className="italic text-[rgba(245,245,240,0.5)]">
                    Not set
                  </span>
                )}
              </span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-[#FFD700] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] font-space"
            >
              <PencilLine className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
