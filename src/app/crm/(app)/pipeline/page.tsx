import { requireLeadsAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { ownLeadsFilter } from "@/lib/scope";

export default async function PipelinePage() {
  const user = await requireLeadsAccess();
  const scope = ownLeadsFilter(user);

  // Отказы на доске не нужны — под доской только ссылка на их список.
  const [leads, rejectedCount] = await Promise.all([
    prisma.lead.findMany({
      where: { ...scope, status: { not: "REJECTED" } },
      orderBy: { updatedAt: "desc" },
      include: { company: true, contact: true, owner: true },
    }),
    prisma.lead.count({ where: { ...scope, status: "REJECTED" } }),
  ]);

  return (
    <>
      <Topbar title="Воронка" />
      <div className="flex-1 overflow-hidden">
        <PipelineBoard leads={JSON.parse(JSON.stringify(leads))} rejectedCount={rejectedCount} />
      </div>
    </>
  );
}
