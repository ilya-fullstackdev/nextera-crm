"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { TASK_TYPE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { TaskRef } from "@/types/lead";
import { NewTaskModal } from "@/components/leads/new-task-modal";

export function TasksPanel({
  leadId,
  tasks,
  onChange,
}: {
  leadId: string;
  tasks: TaskRef[];
  onChange: () => void;
}) {
  const toast = useToast();
  const [taskOpen, setTaskOpen] = useState(false);
  const [prompted, setPrompted] = useState(false);

  async function toggleStatus(task: TaskRef) {
    const nextStatus = task.status === "PENDING" ? "DONE" : "PENDING";
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) return;
    if (nextStatus === "DONE") {
      toast.success("Задача выполнена");
      setPrompted(true);
      setTaskOpen(true);
    } else {
      toast.success("Задача возвращена в работу");
    }
    onChange();
  }

  const pending = tasks.filter((t) => t.status === "PENDING");
  const done = tasks.filter((t) => t.status !== "PENDING");

  return (
    <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <p className="text-[13px] font-semibold text-text-primary">Задачи по лиду</p>
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setTaskOpen(true)}>
          Добавить задачу
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare />} title="Пока нет задач" />
      ) : (
        <div className="divide-y divide-border-subtle">
          {[...pending, ...done].map((task) => (
            <div key={task.id} className="flex items-start gap-3 px-5 py-3">
              <button
                onClick={() => toggleStatus(task)}
                disabled={task.status === "CANCELLED"}
                title={task.status === "PENDING" ? "Отметить выполненной" : "Вернуть в работу"}
                className="mt-0.5 shrink-0 text-text-tertiary hover:text-success-600 disabled:cursor-default disabled:hover:text-text-tertiary"
              >
                {task.status === "PENDING" ? <Circle className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5 text-success-500" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium ${task.status !== "PENDING" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                  {task.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                  <Badge tone="neutral">{TASK_TYPE_LABELS[task.type]}</Badge>
                  <span>{formatDateTime(task.dueAt)}</span>
                  <span>· {task.assignee.firstName} {task.assignee.lastName}</span>
                </div>
                {task.comment && <p className="mt-1 text-[13px] text-text-secondary">{task.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewTaskModal
        open={taskOpen}
        leadId={leadId}
        title={prompted ? "Создать следующую задачу" : undefined}
        onClose={() => setTaskOpen(false)}
        onSuccess={() => {
          setTaskOpen(false);
          setPrompted(false);
          onChange();
        }}
      />
    </div>
  );
}
