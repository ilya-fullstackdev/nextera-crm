import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiEmployeesAccess, ApiAuthError } from "@/lib/auth/guards";
import { assignableRoles, canManageRole, canViewLeads } from "@/lib/permissions";
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
  role: z.enum(["OPERATOR", "DIRECTOR", "HR", "HR_OPERATOR"]),
  status: z.enum(["ACTIVE", "BLOCKED"]).default("ACTIVE"),
  hiredById: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireApiEmployeesAccess();
    // Кадровик ведёт только отдел холодных звонков, руководитель видит всех.
    const visibleRoles = actor.role === "DIRECTOR" ? undefined : assignableRoles(actor.role);

    const users = await prisma.user.findMany({
      where: { deletedAt: null, ...(visibleRoles ? { role: { in: visibleRoles } } : {}) },
      orderBy: { createdAt: "asc" },
    });

    const showLeadStats = canViewLeads(actor.role);

    const withCounts = await Promise.all(
      users.map(async (u) => {
        const [activeLeads, handedOver] = showLeadStats ? await Promise.all([
          prisma.lead.count({
            where: { ownerId: u.id, status: { notIn: ["DEAL", "REJECTED"] } },
          }),
          prisma.leadHandover.count({ where: { fromUserId: u.id } }),
        ]) : [0, 0];
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          login: u.login,
          role: u.role,
          status: u.status,
          hiredById: u.hiredById,
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
    const actor = await requireApiEmployeesAccess();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (!canManageRole(actor.role, data.role)) {
      return NextResponse.json(
        { error: "Вы можете заводить только сотрудников отдела холодных звонков" },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { login: data.login } });
    if (existing) {
      return NextResponse.json({ error: "Этот логин уже используется" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    // Кадровик по умолчанию записывает найм на себя — с этого считается его процент.
    const hiredById =
      data.hiredById ?? (actor.role === "HR" || actor.role === "HR_OPERATOR" ? actor.id : undefined);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        login: data.login,
        passwordHash,
        role: data.role,
        status: data.status,
        hiredById,
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
