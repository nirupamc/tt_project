"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProjectWithEnrollments } from "@/types";
import { Calendar, Users, Clock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ProjectCardProps {
  project: ProjectWithEnrollments;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleTogglePublish = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_published: !project.is_published,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update project");
      }

      toast.success(
        project.is_published ? "Project unpublished" : "Project published",
        {
          description: project.is_published
            ? "Project is now hidden from employees"
            : "Project is now visible to employees",
        }
      );

      onUpdate?.();
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update project status",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,215,0,0.08)] transition-all duration-200 flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-space text-base font-semibold text-[#F5F5F0] line-clamp-2">
            {project.title}
          </CardTitle>
          <div className="flex flex-col gap-1">
            <Badge
              variant={project.is_published ? "default" : "secondary"}
              className={project.is_published ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase" : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase"}
            >
              {project.is_published ? "Published" : "Draft"}
            </Badge>
            {project.is_active && <Badge className="bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">Active</Badge>}
          </div>
        </div>
        {project.skill_tag && (
          <Badge
            variant="outline"
            className="w-fit border-[rgba(255,215,0,0.3)] text-[#FFD700] bg-[rgba(255,215,0,0.08)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase mt-2"
          >
            {project.skill_tag}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] line-clamp-3">
          {project.description || "No description provided."}
        </p>
        <div className="flex flex-wrap gap-4 mt-4 font-space text-[13px] text-[rgba(245,245,240,0.5)]">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{project.total_days} days</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.enrollment_count || 0} enrolled</span>
          </div>
          {project.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Starts {new Date(project.start_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-4 border-t border-[rgba(255,215,0,0.1)]">
        <div className="flex gap-2 w-full">
          <Link href={`/admin/projects/${project.id}/build`} className="flex-1">
            <Button variant="outline" className="w-full bg-transparent border border-[rgba(255,215,0,0.3)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.08)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider">
              Build Days
            </Button>
          </Link>
          <Link href={`/admin/projects/${project.id}`} className="flex-1">
            <Button className="w-full bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">
              View Details
            </Button>
          </Link>
        </div>
        <Button
          onClick={handleTogglePublish}
          disabled={isUpdating}
          variant="outline"
          className={`w-full font-space text-[13px] font-semibold tracking-wider ${
            project.is_published
              ? "border-[rgba(239,68,68,0.3)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] hover:border-[#ef4444]"
              : "border-[rgba(34,197,94,0.3)] text-[#22c55e] hover:bg-[rgba(34,197,94,0.08)] hover:border-[#22c55e]"
          }`}
        >
          {isUpdating ? (
            "Updating..."
          ) : project.is_published ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Unpublish
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Publish
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
