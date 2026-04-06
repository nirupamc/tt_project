"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AssignEmployeeModal } from "@/components/admin/AssignEmployeeModal";
import type { Project, ProjectDayWithTasks, EnrollmentWithUser } from "@/types";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Pencil,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProjectDetailData extends Project {
  days: ProjectDayWithTasks[];
  enrollments: EnrollmentWithUser[];
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/admin/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push("/admin/projects");
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleRemoveEnrollment = async (userId: string) => {
    if (!confirm("Remove this employee from the project?")) return;

    try {
      const res = await fetch(
        `/api/admin/projects/${id}/enrollments?userId=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        toast.success("Employee removed from project");
        fetchProject();
      } else {
        throw new Error("Failed to remove");
      }
    } catch {
      toast.error("Failed to remove employee");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-8 w-64 bg-[#2A2A2A] mb-4" />
        <Skeleton className="h-64 bg-[#2A2A2A]" />
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

  const enrolledUserIds = project.enrollments.map((e) => e.user_id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="inline-flex items-center text-[#FFD700] hover:text-[#FFE44D] font-space mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-bebas text-4xl text-[#F5F5F0]">{project.title}</h1>
            <Badge
              className={project.is_published ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1" : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1"}
            >
              {project.is_published ? "Published" : "Draft"}
            </Badge>
            {project.is_active && <Badge className="bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1">Active</Badge>}
          </div>
          {project.skill_tag && (
            <Badge variant="outline" className="border-[rgba(255,215,0,0.3)] text-[#FFD700] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1">
              {project.skill_tag}
            </Badge>
          )}
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-2 max-w-2xl">{project.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/projects/${id}/build`}>
            <Button variant="outline" className="bg-transparent border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider">
              <Pencil className="h-4 w-4 mr-2" />
              Build Days
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <div>
              <Clock className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Duration</p>
              <p className="font-bebas text-[42px] text-[#F5F5F0] leading-none">
                {project.total_days}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <div>
              <Calendar className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Start Date</p>
              <p className="font-space text-[13px] text-[#F5F5F0]">
                {project.start_date
                  ? format(new Date(project.start_date), "MMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
          <CardContent className="p-6 flex items-center gap-4">
            <div>
              <Users className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <p className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">Enrolled</p>
              <p className="font-bebas text-[42px] text-[#F5F5F0] leading-none">
                {project.enrollments.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="border-[rgba(255,215,0,0.1)] mb-8" />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Enrolled Employees</CardTitle>
            <Button size="sm" onClick={() => setAssignModalOpen(true)} className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {project.enrollments.length === 0 ? (
              <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                No employees enrolled yet.
              </p>
            ) : (
              <div className="space-y-3">
                {project.enrollments.map((enrollment) => {
                  const user = enrollment.user;
                  if (!user) return null;
                  const initials =
                    user.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?";
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[rgba(255,215,0,0.08)] rounded-lg hover:bg-[rgba(255,215,0,0.03)]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-[#FFD700]">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-[#1A1A1A] text-[#F5F5F0]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-space font-medium text-[#F5F5F0]">{user.name}</p>
                          <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[rgba(245,245,240,0.5)] hover:text-red-400"
                        onClick={() => handleRemoveEnrollment(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl text-[#F5F5F0]">Project Days Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {project.days.length === 0 ? (
              <div className="text-center py-6 bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-lg">
                <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mb-4">
                  No days configured yet.
                </p>
                <Link href={`/admin/projects/${id}/build`}>
                  <Button className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">Build Days</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {project.days.slice(0, 10).map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[rgba(255,215,0,0.08)] rounded-lg hover:bg-[rgba(255,215,0,0.03)]"
                  >
                    <div>
                      <p className="font-space font-medium text-[#F5F5F0]">
                        Day {day.day_number}
                      </p>
                      <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                        {day.title || "Untitled"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase rounded px-2 py-1">
                      {day.tasks?.length || 0} tasks
                    </Badge>
                  </div>
                ))}
                {project.days.length > 10 && (
                  <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] text-center pt-2">
                    +{project.days.length - 10} more days
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignEmployeeModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        projectId={id}
        enrolledUserIds={enrolledUserIds}
        onSuccess={fetchProject}
      />
    </div>
  );
}
