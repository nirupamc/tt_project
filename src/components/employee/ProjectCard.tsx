import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types";
import { Clock, Calendar, ArrowRight } from "lucide-react";

interface EmployeeProjectCardProps {
  project: Project;
  progress?: {
    completed_days: number;
    total_days: number;
  };
}

export function EmployeeProjectCard({
  project,
  progress,
}: EmployeeProjectCardProps) {
  const progressPercent = progress
    ? Math.round((progress.completed_days / progress.total_days) * 100)
    : 0;

  return (
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl hover:border-[#FFD700] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,215,0,0.12)] transition-all duration-200 flex flex-col">
      {project.thumbnail_url && (
        <div className="h-40 overflow-hidden rounded-t-lg">
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-space text-[17px] font-semibold text-[#0A0A0A] line-clamp-2">
            {project.title}
          </CardTitle>
        </div>
        {project.skill_tag && (
          <Badge variant="secondary" className="w-fit bg-[rgba(255,215,0,0.12)] text-[#C8A800] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
            {project.skill_tag}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] line-clamp-2 leading-relaxed">
          {project.description || "No description provided."}
        </p>
        <div className="flex gap-4 mt-4 font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
            <span>{project.total_days} days</span>
          </div>
          {project.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
              <span>{new Date(project.start_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">Progress</span>
              <span className="font-bebas text-[20px] text-[#0A0A0A] leading-none">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-[rgba(255,215,0,0.1)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFD700] rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-4 border-t border-[rgba(10,10,10,0.08)]">
        <Link href={`/dashboard/projects/${project.id}`} className="w-full">
          <Button className="w-full bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space text-[13px] font-semibold tracking-wider">
            Continue Learning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
