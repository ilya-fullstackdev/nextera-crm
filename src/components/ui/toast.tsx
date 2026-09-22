"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "danger" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success-500" />,
  danger: <XCircle className="h-5 w-5 text-danger-500" />,
  info: <Info className="h-5 w-5 text-info-500" />,
};

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={cn(
        "animate-toast-in flex items-start gap-2.5 rounded-lg border border-border-subtle bg-white px-4 py-3 shadow-lg"
      )}
    >
      {TONE_ICON[toast.tone]}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[13px] text-text-secondary">{toast.description}</p>
        )}
      </div>
      <button onClick={onClose} className="shrink-0 text-text-tertiary hover:text-text-primary">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    success: (title: string, description?: string) => ctx.push({ tone: "success", title, description }),
    error: (title: string, description?: string) => ctx.push({ tone: "danger", title, description }),
    info: (title: string, description?: string) => ctx.push({ tone: "info", title, description }),
  };
}
