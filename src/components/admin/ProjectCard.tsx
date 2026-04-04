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
import { Calendar, Users, Clock } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: ProjectWithEnrollments;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="bg-gray-800 border-gray-700 flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-white text-lg line-clamp-2">
            {project.title}
          </CardTitle>
          <div className="flex flex-col gap-1">
            <Badge
              variant={project.is_published ? "default" : "secondary"}
              className={project.is_published ? "bg-green-600" : "bg-gray-600"}
            >
              {project.is_published ? "Published" : "Draft"}
            </Badge>
            {project.is_active && <Badge className="bg-blue-600">Active</Badge>}
          </div>
        </div>
        {project.skill_tag && (
          <Badge
            variant="outline"
            className="w-fit border-gray-600 text-gray-400 mt-2"
          >
            {project.skill_tag}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-gray-400 text-sm line-clamp-3">
          {project.description || "No description provided."}
        </p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
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
      <CardFooter className="flex gap-2 pt-4 border-t border-gray-700">
        <Link href={`/admin/projects/${project.id}/build`} className="flex-1">
          <Button variant="outline" className="w-full">
            Build Days
          </Button>
        </Link>
        <Link href={`/admin/projects/${project.id}`} className="flex-1">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
