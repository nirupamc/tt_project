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
    },
    {
      title: "Total Projects",
      value: stats.projects,
      icon: FolderKanban,
    },
    {
      title: "Active Projects",
      value: stats.activeProjects,
      icon: TrendingUp,
    },
    {
      title: "Total Enrollments",
      value: stats.enrollments,
      icon: Calendar,
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-[#F5F5F0]">Overview</h1>
        <p className="font-space text-[13px] text-[rgba(245,245,240,0.5)] mt-1">
          Welcome to the Archway admin panel
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl hover:border-[rgba(255,215,0,0.3)] hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 border-l-[3px] border-l-[#FFD700]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-space text-[12px] tracking-[2px] uppercase text-[rgba(245,245,240,0.5)]">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-[#FFD700]" />
              </CardHeader>
              <CardContent>
                <div className="font-bebas text-[42px] text-[#F5F5F0] leading-none">
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
