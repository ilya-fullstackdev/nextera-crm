import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";

export async function GET(request: Request) {
  try {
    await requireApiLeadsAccess();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { company: { name: { contains: q, mode: "insensitive" } } },
          { company: { website: { contains: q, mode: "insensitive" } } },
          { contact: { firstName: { contains: q, mode: "insensitive" } } },
          { contact: { lastName: { contains: q, mode: "insensitive" } } },
          { contact: { phone: { contains: q, mode: "insensitive" } } },
          { contact: { telegram: { contains: q, mode: "insensitive" } } },
          { contact: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 8,
      include: { company: true, contact: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      results: leads.map((lead) => ({
        id: lead.id,
        companyName: lead.company.name,
        contactName: lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName ?? ""}`.trim() : null,
        status: lead.status,
      })),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
