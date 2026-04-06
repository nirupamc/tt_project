"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    skill_tag: "",
    total_days: 30,
    thumbnail_url: "",
    is_published: false,
    is_active: false,
    weekdays_only: false,
    daily_reminder_emails: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          thumbnail_url: formData.thumbnail_url || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create project");
      }

      toast.success("Project created successfully");
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        skill_tag: "",
        total_days: 30,
        thumbnail_url: "",
        is_published: false,
        is_active: false,
        weekdays_only: false,
        daily_reminder_emails: true,
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] rounded-2xl text-[#F5F5F0] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[rgba(255,215,0,0.1)] pb-4">
          <DialogTitle className="font-space text-lg font-semibold text-[#F5F5F0]">Create New Project</DialogTitle>
          <DialogDescription className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
            Set up a new learning project for employees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Project Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="React Fundamentals"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="A comprehensive introduction to React..."
                rows={3}
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill_tag" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Skill Tag</Label>
                <Input
                  id="skill_tag"
                  value={formData.skill_tag}
                  onChange={(e) =>
                    setFormData({ ...formData, skill_tag: e.target.value })
                  }
                  placeholder="React"
                  className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_days" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Total Days *</Label>
                <Input
                  id="total_days"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.total_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_days: parseInt(e.target.value) || 30,
                    })
                  }
                  required
                  className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
                placeholder="https://..."
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-[rgba(255,215,0,0.1)]">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_published" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Published</Label>
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.4)]">
                    Make visible to employees
                  </p>
                </div>
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Active</Label>
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.4)]">Currently running</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekdays_only" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Weekdays Only</Label>
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.4)]">
                    Skip weekends in day counting
                  </p>
                </div>
                <Switch
                  id="weekdays_only"
                  checked={formData.weekdays_only}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, weekdays_only: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="daily_reminder_emails" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Daily Emails</Label>
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.4)]">
                    Send daily task reminders
                  </p>
                </div>
                <Switch
                  id="daily_reminder_emails"
                  checked={formData.daily_reminder_emails}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, daily_reminder_emails: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-2 border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.1)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
