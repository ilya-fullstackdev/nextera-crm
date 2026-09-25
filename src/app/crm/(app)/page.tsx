import { startOfDay, endOfDay } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { CallQueue } from "@/components/dashboard/call-queue";
import { HowItWorks } from "@/components/dashboard/how-it-works";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { TeamToday, type TeamRow } from "@/components/dashboard/team-today";
import { canViewLeads, COLD_CALL_ROLES } from "@/lib/permissions";
import { getCallQueue } from "@/lib/call-queue";

export default async function DashboardPage() {
  const user = await requireUser();

  // У отдела кадров своя главная — про найм, без лидов и клиентов.
  if (!canViewLeads(user.role)) {
    return (
      <>
        <Topbar title={`Здравствуйте, ${user.firstName}`} />
        <HrDashboard />
      </>
    );
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const isDirector = user.role === "DIRECTOR";

  const [queue, callsToday, tasks, team] = await Promise.all([
    getCallQueue(user.id, isDirector),
    prisma.leadActivity.count({ where: { userId: user.id, type: "CALL", createdAt: { gte: todayStart } } }),
    // Звонки живут в очереди, здесь — только напоминания, поставленные руками.
    prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: "PENDING",
        type: { notIn: ["CALL", "FOLLOW_UP"] },
        dueAt: { lte: todayEnd },
      },
      orderBy: { dueAt: "asc" },
      include: { lead: { include: { company: { select: { name: true } } } } },
    }),
    isDirector ? loadTeam(todayStart) : Promise.resolve([] as TeamRow[]),
  ]);

  return (
    <>
      <Topbar title={`Здравствуйте, ${user.firstName}`} />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <HowItWorks />
          <CallQueue items={queue} callsToday={callsToday} />

          {tasks.length > 0 && (
            <TodayTasks
              tasks={tasks.map((t) => ({
                id: t.id,
                title: t.title,
                dueAt: t.dueAt.toISOString(),
                leadId: t.leadId,
                companyName: t.lead?.company.name ?? null,
              }))}
            />
          )}

          {isDirector && <TeamToday rows={team} />}
        </div>
      </div>
    </>
  );
}

/** Сколько сегодня сделал каждый сотрудник отдела звонков. */
async function loadTeam(todayStart: Date): Promise<TeamRow[]> {
  const [users, calls, newLeads, handed] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: COLD_CALL_ROLES }, status: "ACTIVE", deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.leadActivity.groupBy({
      by: ["userId"],
      where: { type: "CALL", createdAt: { gte: todayStart } },
      _count: true,
    }),
    prisma.lead.groupBy({ by: ["createdById"], where: { createdAt: { gte: todayStart } }, _count: true }),
    prisma.leadHandover.groupBy({ by: ["fromUserId"], where: { createdAt: { gte: todayStart } }, _count: true }),
  ]);
  const callMap = new Map(calls.map((c) => [c.userId, c._count]));
  const leadMap = new Map(newLeads.map((c) => [c.createdById, c._count]));
  const handedMap = new Map(handed.map((c) => [c.fromUserId, c._count]));
  return users
    .map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      calls: callMap.get(u.id) ?? 0,
      newLeads: leadMap.get(u.id) ?? 0,
      handed: handedMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.calls - a.calls);
}
