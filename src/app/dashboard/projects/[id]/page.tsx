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
import { format } from 'date-fns';
import { isDayUnlocked } from '@/lib/day-unlock';

interface ProjectDayWithStatus extends ProjectDayWithTasks {
  status: DayStatus;
  is_completed: boolean;
}

function calculateDayStatus(
  dayNumber: number,
  startDate: string | null,
  totalDays: number,
  completedDayNumbers: Set<number>
): DayStatus {
  // Priority 1: If all required tasks completed, show as completed
  if (completedDayNumbers.has(dayNumber)) {
    return 'completed';
  }

  // Priority 2: If no start date, only Day 1 is available
  if (!startDate) {
    return dayNumber === 1 ? 'available' : 'locked';
  }

  // Priority 3: Check if day is unlocked based on CT timezone logic
  if (isDayUnlocked(startDate, dayNumber, totalDays)) {
    return 'available';
  }

  // Default: locked
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

        // Use enrollment_start_date instead of project start_date
        const enrollmentStartDate = projectData.project.enrollment_start_date || projectData.project.start_date;
        
        console.log('[project-page] enrollment_start_date:', enrollmentStartDate);
        console.log('[project-page] project.total_days:', projectData.project.total_days);
        console.log('[project-page] isDayUnlocked result for day 1:', 
          isDayUnlocked(enrollmentStartDate, 1, projectData.project.total_days));

        // Calculate day statuses
        const completedDayNumbers = new Set<number>(
          projectData.completed_day_numbers || []
        );

        const daysWithStatus = projectData.days.map((day: ProjectDayWithTasks) => ({
          ...day,
          status: calculateDayStatus(
            day.day_number,
            enrollmentStartDate,
            projectData.project.total_days,
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
        <Skeleton className="h-8 w-64 bg-[rgba(10,10,10,0.05)] mb-4" />
        <Skeleton className="h-64 bg-[rgba(10,10,10,0.05)]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.6)]">Project not found or you don&apos;t have access.</p>
      </div>
    );
  }

  const statusIcons = {
    locked: <Lock className="h-5 w-5 text-[rgba(10,10,10,0.4)]" />,
    available: <PlayCircle className="h-5 w-5 text-[#FFD700]" />,
    completed: <CheckCircle className="h-5 w-5 text-[#FFD700]" />,
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center font-space text-[13px] text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">{project.title.toUpperCase()}</h1>
          {project.skill_tag && (
            <Badge variant="secondary" className="bg-[rgba(255,215,0,0.12)] text-[#C8A800] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">{project.skill_tag}</Badge>
          )}
        </div>
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] leading-relaxed">{project.description}</p>
        {(project.enrollment_start_date || project.start_date) && (
          <div className="flex items-center gap-2 mt-3 font-space text-[13px] text-[rgba(10,10,10,0.65)] font-medium">
            <Calendar className="h-4 w-4 text-[rgba(10,10,10,0.5)]" />
            <span>Started {format(new Date(project.enrollment_start_date || project.start_date), 'MMMM d, yyyy')}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {days.length === 0 ? (
          <Card className="bg-white border border-[rgba(10,10,10,0.08)]">
            <CardContent className="py-12 text-center">
              <p className="font-space text-[14px] text-[rgba(10,10,10,0.6)]">No content available yet.</p>
            </CardContent>
          </Card>
        ) : (
          days.map((day) => (
            <Card
              key={day.id}
              className={`border transition-all duration-200 ${
                day.status === 'completed'
                  ? 'bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.25)] border-l-[3px] border-l-[#FFD700]'
                  : day.status === 'available'
                  ? 'bg-white border border-[rgba(10,10,10,0.1)] hover:border-[#FFD700] hover:shadow-[0_4px_16px_rgba(255,215,0,0.1)]'
                  : 'bg-[#F5F5F3] border border-[rgba(10,10,10,0.06)] opacity-60'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {statusIcons[day.status]}
                    <div>
                      <h3 className="font-bebas text-[20px] text-[#0A0A0A] tracking-wide">
                        DAY {day.day_number}: {day.title?.toUpperCase() || 'UNTITLED'}
                      </h3>
                      <p className="font-space text-[13px] font-medium text-[rgba(10,10,10,0.65)]">
                        {day.tasks?.length || 0} task{(day.tasks?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {day.status === 'available' && (
                    <Link href={`/dashboard/projects/${id}/day/${day.day_number}`}>
                      <Button className="bg-[#0A0A0A] text-[#FFD700] hover:bg-[#1A1A1A] font-space text-[13px] font-semibold tracking-wider">Start</Button>
                    </Link>
                  )}
                  {day.status === 'completed' && (
                    <Link href={`/dashboard/projects/${id}/day/${day.day_number}`}>
                      <Button variant="outline" className="border border-[rgba(255,215,0,0.3)] text-[#C8A800] hover:bg-[rgba(255,215,0,0.08)] font-space text-[13px] font-semibold tracking-wider">Review</Button>
                    </Link>
                  )}
                  {day.status === 'locked' && (
                    <Badge variant="secondary" className="bg-[rgba(10,10,10,0.08)] text-[rgba(10,10,10,0.5)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase border border-[rgba(10,10,10,0.15)]">Locked</Badge>
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
