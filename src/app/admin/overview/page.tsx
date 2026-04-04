// Force dynamic rendering
export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase";
import { Users, FolderKanban, TrendingUp, Calendar } from "lucide-react";

async function getStats() {
  const supabase = createAdminClient();

  const [
    { count: employeeCount },
    { count: projectCount },
    { count: activeProjectCount },
    { count: enrollmentCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "employee"),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
  ]);

  return {
    employees: employeeCount || 0,
    projects: projectCount || 0,
    activeProjects: activeProjectCount || 0,
    enrollments: enrollmentCount || 0,
  };
}

export default async function AdminOverviewPage() {
  const stats = await getStats();

  const statCards = [
    {
      title: "Total Employees",
      value: stats.employees,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      title: "Total Projects",
      value: stats.projects,
      icon: FolderKanban,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      title: "Active Projects",
      value: stats.activeProjects,
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      title: "Total Enrollments",
      value: stats.enrollments,
      icon: Calendar,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Overview</h1>
        <p className="text-gray-400 mt-1">
          Welcome to the TanTech Upskill admin panel
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
