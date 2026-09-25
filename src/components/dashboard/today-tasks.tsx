"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Circle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { formatRelativeDay } from "@/lib/format";

export interface TodayTask {
  id: string;
  title: string;
  dueAt: string;
  leadId: string | null;
  companyName: string | null;
}

/** Напоминания, которые поставили руками: встречи, письма и прочее. */
export function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const router = useRouter();
  const toast = useToast();

  async function complete(task: TodayTask) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    if (!res.ok) {
      toast.error("Не удалось отметить");
      return;
    }
    toast.success("Готово", task.title);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
      <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
        <h2 className="text-[14px] font-semibold text-text-primary">Напоминания</h2>
      </div>
      <ul className="divide-y divide-border-subtle">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <Tooltip content="Отметить выполненным">
              <button
                onClick={() => complete(t)}
                aria-label="Отметить выполненным"
                className="mt-0.5 text-text-tertiary hover:text-success-600"
              >
                <Circle className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-text-primary">{t.title}</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {formatRelativeDay(t.dueAt)}
                {t.leadId && t.companyName && (
                  <>
                    {" · "}
                    <Link href={`/crm/leads/${t.leadId}`} className="text-primary-600 hover:underline">
                      {t.companyName}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
