"use client";

import { useState, useEffect } from "react";
import { EmployeeProjectCard } from "@/components/employee/ProjectCard";
import { ProjectDeliverables } from "@/components/employee/ProjectDeliverables";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, CompletedDummyProject } from "@/types";

interface EmployeeProjectCardWrapperProps {
  project: Project | CompletedDummyProject;
  progress?: {
    completed_days: number;
    total_days: number;
  };
}

export function EmployeeProjectCardWrapper({
  project,
  progress,
}: EmployeeProjectCardWrapperProps) {
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [deliverableCount, setDeliverableCount] = useState(0);

  const isDummy = "is_dummy" in project && project.is_dummy;
  const activeProject = isDummy ? null : (project as Project);

  useEffect(() => {
    if (!activeProject || showDeliverables) return;

    const fetchCount = async () => {
      try {
        const response = await fetch(
          `/api/employee/deliverables?projectId=${activeProject.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setDeliverableCount(data.length);
        }
      } catch (error) {
        console.error("Failed to fetch deliverables count:", error);
      }
    };

    fetchCount();
  }, [activeProject, showDeliverables]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (
            activeProject &&
            (e.target as HTMLElement).closest("[data-deliverables-trigger]")
          ) {
            setShowDeliverables(true);
          }
        }}
        onKeyDown={(e) => {
          if (
            activeProject &&
            e.key === "Enter" &&
            (e.target as HTMLElement).closest("[data-deliverables-trigger]")
          ) {
            setShowDeliverables(true);
          }
        }}
      >
        <div style={{ position: "relative" }}>
          <EmployeeProjectCard project={project} progress={progress} />
          {activeProject && deliverableCount > 0 && (
            <div
              data-deliverables-trigger
              className="absolute top-3 right-3 bg-[#FFD700] text-[#0A0A0A] px-2.5 py-1 rounded-md font-space text-[11px] font-bold cursor-pointer hover:bg-[#E6C200] transition-colors"
              title={`${deliverableCount} deliverable${deliverableCount === 1 ? "" : "s"}`}
            >
              {deliverableCount} {deliverableCount === 1 ? "item" : "items"}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDeliverables} onOpenChange={setShowDeliverables}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-space text-[18px] font-bold text-[#0A0A0A]">
              Deliverables: {activeProject?.title}
            </DialogTitle>
          </DialogHeader>
          {activeProject && (
            <ProjectDeliverables projectId={activeProject.id} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
