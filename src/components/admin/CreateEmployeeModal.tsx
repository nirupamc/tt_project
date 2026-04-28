"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreateEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmployeeModal({
  open,
  onOpenChange,
}: CreateEmployeeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    job_title: string;
    work_location: string;
    opt_type: string;
    hours_per_day: string;
    hours_per_week: string;
    pay_rate: string;
    joining_date: string;
  }>({
    name: "",
    email: "",
    password: "",
    job_title: "",
    work_location: "",
    opt_type: "",
    hours_per_day: "8",
    hours_per_week: "30",
    pay_rate: "18.00",
    joining_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create employee");
      }

      toast.success("Employee created successfully");
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        job_title: "",
        work_location: "",
        opt_type: "",
        hours_per_day: "8",
        hours_per_week: "30",
        pay_rate: "18.00",
        joining_date: format(new Date(), 'yyyy-MM-dd'),
      });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create employee",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] rounded-2xl text-[#F5F5F0]">
        <DialogHeader className="border-b border-[rgba(255,215,0,0.1)] pb-4">
          <DialogTitle className="font-space text-lg font-semibold text-[#F5F5F0]">Create New Employee</DialogTitle>
          <DialogDescription className="font-space text-[13px] text-[rgba(245,245,240,0.5)]">
            Add a new employee to the platform. They will receive login
            credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@company.com"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) =>
                  setFormData({ ...formData, job_title: e.target.value })
                }
                placeholder="e.g. Software Engineer"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_location" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Work Location</Label>
              <Input
                id="work_location"
                value={formData.work_location}
                onChange={(e) =>
                  setFormData({ ...formData, work_location: e.target.value })
                }
                placeholder="e.g. Remote — Austin, TX"
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">OPT Type</Label>
              <Select
                value={formData.opt_type || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, opt_type: value === "none" ? "" : (value || "") })
                }
              >
                <SelectTrigger className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]">
                  <SelectValue placeholder="Select OPT Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[rgba(255,215,0,0.15)] text-[#F5F5F0]">
                  <SelectItem value="none">Select OPT Type</SelectItem>
                  <SelectItem value="OPT">OPT</SelectItem>
                  <SelectItem value="STEM OPT">STEM OPT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                required
                minLength={8}
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] placeholder:text-[rgba(245,245,240,0.3)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_per_day" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Hours Per Day</Label>
              <Input
                id="hours_per_day"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.hours_per_day}
                onChange={(e) =>
                  setFormData({ ...formData, hours_per_day: e.target.value })
                }
                placeholder="8"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] placeholder:text-[rgba(245,245,240,0.3)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_per_week" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Hours Per Week</Label>
              <Input
                id="hours_per_week"
                type="number"
                step="1"
                min="0"
                value={formData.hours_per_week}
                onChange={(e) =>
                  setFormData({ ...formData, hours_per_week: e.target.value })
                }
                placeholder="30"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] placeholder:text-[rgba(245,245,240,0.3)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_rate" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Pay Rate ($/hr)</Label>
              <Input
                id="pay_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.pay_rate}
                onChange={(e) =>
                  setFormData({ ...formData, pay_rate: e.target.value })
                }
                placeholder="18.00"
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)] placeholder:text-[rgba(245,245,240,0.3)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joining_date" className="font-space text-xs font-medium tracking-wider uppercase text-[rgba(245,245,240,0.6)]">Joining Date</Label>
              <Input
                id="joining_date"
                type="date"
                value={formData.joining_date}
                onChange={(e) =>
                  setFormData({ ...formData, joining_date: e.target.value })
                }
                max={format(new Date(), 'yyyy-MM-dd')}
                required
                className="bg-[#0A0A0A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
              />
              <p className="font-space text-xs text-[rgba(245,245,240,0.4)]">
                Date employee joined the company (used for tenure calculation)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-2 border-[rgba(255,215,0,0.4)] text-[#FFD700] hover:bg-[rgba(255,215,0,0.1)] hover:border-[#FFD700] font-space text-[13px] font-semibold tracking-wider"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150">
              {isLoading ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
