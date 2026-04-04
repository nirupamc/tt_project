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
        <Skeleton className="h-8 w-64 bg-gray-800 mb-4" />
        <Skeleton className="h-64 bg-gray-800" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-gray-500">Project not found.</p>
      </div>
    );
  }

  const enrolledUserIds = project.enrollments.map((e) => e.user_id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{project.title}</h1>
            <Badge
              className={project.is_published ? "bg-green-600" : "bg-gray-600"}
            >
              {project.is_published ? "Published" : "Draft"}
            </Badge>
            {project.is_active && <Badge className="bg-blue-600">Active</Badge>}
          </div>
          {project.skill_tag && (
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              {project.skill_tag}
            </Badge>
          )}
          <p className="text-gray-400 mt-2 max-w-2xl">{project.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/projects/${id}/build`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Build Days
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-400/10">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Duration</p>
              <p className="text-2xl font-bold text-white">
                {project.total_days} days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-400/10">
              <Calendar className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Start Date</p>
              <p className="text-2xl font-bold text-white">
                {project.start_date
                  ? format(new Date(project.start_date), "MMM d, yyyy")
                  : "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-400/10">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Enrolled</p>
              <p className="text-2xl font-bold text-white">
                {project.enrollments.length} employees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-gray-700 mb-8" />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Enrolled Employees</CardTitle>
            <Button size="sm" onClick={() => setAssignModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {project.enrollments.length === 0 ? (
              <p className="text-gray-500 text-sm">
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
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gray-600">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-400"
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

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Project Days Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {project.days.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm mb-4">
                  No days configured yet.
                </p>
                <Link href={`/admin/projects/${id}/build`}>
                  <Button>Build Days</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {project.days.slice(0, 10).map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">
                        Day {day.day_number}
                      </p>
                      <p className="text-sm text-gray-400">
                        {day.title || "Untitled"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-gray-600">
                      {day.tasks?.length || 0} tasks
                    </Badge>
                  </div>
                ))}
                {project.days.length > 10 && (
                  <p className="text-gray-500 text-sm text-center pt-2">
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
