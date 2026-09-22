import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { SearchBox } from "@/components/shared/search-box";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { LogsEntityFilter } from "@/components/logs/logs-entity-filter";
import { describeAuditLog } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { ScrollText } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 40;

const ENTITY_LABELS: Record<string, string> = {
  User: "Сотрудники",
  Lead: "Лиды",
  Company: "Компании",
  Contact: "Контакты",
};

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entityType?: string; page?: string }>;
}) {
  await requireRole(["DIRECTOR"]);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));

  const where: Prisma.AuditLogWhereInput = {};
  if (params.entityType) where.entityType = params.entityType;
  if (params.q) where.actorName = { contains: params.q, mode: "insensitive" };

  const [logs, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);

  return (
    <>
      <Topbar title="Логи" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchBox placeholder="Поиск по сотруднику" />
          <LogsEntityFilter
            options={entityTypes.map((e) => ({ value: e.entityType, label: ENTITY_LABELS[e.entityType] ?? e.entityType }))}
          />
        </div>

        <Card>
          <CardBody className="p-0">
            {logs.length === 0 ? (
              <EmptyState icon={<ScrollText />} title="Событий не найдено" />
            ) : (
              <div className="divide-y divide-border-subtle">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                    <span className="text-text-primary">
                      <span className="font-medium">{log.actorName}</span> {describeAuditLog(log)}
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">{formatDateTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-3">
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} />
        </div>
      </div>
    </>
  );
}
