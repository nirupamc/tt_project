"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeProjectCard } from "@/components/employee/ProjectCard";
import type { Project, CompletedDummyProject } from "@/types";

interface ProjectWithProgress extends Project {
  progress?: {
    completed_days: number;
    total_days: number;
  };
  assigned_date?: string;
  is_dummy?: boolean;
}

// Union type for both real and dummy projects
type DashboardProject = ProjectWithProgress | CompletedDummyProject;

export default function EmployeeDashboardPage() {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/employee/projects");
        if (res.ok) {
          const data = await res.json();
          
          // FEATURE 2: Sort projects - completed first (oldest first), then active
          const sortedProjects = data.sort((a: DashboardProject, b: DashboardProject) => {
            // Check if projects are dummy completed projects
            const aIsDummy = 'is_dummy' in a && a.is_dummy;
            const bIsDummy = 'is_dummy' in b && b.is_dummy;
            
            // Completed projects first
            if (aIsDummy && !bIsDummy) return -1;
            if (!aIsDummy && bIsDummy) return 1;
            
            // Both completed - maintain order (already ordered by tenure)
            if (aIsDummy && bIsDummy) return 0;
            
            // Both active - sort by assigned_date (newest first)
            const aDate = 'assigned_date' in a ? a.assigned_date : '';
            const bDate = 'assigned_date' in b ? b.assigned_date : '';
            return (bDate || '').localeCompare(aDate || '');
          });
          
          setProjects(sortedProjects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">
          MY PROJECTS
        </h1>
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] mt-1 font-medium">
          Continue your learning journey
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 bg-[rgba(10,10,10,0.05)]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-[rgba(10,10,10,0.08)] rounded-lg p-12 text-center">
          <h3 className="font-space text-lg font-medium text-[#0A0A0A] mb-2">
            No projects yet
          </h3>
          <p className="font-space text-[14px] text-[rgba(10,10,10,0.6)]">
            You haven&apos;t been assigned to any projects. Contact your
            administrator to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            // Extract progress - handle both dummy and real projects
            const isDummy = 'is_dummy' in project && project.is_dummy;
            const progressData = isDummy 
              ? undefined 
              : 'progress' in project && typeof project.progress === 'object' 
                ? project.progress 
                : undefined;
            
            return (
              <EmployeeProjectCard
                key={project.id}
                project={project}
                progress={progressData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
