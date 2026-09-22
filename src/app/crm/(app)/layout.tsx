import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebarProvider } from "@/components/layout/sidebar-context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <MobileSidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </MobileSidebarProvider>
  );
}
