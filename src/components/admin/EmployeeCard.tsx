import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { User } from "@/types";

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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
