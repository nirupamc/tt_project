'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project, ProjectDayWithTasks, DayStatus } from '@/types';
import { ArrowLeft, Lock, CheckCircle, PlayCircle, Calendar } from 'lucide-react';
import { differenceInDays, isWeekend, addDays, format } from 'date-fns';

interface ProjectDayWithStatus extends ProjectDayWithTasks {
  status: DayStatus;
  is_completed: boolean;
}

function calculateDayStatus(
  dayNumber: number,
  startDate: string | null,
  weekdaysOnly: boolean,
  completedDayNumbers: Set<number>
): DayStatus {
  if (completedDayNumbers.has(dayNumber)) {
    return 'completed';
  }

  if (!startDate) {
    return dayNumber === 1 ? 'available' : 'locked';
  }

  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDay = 0;
  let date = new Date(start);

  while (date <= today) {
    if (!weekdaysOnly || !isWeekend(date)) {
      currentDay++;
    }
    date = addDays(date, 1);
  }

  if (dayNumber <= currentDay) {
    return 'available';
  }

  return 'locked';
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [days, setDays] = useState<ProjectDayWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project details
        const projectRes = await fetch(`/api/employee/projects/${id}`);
        if (!projectRes.ok) {
          router.push('/dashboard');
          return;
        }
        const projectData = await projectRes.json();
        setProject(projectData.project);

        // Calculate day statuses
        const completedDayNumbers = new Set<number>(
          projectData.completed_day_numbers || []
        );

        const daysWithStatus = projectData.days.map((day: ProjectDayWithTasks) => ({
          ...day,
          status: calculateDayStatus(
            day.day_number,
            projectData.project.start_date,
            projectData.project.weekdays_only,
            completedDayNumbers
          ),
          is_completed: completedDayNumbers.has(day.day_number),
        }));

        setDays(daysWithStatus);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 bg-gray-200 dark:bg-gray-800 mb-4" />
        <Skeleton className="h-64 bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found or you don&apos;t have access.</p>
      </div>
    );
  }

  const statusIcons = {
    locked: <Lock className="h-5 w-5 text-gray-400" />,
    available: <PlayCircle className="h-5 w-5 text-blue-500" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  };

  const statusColors = {
    locked: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    available: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    completed: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
          {project.skill_tag && (
            <Badge variant="secondary">{project.skill_tag}</Badge>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
        {project.start_date && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Started {format(new Date(project.start_date), 'MMMM d, yyyy')}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {days.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No content available yet.</p>
            </CardContent>
          </Card>
        ) : (
          days.map((day) => (
            <Card
              key={day.id}
              className={`border ${statusColors[day.status]} transition-colors`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {statusIcons[day.status]}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Day {day.day_number}: {day.title || 'Untitled'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {day.tasks?.length || 0} tasks
                      </p>
                    </div>
                  </div>
                  {day.status === 'available' && (
                    <Link href={`/dashboard/projects/${id}/day/${day.day_number}`}>
                      <Button>Start</Button>
                    </Link>
                  )}
                  {day.status === 'completed' && (
                    <Link href={`/dashboard/projects/${id}/day/${day.day_number}`}>
                      <Button variant="outline">Review</Button>
                    </Link>
                  )}
                  {day.status === 'locked' && (
                    <Badge variant="secondary">Locked</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
