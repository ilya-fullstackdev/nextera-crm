"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "nextera-how-it-works-hidden";

const STEPS = [
  { title: "Нажмите «Начать обзвон»", text: "Откроется первый клиент из очереди" },
  { title: "Позвоните и нажмите итог", text: "«Не дозвонились», «Вышли на ЛПР»… — одна кнопка" },
  { title: "Всё", text: "Следующий звонок назначится сам, откроется следующий клиент" },
];

/** Короткая инструкция для новичка. Закрывается навсегда одним нажатием. */
export function HowItWorks() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <div className="relative rounded-lg border border-primary-100 bg-primary-50/60 p-4 pr-10">
      <button
        onClick={hide}
        title="Понятно, больше не показывать"
        aria-label="Скрыть"
        className="absolute right-2 top-2 rounded-md p-1.5 text-text-tertiary hover:bg-white hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-[13px] font-semibold text-text-primary">Как работать — три шага</p>
      <ol className="mt-2 grid gap-2 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[12px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-[13px]">
              <span className="block font-medium text-text-primary">{s.title}</span>
              <span className="text-text-secondary">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
