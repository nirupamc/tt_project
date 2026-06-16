"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeCard } from "@/components/admin/EmployeeCard";
import { CreateEmployeeModal } from "@/components/admin/CreateEmployeeModal";
import { REQUIRED_DOCUMENTS } from "@/lib/compliance-documents";
import type { User } from "@/types";
import { Plus, Search, LayoutGrid, List } from "lucide-react";

type EmployeeRow = User & {
  enrollment_count?: number;
  documents_uploaded_count?: number;
  supervisor?: { name: string } | null;
};

type OptFilter = "all" | "OPT" | "STEM OPT";
type StatusFilter = "all" | "docs_incomplete" | "ead_expiring";
type SortMode = "newest" | "name" | "ead_expiry";
type ViewMode = "table" | "cards";

const TOTAL_DOCS = REQUIRED_DOCUMENTS.length;

function eadDaysLeft(employee: EmployeeRow): number | null {
  if (!employee.ead_end_date) return null;
  return differenceInCalendarDays(new Date(employee.ead_end_date), new Date());
}

function eadToneClass(days: number | null) {
  if (days === null) return "text-[rgba(245,245,240,0.4)]";
  if (days < 14) return "text-[#f87171]";
  if (days <= 90) return "text-amber-300";
  return "text-[rgba(245,245,240,0.75)]";
}

function docsToneClass(count: number) {
  if (count >= TOTAL_DOCS) return "text-[#4ade80]";
  if (count >= 5) return "text-amber-300";
  return "text-[#f87171]";
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [optFilter, setOptFilter] = useState<OptFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await fetch("/api/admin/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEmployeeClick = (employee: EmployeeRow) => {
    router.push(`/admin/employees/${employee.id}`);
  };

  const filteredEmployees = employees
    .filter((emp) => {
      const q = search.toLowerCase();
      if (
        q &&
        !emp.name.toLowerCase().includes(q) &&
        !emp.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (optFilter !== "all" && emp.opt_type !== optFilter) return false;
      if (statusFilter === "docs_incomplete") {
        if ((emp.documents_uploaded_count || 0) >= TOTAL_DOCS) return false;
      }
      if (statusFilter === "ead_expiring") {
        const days = eadDaysLeft(emp);
        if (days === null || days < 0 || days > 90) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "ead_expiry") {
        const aDays = eadDaysLeft(a);
        const bDays = eadDaysLeft(b);
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
      }
      // newest first (API already orders by created_at desc, keep stable)
      return 0;
    });

  const hasActiveFilters =
    search !== "" || optFilter !== "all" || statusFilter !== "all";

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(245,245,240,0.5)]" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] rounded-lg focus:border-[#FFD700] focus:ring-2 focus:ring-[rgba(255,215,0,0.1)]"
          />
        </div>

        <Select value={optFilter} onValueChange={(v) => setOptFilter(v as OptFilter)}>
          <SelectTrigger className="w-[140px] bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] font-space text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-space">
            <SelectItem value="all">All OPT Types</SelectItem>
            <SelectItem value="OPT">OPT</SelectItem>
            <SelectItem value="STEM OPT">STEM OPT</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[170px] bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] font-space text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-space">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="docs_incomplete">Docs Incomplete</SelectItem>
            <SelectItem value="ead_expiring">EAD Expiring ≤ 90d</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="w-[150px] bg-[#1A1A1A] border border-[rgba(255,215,0,0.15)] text-[#F5F5F0] font-space text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-space">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="ead_expiry">EAD Expiry</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-[rgba(255,215,0,0.15)] overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-label="Table view"
            className={`p-2 ${viewMode === "table" ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700]" : "bg-[#1A1A1A] text-[rgba(245,245,240,0.5)] hover:text-[#F5F5F0]"}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            aria-label="Card view"
            className={`p-2 ${viewMode === "cards" ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700]" : "bg-[#1A1A1A] text-[rgba(245,245,240,0.5)] hover:text-[#F5F5F0]"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        viewMode === "table" ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 bg-[#2A2A2A]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-[#2A2A2A]" />
            ))}
          </div>
        )
      ) : loadError ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[rgba(248,113,113,0.35)] rounded-lg">
          <p className="font-space font-medium text-[#f87171]">
            Couldn&apos;t load employees.
          </p>
          <Button
            onClick={fetchEmployees}
            className="mt-4 bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold"
          >
            Retry
          </Button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-lg">
          <p className="font-space font-medium text-[#F5F5F0]">
            {hasActiveFilters
              ? "No employees match your filters."
              : "No employees yet."}
          </p>
          {!hasActiveFilters && (
            <Button
              className="mt-4 bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold tracking-wider rounded-md px-5 py-2.5 hover:bg-[#FFE44D] hover:-translate-y-0.5 active:bg-[#C8A800] active:scale-[0.97] transition-all duration-150"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Employee
            </Button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => handleEmployeeClick(employee)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[rgba(255,215,0,0.1)] bg-[#1A1A1A] overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[rgba(255,215,0,0.12)] hover:bg-transparent">
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)]">
                  Name
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)]">
                  Job Title
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)]">
                  OPT Type
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)] text-right">
                  EAD Expiry
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)] text-right">
                  Docs
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)] text-right">
                  Projects
                </TableHead>
                <TableHead className="font-space text-[11px] tracking-[1.5px] uppercase text-[rgba(245,245,240,0.5)]">
                  Supervisor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const days = eadDaysLeft(employee);
                const docs = employee.documents_uploaded_count || 0;
                return (
                  <TableRow
                    key={employee.id}
                    onClick={() => handleEmployeeClick(employee)}
                    className="cursor-pointer border-[rgba(245,245,240,0.06)] hover:bg-[rgba(255,215,0,0.04)]"
                  >
                    <TableCell>
                      <p className="font-space text-sm font-semibold text-[#F5F5F0]">
                        {employee.name}
                        {employee.role !== "employee" && (
                          <span className="ml-2 font-space text-[10px] font-semibold tracking-[1.5px] uppercase text-[#FFD700]">
                            {employee.role}
                          </span>
                        )}
                      </p>
                      <p className="font-space text-xs text-[rgba(245,245,240,0.5)]">
                        {employee.email}
                      </p>
                    </TableCell>
                    <TableCell className="font-space text-[13px] text-[rgba(245,245,240,0.75)]">
                      {employee.job_title || "—"}
                    </TableCell>
                    <TableCell className="font-space text-[13px] text-[rgba(245,245,240,0.75)]">
                      {employee.opt_type || "—"}
                    </TableCell>
                    <TableCell className={`font-space text-[13px] tabular-nums text-right ${eadToneClass(days)}`}>
                      {employee.ead_end_date
                        ? `${format(new Date(employee.ead_end_date), "MMM d, yyyy")}${days !== null && days >= 0 ? ` (${days}d)` : " (expired)"}`
                        : "—"}
                    </TableCell>
                    <TableCell className={`font-space text-[13px] tabular-nums text-right ${docsToneClass(docs)}`}>
                      {docs}/{TOTAL_DOCS}
                    </TableCell>
                    <TableCell className="font-space text-[13px] tabular-nums text-right text-[rgba(245,245,240,0.75)]">
                      {employee.enrollment_count || 0}
                    </TableCell>
                    <TableCell className="font-space text-[13px] text-[rgba(245,245,240,0.75)]">
                      {employee.supervisor?.name || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
