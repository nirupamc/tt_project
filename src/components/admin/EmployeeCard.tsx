import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { User } from "@/types";
import { differenceInCalendarDays } from "date-fns";

interface EmployeeCardProps {
  employee: User & { enrollment_count?: number };
  onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isAdminRole =
    employee.role === "admin" || employee.role === "supervisor";
  const eadDaysLeft =
    employee.ead_end_date
      ? differenceInCalendarDays(new Date(employee.ead_end_date), new Date())
      : null;
  const eadExpiringSoon = eadDaysLeft !== null && eadDaysLeft >= 0 && eadDaysLeft <= 90;
  const docsCompleted = employee.documents_uploaded_count || 0;
  const docsBadgeClass =
    docsCompleted >= 9
      ? "bg-[rgba(34,197,94,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.35)]"
      : docsCompleted >= 5
        ? "bg-[rgba(250,204,21,0.16)] text-[#facc15] border border-[rgba(250,204,21,0.4)]"
        : "bg-[rgba(239,68,68,0.16)] text-[#f87171] border border-[rgba(248,113,113,0.4)]";

  return (
    <Card
      className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,215,0,0.08)] transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-[#FFD700]">
            <AvatarImage
              src={employee.avatar_url || undefined}
              alt={employee.name}
            />
            <AvatarFallback className="bg-[#2A2A2A] text-[#FFD700]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-space text-base font-semibold text-[#F5F5F0] truncate">
              {employee.name}
            </h3>
            <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] truncate">{employee.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-[rgba(255,215,0,0.08)] text-[#FFD700] border border-[rgba(255,215,0,0.3)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
                {employee.enrollment_count || 0} projects
              </Badge>
              <Badge
                className={
                  isAdminRole
                    ? "bg-[rgba(255,215,0,0.15)] text-[#FFD700] border border-[rgba(255,215,0,0.35)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase"
                    : "bg-[rgba(245,245,240,0.08)] text-[rgba(245,245,240,0.7)] border border-[rgba(245,245,240,0.2)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase"
                }
              >
                {isAdminRole ? "Admin" : "Employee"}
              </Badge>
              {eadExpiringSoon && (
                <Badge className="bg-[rgba(239,68,68,0.16)] text-[#f87171] border border-[rgba(248,113,113,0.4)] font-space text-[10px] font-semibold tracking-[1.5px] uppercase">
                  Expiring Soon
                </Badge>
              )}
              <Badge className={`${docsBadgeClass} font-space text-[10px] font-semibold tracking-[1.5px] uppercase`}>
                {docsCompleted}/9 docs
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
