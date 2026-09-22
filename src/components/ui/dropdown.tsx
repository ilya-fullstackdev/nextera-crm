"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items?: DropdownItem[];
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
}

const ESTIMATED_MENU_WIDTH = 220;

export function Dropdown({ trigger, items, children, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useClickOutside([triggerRef, menuRef], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left =
        align === "right"
          ? Math.min(rect.right - ESTIMATED_MENU_WIDTH, window.innerWidth - ESTIMATED_MENU_WIDTH - 8)
          : Math.min(rect.left, window.innerWidth - ESTIMATED_MENU_WIDTH - 8);
      setPosition({
        top: Math.min(rect.bottom + 6, window.innerHeight - 8),
        left: Math.max(8, left),
      });
    }
    reposition();
    function close() {
      setOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, align]);

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div ref={triggerRef} className="relative inline-block">
      <div onClick={toggle}>{trigger}</div>
      {open &&
        mounted &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className={cn(
              "fixed z-200 min-w-45 animate-toast-in rounded-md border border-border-subtle bg-white py-1 shadow-popover",
              className
            )}
          >
            {items
              ? items.map((item, i) => (
                  <button
                    key={i}
                    disabled={item.disabled}
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors",
                      "disabled:cursor-not-allowed disabled:text-text-tertiary",
                      item.danger
                        ? "text-danger-600 hover:bg-danger-50"
                        : "text-text-primary hover:bg-surface-hover"
                    )}
                  >
                    {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                    {item.label}
                  </button>
                ))
              : (
                  <div onClick={() => setOpen(false)}>{children}</div>
                )}
          </div>,
          document.body
        )}
    </div>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-border-subtle" />;
}
