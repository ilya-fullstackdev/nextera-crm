import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";
import type { Role } from "@/generated/prisma/enums";

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") as Role | null;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        ...(role ? { role } : {}),
      },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
