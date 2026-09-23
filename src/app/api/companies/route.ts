import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";

export async function GET(request: Request) {
  try {
    await requireApiLeadsAccess();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const companies = await prisma.company.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { website: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { contacts: true, leads: true } } },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  niche: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireApiLeadsAccess();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Укажите название компании" }, { status: 400 });
    }
    const company = await prisma.company.create({ data: parsed.data });
    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
