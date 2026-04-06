"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeProjectCard } from "@/components/employee/ProjectCard";
import type { Project } from "@/types";

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
        const res = await fetch("/api/employee/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
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
