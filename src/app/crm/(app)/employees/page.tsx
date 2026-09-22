import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { EmployeesClient, type EmployeeRow } from "@/components/employees/employees-client";

export default async function EmployeesPage() {
  const actor = await requireRole(["DIRECTOR"]);

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const employees: EmployeeRow[] = await Promise.all(
    users.map(async (u) => {
      const [activeLeads, handedOverLeads] = await Promise.all([
        prisma.lead.count({ where: { ownerId: u.id, status: { notIn: ["DEAL", "REJECTED"] } } }),
        prisma.leadHandover.count({ where: { fromUserId: u.id } }),
      ]);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        login: u.login,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        activeLeads,
        handedOverLeads,
      };
    })
  );

  return (
    <>
      <Topbar title="Сотрудники" />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
        <EmployeesClient initialEmployees={employees} currentUserId={actor.id} />
      </div>
    </>
  );
}
