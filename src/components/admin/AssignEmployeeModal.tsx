"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { User } from "@/types";

interface AssignEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  enrolledUserIds: string[];
  onSuccess?: () => void;
}

export function AssignEmployeeModal({
  open,
  onOpenChange,
  projectId,
  enrolledUserIds,
  onSuccess,
}: AssignEmployeeModalProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setSelectedIds([]);
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employees");
      if (res.ok) {
        const data = await res.json();
        // Filter out already enrolled employees
        setEmployees(
          data.filter((emp: User) => !enrolledUserIds.includes(emp.id)),
        );
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: selectedIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign employees");
      }

      toast.success(`${selectedIds.length} employee(s) assigned successfully`);
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign employees",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] rounded-2xl text-[#F5F5F0] max-w-md">
        <DialogHeader className="border-b border-[rgba(255,215,0,0.1)] pb-4">
          <DialogTitle className="font-space text-lg font-semibold text-[#F5F5F0]">Assign Employees</DialogTitle>
          <DialogDescription className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
            Select employees to enroll in this project.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 bg-[#2A2A2A]" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] py-4 text-center">
            All employees are already enrolled in this project.
          </p>
        ) : (
          <ScrollArea className="max-h-[300px] py-4">
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-3 bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.1)] rounded-lg cursor-pointer hover:bg-[rgba(255,215,0,0.08)] hover:border-[rgba(255,215,0,0.2)] transition-all duration-200"
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <Checkbox
                    id={emp.id}
                    checked={selectedIds.includes(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                  />
                  <Label htmlFor={emp.id} className="cursor-pointer flex-1">
                    <div className="font-space font-medium text-[#F5F5F0]">{emp.name}</div>
                    <div className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">{emp.email}</div>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-2 border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.1)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.length === 0}
            className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150"
          >
            {isSubmitting
              ? "Assigning..."
              : `Assign ${selectedIds.length} Employee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
