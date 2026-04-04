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
      <SheetContent className="bg-gray-800 border-gray-700 text-white w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={employee.avatar_url || undefined}
                alt={employee.name}
              />
              <AvatarFallback className="bg-gray-700 text-white text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-white text-xl">
                {employee.name}
              </SheetTitle>
              <SheetDescription className="text-gray-400">
                Employee Profile
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                Joined {format(new Date(employee.created_at), "MMMM d, yyyy")}
              </span>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <FolderKanban className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold">Enrolled Projects</h3>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {enrollments.length}
              </Badge>
            </div>

            {enrollments.length === 0 ? (
              <p className="text-gray-500 text-sm">No projects assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-3 bg-gray-700/50 rounded-lg"
                  >
                    <h4 className="font-medium text-white">
                      {enrollment.project?.title || "Unknown Project"}
                    </h4>
                    {enrollment.project?.skill_tag && (
                      <Badge
                        variant="outline"
                        className="mt-2 border-gray-600 text-gray-400"
                      >
                        {enrollment.project.skill_tag}
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
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
