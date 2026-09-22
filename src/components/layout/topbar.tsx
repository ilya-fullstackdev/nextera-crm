"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User as UserIcon, Loader2, Menu } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { UserMenu } from "@/components/layout/user-menu";
import { useMobileSidebar } from "@/components/layout/sidebar-context";
import type { Role } from "@/generated/prisma/enums";

interface SearchResult {
  id: string;
  companyName: string;
  contactName: string | null;
  status: string;
}

interface MeUser {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export function Topbar({ title }: { title?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<MeUser | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { openMobile } = useMobileSidebar();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d.user));
  }, []);

  useClickOutside([rootRef], () => setOpen(false), open);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-surface-card px-3 md:gap-4 md:px-6">
      <button
        onClick={openMobile}
        className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary md:hidden"
        title="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>
      {title ? (
        <h1 className="hidden shrink-0 truncate text-[15px] font-semibold text-text-primary sm:block">{title}</h1>
      ) : (
        <span className="hidden sm:inline" />
      )}
      <div ref={rootRef} className="relative ml-auto w-full max-w-40 sm:max-w-xs md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Поиск..."
          className="h-9 w-full rounded-md border border-border-default bg-neutral-50 pl-9 pr-8 text-[13px] placeholder:text-text-tertiary focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-text-tertiary" />
        )}
        {open && query.trim().length >= 2 && (
          <div className="absolute right-0 top-full z-30 mt-1.5 max-h-80 w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-border-subtle bg-white py-1 shadow-popover">
            {results.length === 0 && !loading ? (
              <p className="px-3 py-3 text-[13px] text-text-tertiary">Ничего не найдено</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(`/crm/leads/${r.id}`);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-text-tertiary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text-primary">
                      {r.companyName}
                    </span>
                    {r.contactName && (
                      <span className="flex items-center gap-1 truncate text-xs text-text-tertiary">
                        <UserIcon className="h-3 w-3" />
                        {r.contactName}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {me && (
        <>
          <span className="h-6 w-px shrink-0 bg-border-default" />
          <UserMenu user={me} />
        </>
      )}
    </header>
  );
}
