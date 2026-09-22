import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/labels";

const createSchema = z.object({
  firstName: z.string().min(1, "Укажите имя"),
  lastName: z.string().min(1, "Укажите фамилию"),
  login: z
    .string()
    .min(3, "Логин минимум 3 символа")
    .regex(/^[a-zA-Z0-9._-]+$/, "Логин может содержать только латинские буквы, цифры, точку, дефис и подчёркивание"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  role: z.enum(["OPERATOR", "MANAGER", "DIRECTOR"]),
  status: z.enum(["ACTIVE", "BLOCKED"]).default("ACTIVE"),
});

export async function GET() {
  try {
    await requireApiRole(["DIRECTOR"]);

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    const withCounts = await Promise.all(
      users.map(async (u) => {
        const [activeLeads, handedOver] = await Promise.all([
          prisma.lead.count({
            where: { ownerId: u.id, status: { notIn: ["DEAL", "REJECTED"] } },
          }),
          prisma.leadHandover.count({ where: { fromUserId: u.id } }),
        ]);
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          login: u.login,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          activeLeads,
          handedOverLeads: handedOver,
        };
      })
    );

    return NextResponse.json({ employees: withCounts });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { login: data.login } });
    if (existing) {
      return NextResponse.json({ error: "Этот логин уже используется" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        login: data.login,
        passwordHash,
        role: data.role,
        status: data.status,
      },
    });

    await logAudit({
      actor,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      newValue: {
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.login,
        role: ROLE_LABELS[user.role],
        status: user.status,
      },
    });

    return NextResponse.json({
      employee: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        login: user.login,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
