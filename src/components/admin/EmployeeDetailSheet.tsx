"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { User, EnrollmentWithProject } from "@/types";
import { Mail, Calendar, FolderKanban } from "lucide-react";
import { format } from "date-fns";

interface EmployeeDetailSheetProps {
  employee: User | null;
  enrollments: EnrollmentWithProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailSheet({
  employee,
  enrollments,
  open,
  onOpenChange,
}: EmployeeDetailSheetProps) {
  if (!employee) return null;

  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#1A1A1A] border-l border-[rgba(255,215,0,0.2)] text-[#F5F5F0] w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#FFD700]">
              <AvatarImage
                src={employee.avatar_url || undefined}
                alt={employee.name}
              />
              <AvatarFallback className="bg-[#0A0A0A] text-[#FFD700] text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="font-space text-lg font-semibold text-[#F5F5F0]">
                {employee.name}
              </SheetTitle>
              <SheetDescription className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
                Employee Profile
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 font-space text-[13px] text-[#F5F5F0]">
              <Mail className="h-4 w-4 text-[#FFD700]" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 font-space text-[13px] text-[#F5F5F0]">
              <Calendar className="h-4 w-4 text-[#FFD700]" />
              <span>
                Joined {format(new Date(employee.created_at), "MMMM d, yyyy")}
              </span>
            </div>
          </div>

          <Separator className="border-[rgba(255,215,0,0.1)]" />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <FolderKanban className="h-5 w-5 text-[#FFD700]" />
              <h3 className="font-space text-lg font-semibold text-[#F5F5F0]">Enrolled Projects</h3>
              <Badge variant="secondary" className="bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[rgba(255,215,0,0.2)]">
                {enrollments.length}
              </Badge>
            </div>

            {enrollments.length === 0 ? (
              <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">No projects assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-3 bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.1)] rounded-lg"
                  >
                    <h4 className="font-space font-semibold text-[#F5F5F0]">
                      {enrollment.project?.title || "Unknown Project"}
                    </h4>
                    {enrollment.project?.skill_tag && (
                      <Badge
                        variant="outline"
                        className="mt-2 border-[rgba(255,215,0,0.3)] text-[#FFD700]"
                      >
                        {enrollment.project.skill_tag}
                      </Badge>
                    )}
                    <p className="font-space text-xs text-[rgba(245,245,240,0.5)] mt-2">
                      Enrolled{" "}
                      {format(new Date(enrollment.enrolled_at), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
