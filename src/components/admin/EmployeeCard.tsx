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
      className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={employee.avatar_url || undefined}
              alt={employee.name}
            />
            <AvatarFallback className="bg-gray-700 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-gray-400 truncate">{employee.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {employee.enrollment_count || 0} projects
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
