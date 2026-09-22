import "server-only";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "").slice(-10);
}

function normalizeDomain(url: string) {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export async function findDuplicateLeads(params: {
  companyName?: string;
  website?: string;
  phone?: string;
}) {
  const conditions = [];

  if (params.companyName && params.companyName.trim().length > 1) {
    conditions.push({ company: { name: { equals: params.companyName.trim(), mode: "insensitive" as const } } });
  }
  if (params.website && params.website.trim().length > 2) {
    conditions.push({ company: { website: { contains: normalizeDomain(params.website), mode: "insensitive" as const } } });
  }
  if (params.phone && params.phone.trim().length >= 6) {
    conditions.push({ contact: { phone: { contains: normalizePhone(params.phone) } } });
  }

  if (conditions.length === 0) return [];

  const matches = await prisma.lead.findMany({
    where: { OR: conditions },
    include: { company: true, contact: true, owner: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return matches;
}
