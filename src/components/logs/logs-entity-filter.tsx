"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterSelect } from "@/components/ui/filter-select";

export function LogsEntityFilter({ options }: { options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("entityType", value);
    else params.delete("entityType");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <FilterSelect
      label="Раздел"
      value={searchParams.get("entityType") ?? ""}
      options={options}
      onChange={setParam}
    />
  );
}
