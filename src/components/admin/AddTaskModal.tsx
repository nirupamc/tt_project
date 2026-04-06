"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { TaskType } from "@/types";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  dayId: string;
  onSuccess?: () => void;
}

export function AddTaskModal({
  open,
  onOpenChange,
  projectId,
  dayId,
  onSuccess,
}: AddTaskModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("reading");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_required: true,
    // Reading fields
    reading_content_md: "",
    reading_time_minutes: 15,
    // Coding fields
    coding_starter_code: "",
    coding_language: "javascript",
    // Quiz fields
    quiz_questions: [
      { question: "", options: ["", "", "", ""], correct_index: 0 },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const taskData: Record<string, unknown> = {
        project_day_id: dayId,
        title: formData.title,
        task_type: taskType,
        description: formData.description,
        is_required: formData.is_required,
      };

      if (taskType === "reading") {
        taskData.reading_content_md = formData.reading_content_md;
        taskData.reading_time_minutes = formData.reading_time_minutes;
      } else if (taskType === "coding") {
        taskData.coding_starter_code = formData.coding_starter_code;
        taskData.coding_language = formData.coding_language;
      } else if (taskType === "quiz") {
        taskData.quiz_questions = formData.quiz_questions.filter((q) =>
          q.question.trim(),
        );
      }

      const res = await fetch(
        `/api/admin/projects/${projectId}/days/${dayId}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create task");
      }

      toast.success("Task created successfully");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTaskType("reading");
    setFormData({
      title: "",
      description: "",
      is_required: true,
      reading_content_md: "",
      reading_time_minutes: 15,
      coding_starter_code: "",
      coding_language: "javascript",
      quiz_questions: [
        { question: "", options: ["", "", "", ""], correct_index: 0 },
      ],
    });
  };

  const addQuizQuestion = () => {
    setFormData({
      ...formData,
      quiz_questions: [
        ...formData.quiz_questions,
        { question: "", options: ["", "", "", ""], correct_index: 0 },
      ],
    });
  };

  const updateQuizQuestion = (
    index: number,
    field: string,
    value: string | number | string[],
  ) => {
    const updated = [...formData.quiz_questions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, quiz_questions: updated });
  };

  const removeQuizQuestion = (index: number) => {
    setFormData({
      ...formData,
      quiz_questions: formData.quiz_questions.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] rounded-2xl text-[#F5F5F0] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[rgba(255,215,0,0.1)] pb-4">
          <DialogTitle className="font-space text-lg font-semibold text-[#F5F5F0]">Add New Task</DialogTitle>
          <DialogDescription className="font-space text-[13px] text-[rgba(245,245,240,0.6)]">
            Create a task for this day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task_type" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Task Type</Label>
              <Select
                value={taskType}
                onValueChange={(val) => setTaskType(val as TaskType)}
              >
                <SelectTrigger className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectItem value="reading" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">📖 Reading</SelectItem>
                  <SelectItem value="coding" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">💻 Coding</SelectItem>
                  <SelectItem value="quiz" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">📝 Quiz</SelectItem>
                  <SelectItem value="video" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">🎬 Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Introduction to Components"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
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
                placeholder="A brief overview..."
                rows={2}
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_required" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Required Task</Label>
                <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                  Must complete for day progress
                </p>
              </div>
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked })
                }
              />
            </div>

            {/* Reading-specific fields */}
            {taskType === "reading" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reading_time" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Reading Time (minutes)</Label>
                  <Input
                    id="reading_time"
                    type="number"
                    min={1}
                    value={formData.reading_time_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reading_time_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                    className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reading_content" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Content (Markdown)</Label>
                  <Textarea
                    id="reading_content"
                    value={formData.reading_content_md}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reading_content_md: e.target.value,
                      })
                    }
                    placeholder="# Heading\n\nYour content here..."
                    rows={8}
                    className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] font-mono text-sm"
                  />
                </div>
              </>
            )}

            {/* Coding-specific fields */}
            {taskType === "coding" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="coding_language" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Language</Label>
                  <Select
                    value={formData.coding_language}
                    onValueChange={(val) =>
                      setFormData({
                        ...formData,
                        coding_language: val || "javascript",
                      })
                    }
                  >
                    <SelectTrigger className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                      <SelectItem value="javascript" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">JavaScript</SelectItem>
                      <SelectItem value="typescript" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">TypeScript</SelectItem>
                      <SelectItem value="jsx" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">JSX</SelectItem>
                      <SelectItem value="tsx" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">TSX</SelectItem>
                      <SelectItem value="python" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">Python</SelectItem>
                      <SelectItem value="html" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">HTML</SelectItem>
                      <SelectItem value="css" className="text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.1)] hover:text-[#FFD700] cursor-pointer">CSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starter_code" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Starter Code</Label>
                  <Textarea
                    id="starter_code"
                    value={formData.coding_starter_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coding_starter_code: e.target.value,
                      })
                    }
                    placeholder="function hello() {\n  // your code here\n}"
                    rows={8}
                    className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] font-mono text-sm"
                  />
                </div>
              </>
            )}

            {/* Quiz-specific fields */}
            {taskType === "quiz" && (
              <div className="space-y-4">
                <Label className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Quiz Questions</Label>
                {formData.quiz_questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    className="p-4 bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.1)] rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-space text-sm font-medium text-[#F5F5F0]">
                        Question {qIndex + 1}
                      </span>
                      {formData.quiz_questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuizQuestion(qIndex)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      value={q.question}
                      onChange={(e) =>
                        updateQuizQuestion(qIndex, "question", e.target.value)
                      }
                      placeholder="What is React?"
                      className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
                    />
                    <div className="space-y-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correct_index === optIndex}
                            onChange={() =>
                              updateQuizQuestion(
                                qIndex,
                                "correct_index",
                                optIndex,
                              )
                            }
                            className="w-4 h-4"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...q.options];
                              newOptions[optIndex] = e.target.value;
                              updateQuizQuestion(qIndex, "options", newOptions);
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] placeholder:text-[rgba(245,245,240,0.3)] focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuizQuestion}
                  className="border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.1)]"
                >
                  Add Question
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-2 border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.1)] hover:border-[#FFD700] font-space font-semibold"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] active:bg-[#C8A800] font-space font-semibold transition-all duration-150">
              {isLoading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
