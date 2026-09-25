"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Сколько держать курсор на элементе, прежде чем появится подсказка. */
const SHOW_DELAY_MS = 500;
const GAP = 6;
const EDGE = 8;

/**
 * Подсказка при наведении (и при фокусе с клавиатуры). Рисуется в body поверх
 * всего, включая модальные окна, и не обрезается прокруткой контейнеров.
 * Если сверху не хватает места — переворачивается вниз.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
    setPos(null);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Прокрутка или клик сдвигают элемент — подсказку просто прячем.
  useEffect(() => {
    if (!visible) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("pointerdown", hide, true);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("pointerdown", hide, true);
    };
  }, [visible]);

  // Позицию считаем по реальным размерам подсказки, уже вставленной в DOM.
  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const fitsTop = t.top - tip.height - GAP >= EDGE;
    const fitsBottom = t.bottom + tip.height + GAP <= window.innerHeight - EDGE;
    const placeTop = side === "top" ? fitsTop || !fitsBottom : !fitsBottom && fitsTop;
    const top = placeTop ? t.top - tip.height - GAP : t.bottom + GAP;
    const centered = t.left + t.width / 2 - tip.width / 2;
    const left = Math.min(Math.max(centered, EDGE), window.innerWidth - tip.width - EDGE);
    setPos({ top, left });
  }, [visible, side, content]);

  if (!content) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
            className="pointer-events-none fixed z-1000 w-max max-w-65 rounded-md bg-neutral-900 px-2.5 py-1.5 text-left text-[12px] font-normal leading-snug text-white shadow-md"
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}

/** Значок «?» с пояснением — для мест, где без объяснения непонятно. */
export function Hint({ children, side }: { children: ReactNode; side?: "top" | "bottom" }) {
  return (
    <Tooltip content={children} side={side}>
      <span tabIndex={0} className="inline-flex cursor-help text-text-tertiary hover:text-text-secondary" aria-label="Подсказка">
        <HelpCircle className="h-3.5 w-3.5" />
      </span>
    </Tooltip>
  );
}
