import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { ownLeadsFilter } from "@/lib/scope";

export default async function PipelinePage() {
  const user = await requireUser();

  const [leads, managers] = await Promise.all([
    prisma.lead.findMany({
      where: ownLeadsFilter(user),
      orderBy: { updatedAt: "desc" },
      include: { company: true, contact: true, owner: true },
    }),
    prisma.user.findMany({ where: { role: "MANAGER", status: "ACTIVE", deletedAt: null } }),
  ]);

  return (
    <>
      <Topbar title="Воронка" />
      <div className="flex-1 overflow-hidden">
        <PipelineBoard leads={JSON.parse(JSON.stringify(leads))} managers={JSON.parse(JSON.stringify(managers))} />
      </div>
    </>
  );
}
