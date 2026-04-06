"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddTaskModal } from "@/components/admin/AddTaskModal";
import type { Project, ProjectDayWithTasks, Task } from "@/types";
import {
  ArrowLeft,
  Plus,
  Upload,
  Trash2,
  FileText,
  Code,
  HelpCircle,
  Video,
} from "lucide-react";
import { toast } from "sonner";

const taskTypeIcons: Record<string, React.ReactNode> = {
  reading: <FileText className="h-4 w-4" />,
  coding: <Code className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
};

const taskTypeColors: Record<string, string> = {
  reading: "bg-blue-600",
  coding: "bg-green-600",
  quiz: "bg-purple-600",
  video: "bg-orange-600",
};

export default function ProjectBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [days, setDays] = useState<ProjectDayWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTaskModal, setAddTaskModal] = useState<{
    open: boolean;
    dayId: string;
  } | null>(null);
  const [newDayNumber, setNewDayNumber] = useState("");
  const [newDayTitle, setNewDayTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const [projectRes, daysRes] = await Promise.all([
        fetch(`/api/admin/projects/${id}`),
        fetch(`/api/admin/projects/${id}/days`),
      ]);

      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      } else {
        router.push("/admin/projects");
        return;
      }

      if (daysRes.ok) {
        const daysData = await daysRes.json();
        setDays(daysData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddDay = async () => {
    const dayNum = parseInt(newDayNumber);
    if (!dayNum || dayNum < 1) {
      toast.error("Please enter a valid day number");
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_number: dayNum,
          title: newDayTitle || `Day ${dayNum}`,
        }),
      });

      if (res.ok) {
        toast.success(`Day ${dayNum} created`);
        setNewDayNumber("");
        setNewDayTitle("");
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to create day");
      }
    } catch {
      toast.error("Failed to create day");
    }
  };

  const handleDeleteTask = async (dayId: string, taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const res = await fetch(
        `/api/admin/projects/${id}/days/${dayId}/tasks?taskId=${taskId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        toast.success("Task deleted");
        fetchData();
      } else {
        toast.error("Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch(`/api/admin/projects/${id}/tasks/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.message);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to upload");
      }
    } catch (err) {
      toast.error("Invalid JSON file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-8 w-64 bg-[#2A2A2A] mb-4" />
        <Skeleton className="h-96 bg-[#2A2A2A]" />
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
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href={`/admin/projects/${id}`}
          className="inline-flex items-center text-[#FFD700] hover:text-[#FFE44D] font-space mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl text-[#F5F5F0]">
            Build: {project.title}
          </h1>
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-1">
            Configure days and tasks for this project
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-transparent border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload JSON"}
          </Button>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl mb-6">
        <CardHeader>
          <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Add New Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="number"
              placeholder="Day number"
              value={newDayNumber}
              onChange={(e) => setNewDayNumber(e.target.value)}
              className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] w-full sm:w-32"
            />
            <Input
              placeholder="Day title (optional)"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] flex-1"
            />
            <Button onClick={handleAddDay} className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">
              <Plus className="h-4 w-4 mr-2" />
              Add Day
            </Button>
          </div>
        </CardContent>
      </Card>

      {days.length === 0 ? (
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardContent className="py-12 text-center">
            <p className="font-space font-medium text-[#F5F5F0] mb-4">No days configured yet.</p>
            <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
              Add days manually above or upload a JSON file to bulk import.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {days.map((day) => (
            <AccordionItem
              key={day.id}
              value={day.id}
              className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:bg-[rgba(255,215,0,0.03)]">
                <div className="flex items-center gap-4">
                  <span className="font-bebas text-lg text-[#F5F5F0]">
                    Day {day.day_number}
                  </span>
                  <span className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">{day.title}</span>
                  <Badge variant="secondary" className="bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1">
                    {day.tasks?.length || 0} tasks
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                  {day.tasks && day.tasks.length > 0 ? (
                    day.tasks.map((task: Task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[rgba(255,215,0,0.08)] rounded-lg hover:bg-[rgba(255,215,0,0.03)]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded ${taskTypeColors[task.task_type]}`}
                          >
                            {taskTypeIcons[task.task_type]}
                          </div>
                          <div>
                            <p className="font-space font-medium text-[#F5F5F0]">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                              <span className="capitalize">
                                {task.task_type}
                              </span>
                              {task.is_required && (
                                <Badge
                                  variant="outline"
                                  className="border-[#FFD700] text-[#FFD700] font-space text-[10px] font-semibold tracking-[1.5px] uppercase"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[rgba(245,245,240,0.5)] hover:text-red-400"
                          onClick={() => handleDeleteTask(day.id, task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] py-2">
                      No tasks for this day.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAddTaskModal({ open: true, dayId: day.id })
                    }
                    className="bg-transparent border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {addTaskModal && (
        <AddTaskModal
          open={addTaskModal.open}
          onOpenChange={(open) => setAddTaskModal(open ? addTaskModal : null)}
          projectId={id}
          dayId={addTaskModal.dayId}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
