"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export function useContextMenu() {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  function open(e: React.MouseEvent, itemCount: number) {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 200;
    const menuHeight = itemCount * 34 + 8;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setPosition({ x, y });
  }

  function close() {
    setPosition(null);
  }

  return { position, open, close };
}

export function ContextMenuPortal({
  position,
  items,
  onClose,
}: {
  position: ContextMenuPosition | null;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!position) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("click", onClose);
    window.addEventListener("contextmenu", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClose);
      window.removeEventListener("contextmenu", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [position]);

  if (!mounted || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-200 min-w-47.5 animate-toast-in rounded-md border border-border-subtle bg-white py-1 shadow-popover"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onClick?.();
          }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors",
            "disabled:cursor-not-allowed disabled:text-text-tertiary",
            item.danger ? "text-danger-600 hover:bg-danger-50" : "text-text-primary hover:bg-surface-hover"
          )}
        >
          {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
