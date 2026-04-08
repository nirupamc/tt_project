"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateTimesheetEntries,
  calculateSummary,
} from "@/lib/timesheet";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  joining_date: string;
  hours_per_day: number;
}

interface EmployeeTimesheetSummary extends Employee {
  weekHours: number;
  monthHours: number;
}

export default function AdminTimesheetsPage() {
  const [employees, setEmployees] = useState<EmployeeTimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchEmployees();
  }, [selectedDate]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      if (res.ok) {
        const data = await res.json();
        
        // Calculate timesheet summaries for each employee
        const summaries: EmployeeTimesheetSummary[] = data.map((emp: Employee) => {
          // Generate timesheet entries for each employee
          const entries = generateTimesheetEntries(
            emp.joining_date,
            emp.hours_per_day || 8
          );

          // Calculate summaries
          const weekSummary = calculateSummary(entries, "week");
          const monthSummary = calculateSummary(entries, "month");

          return {
            ...emp,
            weekHours: weekSummary.total_hours_worked,
            monthHours: monthSummary.total_hours_worked,
          };
        });

        setEmployees(summaries);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalWeekHours = filteredEmployees.reduce((sum, emp) => sum + emp.weekHours, 0);
  const totalMonthHours = filteredEmployees.reduce((sum, emp) => sum + emp.monthHours, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-[#0A0A0A] tracking-wider">
          TIMESHEETS
        </h1>
        <p className="font-space text-[14px] text-[rgba(10,10,10,0.7)] mt-1 font-medium">
          Monitor employee hours and attendance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-[#FFD700] to-[#C8A800] text-[#0A0A0A] border-0">
          <CardHeader className="pb-3">
            <CardTitle className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              This Week Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl tracking-wider">
              {totalWeekHours}hrs
            </div>
            <div className="font-space text-[12px] opacity-70 mt-1">
              Across {filteredEmployees.length} employees
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] text-[#FFD700] border-0">
          <CardHeader className="pb-3">
            <CardTitle className="font-space text-[13px] font-medium tracking-wider uppercase opacity-80 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Month Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl tracking-wider">
              {totalMonthHours}hrs
            </div>
            <div className="font-space text-[12px] opacity-70 mt-1">
              {format(selectedDate, "MMMM yyyy")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[rgba(10,10,10,0.08)]">
          <CardHeader className="pb-3">
            <CardTitle className="font-space text-[13px] font-medium tracking-wider uppercase text-[rgba(10,10,10,0.7)] flex items-center gap-2">
              <User className="h-4 w-4" />
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bebas text-4xl tracking-wider text-[#0A0A0A]">
              {filteredEmployees.length}
            </div>
            <div className="font-space text-[12px] text-[rgba(10,10,10,0.6)] mt-1">
              Total in system
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm font-space text-[14px]"
        />

        <div className="flex items-center gap-2 ml-auto">
          <Button 
            onClick={() => setSelectedDate(subMonths(selectedDate, 1))} 
            variant="outline" 
            size="sm"
            className="font-space text-[12px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-space text-[14px] font-medium text-[#0A0A0A] min-w-[120px] text-center">
            {format(selectedDate, "MMMM yyyy")}
          </span>
          <Button 
            onClick={() => setSelectedDate(addMonths(selectedDate, 1))} 
            variant="outline" 
            size="sm"
            disabled={isFuture(addMonths(selectedDate, 1))}
            className="font-space text-[12px]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Card className="bg-white border border-[rgba(10,10,10,0.08)] rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-[rgba(10,10,10,0.03)] border-b border-[rgba(10,10,10,0.08)]">
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Employee Name
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Role
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A]">
                Joining Date
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A] text-center">
                Hours/Day
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A] text-center">
                This Week (hrs)
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A] text-center">
                This Month (hrs)
              </TableHead>
              <TableHead className="font-space text-[12px] font-semibold tracking-wider uppercase text-[#0A0A0A] text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-4 w-32 bg-[rgba(10,10,10,0.05)]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 bg-[rgba(10,10,10,0.05)]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 bg-[rgba(10,10,10,0.05)]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 bg-[rgba(10,10,10,0.05)] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 bg-[rgba(10,10,10,0.05)] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 bg-[rgba(10,10,10,0.05)] mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 bg-[rgba(10,10,10,0.05)] mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="font-space text-[14px] text-[rgba(10,10,10,0.6)]">
                    {searchTerm ? "No employees found matching your search." : "No employees found."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow 
                  key={emp.id}
                  className="border-b border-[rgba(10,10,10,0.08)] hover:bg-[rgba(255,215,0,0.02)]"
                >
                  <TableCell className="font-space text-[14px] text-[#0A0A0A] font-medium">
                    <div>
                      <div>{emp.name}</div>
                      <div className="font-space text-[12px] text-[rgba(10,10,10,0.6)] mt-1">
                        {emp.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-space text-[14px] text-[rgba(10,10,10,0.7)]">
                    <span className="inline-block px-2 py-1 bg-[rgba(10,10,10,0.05)] rounded text-[12px] font-medium">
                      {emp.role}
                    </span>
                  </TableCell>
                  <TableCell className="font-space text-[14px] text-[rgba(10,10,10,0.7)]">
                    {emp.joining_date ? format(new Date(emp.joining_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="font-space text-[14px] text-[#0A0A0A] font-semibold text-center">
                    {emp.hours_per_day || 8}
                  </TableCell>
                  <TableCell className="font-space text-[14px] text-[#FFD700] font-semibold text-center">
                    {emp.weekHours}
                  </TableCell>
                  <TableCell className="font-space text-[14px] text-[#FFD700] font-semibold text-center">
                    {emp.monthHours}
                  </TableCell>
                  <TableCell className="text-center">
                    <a href={`/admin/timesheets/${emp.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-space text-[12px] hover:bg-[rgba(255,215,0,0.1)] hover:border-[#FFD700]"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}