import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';
import { Clock, Calendar, ArrowRight } from 'lucide-react';

interface EmployeeProjectCardProps {
  project: Project;
  progress?: {
    completed_days: number;
    total_days: number;
  };
}

export function EmployeeProjectCard({ project, progress }: EmployeeProjectCardProps) {
  const progressPercent = progress
    ? Math.round((progress.completed_days / progress.total_days) * 100)
    : 0;

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col">
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
          <CardTitle className="text-gray-900 dark:text-white text-lg line-clamp-2">
            {project.title}
          </CardTitle>
        </div>
        {project.skill_tag && (
          <Badge variant="secondary" className="w-fit">
            {project.skill_tag}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
          {project.description || 'No description provided.'}
        </p>
        <div className="flex gap-4 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{project.total_days} days</span>
          </div>
          {project.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(project.start_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="font-medium text-gray-900 dark:text-white">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link href={`/dashboard/projects/${project.id}`} className="w-full">
          <Button className="w-full">
            Continue Learning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
