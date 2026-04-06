"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeCard } from "@/components/admin/EmployeeCard";
import { CreateEmployeeModal } from "@/components/admin/CreateEmployeeModal";
import type { User } from "@/types";
import { Plus, Search } from "lucide-react";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<
    (User & { enrollment_count?: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEmployeeClick = (employee: User) => {
    router.push(`/admin/employees/${employee.id}`);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl text-[#F5F5F0]">Employees</h1>
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-1">
            Manage employee accounts and assignments
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(245,245,240,0.5)]" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-[#2A2A2A]" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-lg">
          <p className="font-space font-medium text-[#F5F5F0]">
            {search
              ? "No employees found matching your search."
              : "No employees yet."}
          </p>
          {!search && (
            <Button
              className="mt-4 bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => handleEmployeeClick(employee)}
            />
          ))}
        </div>
      )}

      <CreateEmployeeModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) fetchEmployees();
        }}
      />
    </div>
  );
}
