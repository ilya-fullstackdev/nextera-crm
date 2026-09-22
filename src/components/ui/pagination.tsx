"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ page, totalPages, total }: { page: number; totalPages: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) {
    return <p className="px-1 text-[12px] text-text-tertiary">Всего: {total}</p>;
  }

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-[12px] text-text-tertiary">
        Страница {page} из {totalPages} · Всего: {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" icon={<ChevronLeft />} disabled={page <= 1} onClick={() => goTo(page - 1)}>
          Назад
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          Далее
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
