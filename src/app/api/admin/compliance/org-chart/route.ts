import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

type OrgNode = {
  id: string;
  name: string;
  title: string;
  opt_type?: "OPT" | "STEM OPT" | null;
  kind?: "company" | "person" | "unassigned";
  children?: OrgNode[];
  unassigned_count?: number;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "supervisor")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, role, supervisor_id, job_title, opt_type")
      .order("name", { ascending: true });

    if (error) throw error;
    const list = users || [];
    const ceo =
      list.find((user) => user.email?.toLowerCase() === "ashraf@tantech-llc.com") ||
      list.find((user) => user.name?.toLowerCase() === "ashraf khan");

    const supervisors = list.filter(
      (user) => ["admin", "supervisor"].includes(user.role) && user.id !== ceo?.id,
    );

    const supervisorNodeMap = new Map(
      supervisors.map((user) => [
        user.id,
        {
          id: user.id,
          name: user.name,
          title: user.job_title || (user.role === "admin" ? "Admin" : "Supervisor"),
          opt_type: user.opt_type,
          kind: "person" as const,
          children: [] as OrgNode[],
        },
      ]),
    );

    const unassignedEmployees: OrgNode[] = [];

    const regularEmployees = list.filter((user) => user.role === "employee");
    for (const employee of regularEmployees) {
      const employeeNode: OrgNode = {
        id: employee.id,
        name: employee.name,
        title: employee.job_title || "Employee",
        opt_type: employee.opt_type,
        kind: "person",
        children: [],
      };
      if (employee.supervisor_id && supervisorNodeMap.has(employee.supervisor_id)) {
        supervisorNodeMap.get(employee.supervisor_id)?.children?.push(employeeNode);
      } else {
        unassignedEmployees.push(employeeNode);
      }
    }

    const ceoNode: OrgNode = {
      id: ceo?.id || "ceo",
      name: ceo?.name || "Ashraf Khan",
      title: "CEO",
      kind: "person",
      opt_type: ceo?.opt_type || null,
      children: [
        ...Array.from(supervisorNodeMap.values()),
        {
          id: "unassigned",
          name: "⚠️ Unassigned",
          title: "Needs supervisor assignment",
          kind: "unassigned",
          unassigned_count: unassignedEmployees.length,
          children: unassignedEmployees,
        },
      ],
    };

    const tree: OrgNode = {
      id: "tantech-root",
      name: "TanTech LLC",
      title: "Company",
      kind: "company",
      children: [ceoNode],
    };

    return NextResponse.json({
      tree,
      employee_count: regularEmployees.length,
      has_employees: regularEmployees.length > 0,
    });
  } catch (error) {
    console.error("Error loading org chart:", error);
    return NextResponse.json({ message: "Failed to load org chart" }, { status: 500 });
  }
}
