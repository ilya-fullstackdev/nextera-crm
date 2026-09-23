import { requireEmployeesAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { EmployeesClient, type EmployeeRow } from "@/components/employees/employees-client";
import { assignableRoles, canViewLeads } from "@/lib/permissions";

export default async function EmployeesPage() {
  const actor = await requireEmployeesAccess();

  // Кадровик ведёт только отдел холодных звонков, руководитель — всю компанию.
  const visibleRoles = actor.role === "DIRECTOR" ? undefined : assignableRoles(actor.role);
  const showLeadStats = canViewLeads(actor.role);

  const users = await prisma.user.findMany({
    where: { deletedAt: null, ...(visibleRoles ? { role: { in: visibleRoles } } : {}) },
    orderBy: { createdAt: "asc" },
    include: { hiredBy: { select: { firstName: true, lastName: true } } },
  });

  const employees: EmployeeRow[] = await Promise.all(
    users.map(async (u) => {
      const [activeLeads, handedOverLeads] = showLeadStats
        ? await Promise.all([
            prisma.lead.count({ where: { ownerId: u.id, status: { notIn: ["DEAL", "REJECTED"] } } }),
            prisma.leadHandover.count({ where: { fromUserId: u.id } }),
          ])
        : [0, 0];
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        login: u.login,
        role: u.role,
        status: u.status,
        hiredById: u.hiredById,
        hiredByName: u.hiredBy ? `${u.hiredBy.firstName} ${u.hiredBy.lastName}` : null,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        activeLeads,
        handedOverLeads,
      };
    })
  );

  return (
    <>
      <Topbar title={actor.role === "DIRECTOR" ? "Сотрудники" : "Отдел холодных звонков"} />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
        <EmployeesClient
          initialEmployees={employees}
          currentUserId={actor.id}
          actorRole={actor.role}
          showLeadStats={showLeadStats}
        />
      </div>
    </>
  );
}
