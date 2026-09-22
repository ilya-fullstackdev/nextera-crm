"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileSidebarContextValue {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider
      value={{
        mobileOpen,
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) throw new Error("useMobileSidebar must be used within MobileSidebarProvider");
  return ctx;
}
