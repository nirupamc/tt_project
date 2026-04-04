'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeProjectCard } from '@/components/employee/ProjectCard';
import type { Project } from '@/types';

interface ProjectWithProgress extends Project {
  progress?: {
    completed_days: number;
    total_days: number;
  };
}

export default function EmployeeDashboardPage() {
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/employee/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Projects</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Continue your learning journey
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500">
            You haven&apos;t been assigned to any projects. Contact your administrator to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <EmployeeProjectCard
              key={project.id}
              project={project}
              progress={project.progress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
