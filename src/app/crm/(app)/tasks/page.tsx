import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { ownTasksFilter } from "@/lib/scope";
import { startOfDay, endOfDay } from "date-fns";

export default async function TasksPage() {
  const user = await requireUser();
  const filter = ownTasksFilter(user);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const tasks = await prisma.task.findMany({
    where: filter,
    orderBy: { dueAt: "asc" },
    include: { assignee: true, lead: { include: { company: true, contact: true } } },
  });

  const overdue = tasks.filter((t) => t.status === "PENDING" && t.dueAt < todayStart);
  const today = tasks.filter((t) => t.status === "PENDING" && t.dueAt >= todayStart && t.dueAt <= todayEnd);
  const upcoming = tasks.filter((t) => t.status === "PENDING" && t.dueAt > todayEnd);
  const done = tasks.filter((t) => t.status !== "PENDING").sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  return (
    <>
      <Topbar title={user.role === "OPERATOR" ? "Мои задачи" : "Задачи"} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <TasksBoard
          overdue={JSON.parse(JSON.stringify(overdue))}
          today={JSON.parse(JSON.stringify(today))}
          upcoming={JSON.parse(JSON.stringify(upcoming))}
          done={JSON.parse(JSON.stringify(done.slice(0, 30)))}
        />
      </div>
    </>
  );
}
