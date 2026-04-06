"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { ProjectDay, TaskWithCompletion } from "@/types";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  FileText,
  Code,
  HelpCircle,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <Skeleton className="h-64" /> },
);

const taskTypeIcons: Record<string, React.ReactNode> = {
  reading: <FileText className="h-5 w-5" />,
  coding: <Code className="h-5 w-5" />,
  quiz: <HelpCircle className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
};

interface DayPageProps {
  params: Promise<{ id: string; day: string }>;
}

export default function DayTasksPage({ params }: DayPageProps) {
  const { id: projectId, day: dayNumber } = use(params);
  const router = useRouter();

  const [projectDay, setProjectDay] = useState<ProjectDay | null>(null);
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [codeSubmissions, setCodeSubmissions] = useState<
    Record<string, string>
  >({});

  const fetchData = async () => {
    try {
      const res = await fetch(
        `/api/employee/projects/${projectId}/day/${dayNumber}`,
      );
      if (!res.ok) {
        router.push(`/dashboard/projects/${projectId}`);
        return;
      }
      const data = await res.json();
      setProjectDay(data.day);
      setTasks(data.tasks);

      // Initialize code submissions with starter code
      const codeInit: Record<string, string> = {};
      data.tasks.forEach((task: TaskWithCompletion) => {
        if (task.task_type === "coding") {
          const savedCode = task.completion?.submission_data as
            | { code?: string }
            | undefined;
          codeInit[task.id] = savedCode?.code || task.coding_starter_code || "";
        }
      });
      setCodeSubmissions(codeInit);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, dayNumber]);

  const handleCompleteTask = async (
    task: TaskWithCompletion,
    submissionData?: Record<string, unknown>,
  ) => {
    if (!projectDay) return;

    setSubmitting(task.id);

    try {
      const res = await fetch("/api/employee/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          project_day_id: projectDay.id,
          project_id: projectId,
          submission_data: submissionData,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to complete task");
      }

      const result = await res.json();
      toast.success("Task completed!");

      if (result.all_required_complete) {
        toast.success("Day completed! 5 hours logged to your timesheet.");
      }

      fetchData();
    } catch {
      toast.error("Failed to complete task");
    } finally {
      setSubmitting(null);
    }
  };

  const handleQuizSubmit = (task: TaskWithCompletion) => {
    const answers = quizAnswers[task.id] || [];
    const questions = task.quiz_questions || [];

    // Calculate score
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_index) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);

    handleCompleteTask(task, {
      answers,
      score,
      correct,
      total: questions.length,
    });
  };

  const handleCodeSubmit = (task: TaskWithCompletion) => {
    handleCompleteTask(task, {
      code: codeSubmissions[task.id] || "",
    });
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 bg-[rgba(10,10,10,0.05)] mb-4" />
        <Skeleton className="h-96 bg-[rgba(10,10,10,0.05)]" />
      </div>
    );
  }

  if (!projectDay) {
    return (
      <div className="text-center py-12">
        <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)]">Day not found.</p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completion).length;
  const requiredCount = tasks.filter((t) => t.is_required).length;
  const requiredCompletedCount = tasks.filter(
    (t) => t.is_required && t.completion,
  ).length;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="inline-flex items-center font-space text-[13px] text-[rgba(10,10,10,0.6)] hover:text-[#C8A800] mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-[#0A0A0A]">
          Day {dayNumber}: {projectDay.title || "Untitled"}
        </h1>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="secondary" className="font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
            {completedCount}/{tasks.length} tasks completed
          </Badge>
          {requiredCount > 0 && (
            <Badge
              variant={
                requiredCompletedCount === requiredCount ? "default" : "outline"
              }
              className="font-space text-[10px] font-semibold tracking-[1.5px] uppercase"
            >
              {requiredCompletedCount}/{requiredCount} required
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {tasks.map((task, index) => (
          <Card
            key={task.id}
            className={`bg-white border rounded-xl ${
              task.completion
                ? "border-[#22c55e] hover:border-[#22c55e]"
                : "border-[rgba(10,10,10,0.08)] hover:border-[#FFD700]"
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${task.completion ? "bg-[rgba(34,197,94,0.1)]" : "bg-[rgba(10,10,10,0.05)]"}`}
                  >
                    {task.completion ? (
                      <CheckCircle className="h-5 w-5 text-[#22c55e]" />
                    ) : (
                      taskTypeIcons[task.task_type]
                    )}
                  </div>
                  <div>
                    <CardTitle className="font-space font-semibold text-[#0A0A0A]">{task.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`font-space text-[10px] font-semibold tracking-[1.5px] uppercase ${
                          task.task_type === 'coding' ? 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6] border-[#3b82f6]' :
                          task.task_type === 'reading' ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[#22c55e]' :
                          task.task_type === 'quiz' ? 'bg-[rgba(168,85,247,0.1)] text-[#a855f7] border-[#a855f7]' :
                          'bg-[rgba(10,10,10,0.05)] text-[#0A0A0A]'
                        }`}
                      >
                        {task.task_type}
                      </Badge>
                      {task.is_required && (
                        <Badge variant="secondary" className="font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {task.completion && (
                  <Badge className="bg-[#22c55e] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">Completed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {task.description && (
                <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)] mb-4">
                  {task.description}
                </p>
              )}

              {/* Reading Task */}
              {task.task_type === "reading" && (
                <div>
                  {task.reading_time_minutes && (
                    <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)] mb-4">
                      Estimated reading time: {task.reading_time_minutes}{" "}
                      minutes
                    </p>
                  )}
                  {task.reading_content_md && (
                    <div className="prose max-w-none bg-[rgba(10,10,10,0.02)] border border-[rgba(10,10,10,0.08)] rounded-lg p-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {task.reading_content_md}
                      </ReactMarkdown>
                    </div>
                  )}
                  {!task.completion && (
                    <Button
                      className="mt-4 bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space font-semibold"
                      onClick={() => handleCompleteTask(task)}
                      disabled={submitting === task.id}
                    >
                      {submitting === task.id ? "Marking..." : "Mark as Read"}
                    </Button>
                  )}
                </div>
              )}

              {/* Coding Task */}
              {task.task_type === "coding" && (
                <div>
                  <div className="border border-[rgba(10,10,10,0.08)] rounded-lg overflow-hidden">
                    <MonacoEditor
                      height="300px"
                      language={task.coding_language || "javascript"}
                      theme="vs-dark"
                      value={codeSubmissions[task.id] || ""}
                      onChange={(value) =>
                        setCodeSubmissions({
                          ...codeSubmissions,
                          [task.id]: value || "",
                        })
                      }
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        readOnly: !!task.completion,
                      }}
                    />
                  </div>
                  {!task.completion && (
                    <Button
                      className="mt-4 bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space font-semibold"
                      onClick={() => handleCodeSubmit(task)}
                      disabled={submitting === task.id}
                    >
                      {submitting === task.id ? "Submitting..." : "Submit Code"}
                    </Button>
                  )}
                </div>
              )}

              {/* Quiz Task */}
              {task.task_type === "quiz" && task.quiz_questions && (
                <div className="space-y-6">
                  {task.quiz_questions.map((question, qIndex) => {
                    const submissionData = task.completion?.submission_data as
                      | {
                          answers?: number[];
                          correct?: number;
                          total?: number;
                          score?: number;
                        }
                      | undefined;
                    const userAnswer = submissionData?.answers?.[qIndex];
                    const isCorrect = userAnswer === question.correct_index;

                    return (
                      <div key={qIndex} className="space-y-3">
                        <p className="font-space font-semibold text-[#0A0A0A]">
                          {qIndex + 1}. {question.question}
                        </p>
                        <div className="space-y-2 pl-4">
                          {question.options.map((option, oIndex) => {
                            const isSelected = task.completion
                              ? userAnswer === oIndex
                              : quizAnswers[task.id]?.[qIndex] === oIndex;
                            const showCorrect =
                              task.completion &&
                              oIndex === question.correct_index;
                            const showIncorrect =
                              task.completion && isSelected && !isCorrect;

                            return (
                              <label
                                key={oIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors font-space text-[13px] ${
                                  showCorrect
                                    ? "bg-[rgba(34,197,94,0.1)] border border-[#22c55e]"
                                    : showIncorrect
                                      ? "bg-[rgba(239,68,68,0.1)] border border-[#ef4444]"
                                      : isSelected
                                        ? "bg-[rgba(59,130,246,0.1)] border border-[#3b82f6]"
                                        : "bg-[rgba(10,10,10,0.02)] border border-[rgba(10,10,10,0.08)] hover:border-[#FFD700]"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`quiz-${task.id}-${qIndex}`}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (!task.completion) {
                                      const newAnswers = { ...quizAnswers };
                                      if (!newAnswers[task.id]) {
                                        newAnswers[task.id] = [];
                                      }
                                      newAnswers[task.id][qIndex] = oIndex;
                                      setQuizAnswers(newAnswers);
                                    }
                                  }}
                                  disabled={!!task.completion}
                                  className="w-4 h-4"
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {task.completion &&
                    (() => {
                      const quizResult = task.completion.submission_data as
                        | { correct?: number; total?: number; score?: number }
                        | undefined;
                      return (
                        <div className="p-4 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] rounded-lg">
                          <p className="font-space font-semibold text-[#0A0A0A]">
                            Score: {quizResult?.correct || 0}/
                            {quizResult?.total || 0} correct (
                            {quizResult?.score || 0}%)
                          </p>
                        </div>
                      );
                    })()}

                  {!task.completion && (
                    <Button
                      className="bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space font-semibold"
                      onClick={() => handleQuizSubmit(task)}
                      disabled={
                        submitting === task.id ||
                        (quizAnswers[task.id]?.length || 0) <
                          (task.quiz_questions?.length || 0)
                      }
                    >
                      {submitting === task.id ? "Submitting..." : "Submit Quiz"}
                    </Button>
                  )}
                </div>
              )}

              {/* Video Task (placeholder) */}
              {task.task_type === "video" && (
                <div>
                  <p className="font-space text-[13px] text-[rgba(10,10,10,0.6)]">
                    Video content would be displayed here.
                  </p>
                  {!task.completion && (
                    <Button
                      className="mt-4 bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space font-semibold"
                      onClick={() => handleCompleteTask(task)}
                      disabled={submitting === task.id}
                    >
                      {submitting === task.id
                        ? "Marking..."
                        : "Mark as Watched"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
