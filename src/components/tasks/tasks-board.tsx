"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle2, Circle, CheckSquare, PhoneCall } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { TASK_TYPE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { NewTaskModal } from "@/components/leads/new-task-modal";
import { QuickCallModal, type QuickCallTarget } from "@/components/leads/quick-call-modal";

interface TaskItem {
  id: string;
  title: string;
  type: keyof typeof TASK_TYPE_LABELS;
  status: string;
  dueAt: string;
  comment: string | null;
  leadId: string | null;
  lead: {
    company: { name: string };
    contact: { firstName: string; lastName: string | null; phone: string | null } | null;
  } | null;
  assignee: { firstName: string; lastName: string };
}

export function TasksBoard({
  overdue,
  today,
  upcoming,
  done,
}: {
  overdue: TaskItem[];
  today: TaskItem[];
  upcoming: TaskItem[];
  done: TaskItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState(overdue.length > 0 ? "overdue" : "today");
  const [taskOpen, setTaskOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<QuickCallTarget | null>(null);

  function openCall(task: TaskItem) {
    if (!task.lead || !task.leadId) return;
    const c = task.lead.contact;
    setCallTarget({
      leadId: task.leadId,
      companyName: task.lead.company.name,
      contactName: c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null,
      phone: c?.phone,
    });
  }

  async function toggleStatus(task: TaskItem) {
    const nextStatus = task.status === "PENDING" ? "DONE" : "PENDING";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) return;
    toast.success(nextStatus === "DONE" ? "Задача выполнена" : "Задача возвращена в работу");
    router.refresh();
  }

  const lists: Record<string, TaskItem[]> = { overdue, today, upcoming, done };
  const list = lists[tab];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          className="-mx-4 border-b-0 px-4 sm:mx-0 sm:border-b sm:px-0"
          items={[
            { value: "overdue", label: "Просроченные", count: overdue.length },
            { value: "today", label: "Сегодня", count: today.length },
            { value: "upcoming", label: "Будущие", count: upcoming.length },
            { value: "done", label: "Выполненные", count: done.length },
          ]}
        />
        <div className="hidden md:block">
          <Button variant="primary" icon={<Plus />} onClick={() => setTaskOpen(true)}>
            Новая задача
          </Button>
        </div>
      </div>
      <FabButton label="Новая задача" onClick={() => setTaskOpen(true)} />

      <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
        {list.length === 0 ? (
          <EmptyState icon={<CheckSquare />} title="Список пуст" />
        ) : (
          <div className="divide-y divide-border-subtle">
            {list.map((task) => (
              <div key={task.id} className="flex items-start gap-3 px-5 py-3">
                <button
                  onClick={() => toggleStatus(task)}
                  disabled={task.status === "CANCELLED"}
                  title={task.status === "PENDING" ? "Отметить выполненной" : "Вернуть в работу"}
                  className="mt-0.5 shrink-0 text-text-tertiary hover:text-success-600 disabled:cursor-default disabled:hover:text-text-tertiary"
                >
                  {task.status === "PENDING" ? (
                    <Circle className="h-4.5 w-4.5" />
                  ) : (
                    <CheckCircle2 className="h-4.5 w-4.5 text-success-500" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium ${task.status !== "PENDING" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                    <Badge tone="neutral">{TASK_TYPE_LABELS[task.type]}</Badge>
                    <span>{formatDateTime(task.dueAt)}</span>
                    {task.lead && (
                      <Link href={`/crm/leads/${task.leadId}`} className="text-primary-600 hover:underline">
                        {task.lead.company.name}
                      </Link>
                    )}
                    <span>· {task.assignee.firstName} {task.assignee.lastName}</span>
                  </div>
                  {task.comment && <p className="mt-1 text-[13px] text-text-secondary">{task.comment}</p>}
                </div>
                {/* Звонок по задаче: записанный звонок сам закрывает задачу */}
                {task.status === "PENDING" && task.lead && (task.type === "CALL" || task.type === "FOLLOW_UP") && (
                  <Button variant="outline" size="sm" icon={<PhoneCall />} onClick={() => openCall(task)}>
                    Звонок
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <QuickCallModal
        target={callTarget}
        onClose={() => setCallTarget(null)}
        onSuccess={() => {
          setCallTarget(null);
          router.refresh();
        }}
      />

      <NewTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onSuccess={() => {
          setTaskOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
