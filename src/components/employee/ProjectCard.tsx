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
import type { Project, CompletedDummyProject } from "@/types";
import { Clock, Calendar, ArrowRight, Lock } from "lucide-react";

interface EmployeeProjectCardProps {
  project: Project | CompletedDummyProject;
  progress?: {
    completed_days: number;
    total_days: number;
  };
}

export function EmployeeProjectCard({
  project,
  progress,
}: EmployeeProjectCardProps) {
  // Check if this is a completed dummy project
  const isDummy = 'is_dummy' in project && project.is_dummy;
  const dummyProject = isDummy ? project as CompletedDummyProject : null;
  
  const progressPercent = isDummy 
    ? 100 
    : progress
    ? Math.round((progress.completed_days / progress.total_days) * 100)
    : 0;

  // Completed dummy project card (greyed out, locked)
  if (isDummy && dummyProject) {
    return (
      <Card 
        className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl flex flex-col opacity-60 pointer-events-none"
        style={{ filter: 'grayscale(0.3)' }}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-space text-[17px] font-semibold text-[#0A0A0A] line-clamp-2">
              {dummyProject.title}
            </CardTitle>
            <Badge className="bg-green-500 text-white border-0 font-space text-[10px] font-semibold tracking-[1.5px] uppercase shrink-0">
              COMPLETED
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] line-clamp-2 leading-relaxed">
            {dummyProject.description}
          </p>
          <div className="flex gap-4 mt-4 font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
              <span>{dummyProject.duration_months} {dummyProject.duration_months === 1 ? 'month' : 'months'}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">Progress</span>
              <span className="font-bebas text-[20px] text-[#0A0A0A] leading-none">
                100%
              </span>
            </div>
            <div className="h-2 bg-[rgba(34,197,94,0.1)] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-4 border-t border-[rgba(10,10,10,0.08)]">
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[rgba(10,10,10,0.05)] rounded-md">
            <Lock className="h-4 w-4 text-[rgba(10,10,10,0.4)]" />
            <span className="font-space text-[13px] font-semibold text-[rgba(10,10,10,0.4)] tracking-wider">
              LOCKED
            </span>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Active project card (existing design)
  const activeProject = project as Project;
  const assignedDate = ('assigned_date' in activeProject ? activeProject.assigned_date : activeProject.start_date) as string | undefined;

  return (
    <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl hover:border-[#FFD700] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,215,0,0.12)] transition-all duration-200 flex flex-col">
      {activeProject.thumbnail_url && (
        <div className="h-40 overflow-hidden rounded-t-lg">
          <img
            src={activeProject.thumbnail_url}
            alt={activeProject.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-space text-[17px] font-semibold text-[#0A0A0A] line-clamp-2">
            {activeProject.title}
          </CardTitle>
        </div>
        {activeProject.skill_tag && (
          <Badge variant="secondary" className="w-fit bg-[rgba(255,215,0,0.12)] text-[#C8A800] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
            {activeProject.skill_tag}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] line-clamp-2 leading-relaxed">
          {activeProject.description || "No description provided."}
        </p>
        <div className="flex gap-4 mt-4 font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
            <span>{activeProject.total_days} days</span>
          </div>
          {assignedDate ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
              <span>{new Date(assignedDate).toLocaleDateString()}</span>
            </div>
          ) : null}
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
        <Link href={`/dashboard/projects/${activeProject.id}`} className="w-full">
          <Button className="w-full bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space text-[13px] font-semibold tracking-wider">
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
