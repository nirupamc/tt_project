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
    start_date: "",
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
          start_date: formData.start_date || null,
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
        start_date: "",
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
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up a new learning project for employees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="React Fundamentals"
                required
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="A comprehensive introduction to React..."
                rows={3}
                className="bg-gray-700 border-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill_tag">Skill Tag</Label>
                <Input
                  id="skill_tag"
                  value={formData.skill_tag}
                  onChange={(e) =>
                    setFormData({ ...formData, skill_tag: e.target.value })
                  }
                  placeholder="React"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_days">Total Days *</Label>
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
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) =>
                    setFormData({ ...formData, thumbnail_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_published">Published</Label>
                  <p className="text-sm text-gray-500">
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
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-gray-500">Currently running</p>
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
                  <Label htmlFor="weekdays_only">Weekdays Only</Label>
                  <p className="text-sm text-gray-500">
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
                  <Label htmlFor="daily_reminder_emails">Daily Emails</Label>
                  <p className="text-sm text-gray-500">
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
