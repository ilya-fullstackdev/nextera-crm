"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { Phone, PhoneCall, PlayCircle, PartyPopper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/leads/status-badge";
import { QuickCallModal, type QuickCallTarget } from "@/components/leads/quick-call-modal";
import { NewLeadButton } from "@/components/leads/new-lead-button";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/lib/call-queue";

function dueLabel(item: QueueItem) {
  if (item.fresh && !item.nextContactAt) return { text: "Новый — ещё не звонили", tone: "text-primary-700" };
  if (!item.nextContactAt) return { text: "Дата звонка не назначена", tone: "text-warning-700" };
  const d = new Date(item.nextContactAt);
  if (item.overdue) return { text: `Просрочен · ${format(d, "d MMMM", { locale: ru })}`, tone: "text-danger-600" };
  if (isToday(d)) return { text: `Сегодня, ${format(d, "HH:mm")}`, tone: "text-text-secondary" };
  return { text: format(d, "d MMMM, HH:mm", { locale: ru }), tone: "text-text-secondary" };
}

function toTarget(item: QueueItem): QuickCallTarget {
  return { leadId: item.id, companyName: item.companyName, contactName: item.contactName, phone: item.phone };
}

export function CallQueue({ items, callsToday }: { items: QueueItem[]; callsToday: number }) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<QueueItem | null>(null);
  // Режим обзвона: после сохранения сразу открывается следующий клиент.
  const [autopilot, setAutopilot] = useState(false);

  const left = items.filter((i) => !done.has(i.id));
  // После обновления страницы сделанные звонки уже в callsToday — не считаем их дважды.
  const madeNow = callsToday + items.filter((i) => done.has(i.id)).length;

  function startAutopilot() {
    if (left.length === 0) return;
    setAutopilot(true);
    setCurrent(left[0]);
  }

  function handleSaved() {
    if (!current) return;
    const nextDone = new Set(done).add(current.id);
    setDone(nextDone);
    const next = autopilot ? items.find((i) => !nextDone.has(i.id)) : undefined;
    setCurrent(next ?? null);
    if (!next) {
      setAutopilot(false);
      router.refresh();
    }
  }

  function handleClose() {
    setCurrent(null);
    setAutopilot(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-4 sm:px-5">
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary">Кому звонить сегодня</h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {left.length > 0 ? (
              <>
                Осталось <span className="font-semibold text-text-primary">{left.length}</span> · уже сделано звонков:{" "}
                <span className="font-semibold text-text-primary">{madeNow}</span>
              </>
            ) : (
              <>Сделано звонков сегодня: {madeNow}</>
            )}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {left.length > 0 && (
            <Tooltip
              content="Откроется первый клиент. После сохранения звонка сразу откроется следующий — не нужно ничего искать"
              className="flex-1 sm:flex-none"
            >
              <Button variant="primary" icon={<PlayCircle />} onClick={startAutopilot} className="flex-1 justify-center sm:flex-none">
                Начать обзвон
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {left.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-600">
            <PartyPopper className="h-6 w-6" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-text-primary">На сегодня звонков больше нет</p>
          <p className="mt-1 max-w-sm text-[13px] text-text-secondary">
            Добавили клиента, когда звоните? Итог звонка запишется сразу после сохранения.
          </p>
          <div className="mt-4">
            <NewLeadButton label="Добавить клиента" icon={<Plus />} />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {left.map((item) => {
            const due = dueLabel(item);
            return (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/crm/leads/${item.id}`}
                      className="truncate text-[14px] font-semibold text-text-primary hover:text-primary-700 hover:underline"
                    >
                      {item.companyName}
                    </Link>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                    {[item.contactName, item.phone].filter(Boolean).join(" · ") || "Телефон не указан"}
                  </p>
                  <p className="mt-0.5 truncate text-[12px]">
                    <span className={cn("font-medium", due.tone)}>{due.text}</span>
                    {item.lastCall?.comment && (
                      <span className="text-text-tertiary"> · в прошлый раз: {item.lastCall.comment}</span>
                    )}
                  </p>
                </div>
                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  {item.phone ? (
                    <Tooltip content="Откроет окно, куда записать, чем закончился разговор" className="flex-1">
                      <button
                        type="button"
                        onClick={() => setCurrent(item)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-[13px] font-medium text-white hover:bg-primary-700 sm:h-9"
                      >
                        <Phone className="h-4 w-4" />
                        Позвонить
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Номера нет — запишите итог, если связались другим способом" className="flex-1">
                      <Button variant="secondary" icon={<PhoneCall />} onClick={() => setCurrent(item)} className="w-full justify-center">
                        Записать итог
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <QuickCallModal target={current ? toTarget(current) : null} onClose={handleClose} onSuccess={handleSaved} />
    </div>
  );
}
