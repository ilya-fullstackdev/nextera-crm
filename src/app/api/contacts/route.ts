import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const companyId = searchParams.get("companyId") ?? undefined;

    const contacts = await prisma.contact.findMany({
      where: {
        companyId,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { telegram: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { company: true },
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

const createSchema = z.object({
  companyId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  email: z.string().optional(),
  isDecisionMaker: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Проверьте данные контакта" }, { status: 400 });
    }
    const contact = await prisma.contact.create({ data: parsed.data });
    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
