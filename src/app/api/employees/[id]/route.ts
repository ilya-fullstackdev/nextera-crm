import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiEmployeesAccess, ApiAuthError } from "@/lib/auth/guards";
import { canManageRole } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  login: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .optional(),
  role: z.enum(["OPERATOR", "DIRECTOR", "HR", "HR_OPERATOR"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  password: z.string().min(6).optional(),
  hiredById: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiEmployeesAccess();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.deletedAt) {
      return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
    }

    if (target.id !== actor.id && !canManageRole(actor.role, target.role)) {
      return NextResponse.json(
        { error: "Вы можете менять только сотрудников отдела холодных звонков" },
        { status: 403 }
      );
    }
    if (data.role && !canManageRole(actor.role, data.role)) {
      return NextResponse.json(
        { error: "Вы можете назначать только роли отдела холодных звонков" },
        { status: 403 }
      );
    }

    if (data.login && data.login !== target.login) {
      const existing = await prisma.user.findUnique({ where: { login: data.login } });
      if (existing) {
        return NextResponse.json({ error: "Этот логин уже используется" }, { status: 409 });
      }
    }

    if (target.id === actor.id && data.role && data.role !== target.role) {
      return NextResponse.json({ error: "Нельзя изменить свою собственную роль" }, { status: 400 });
    }
    if (target.id === actor.id && data.status === "BLOCKED") {
      return NextResponse.json({ error: "Нельзя заблокировать свой собственный аккаунт" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.login) updateData.login = data.login;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.password) updateData.passwordHash = await hashPassword(data.password);
    if (data.hiredById !== undefined) {
      updateData.hiredById = data.hiredById && data.hiredById !== id ? data.hiredById : null;
    }

    const updated = await prisma.user.update({ where: { id }, data: updateData });

    if (data.role && data.role !== target.role) {
      await logAudit({
        actor,
        action: "UPDATE_ROLE",
        entityType: "User",
        entityId: id,
        oldValue: { role: ROLE_LABELS[target.role] },
        newValue: { role: ROLE_LABELS[updated.role] },
      });
    }
    if (data.status && data.status !== target.status) {
      await logAudit({
        actor,
        action: data.status === "BLOCKED" ? "BLOCK_USER" : "ACTIVATE_USER",
        entityType: "User",
        entityId: id,
        oldValue: { status: USER_STATUS_LABELS[target.status] },
        newValue: { status: USER_STATUS_LABELS[updated.status] },
      });
    }
    if (data.password) {
      await logAudit({ actor, action: "RESET_PASSWORD", entityType: "User", entityId: id });
    }
    const infoChanged =
      (data.firstName && data.firstName !== target.firstName) ||
      (data.lastName && data.lastName !== target.lastName) ||
      (data.login && data.login !== target.login);
    if (infoChanged) {
      await logAudit({
        actor,
        action: "UPDATE_USER",
        entityType: "User",
        entityId: id,
        oldValue: { firstName: target.firstName, lastName: target.lastName, login: target.login },
        newValue: { firstName: updated.firstName, lastName: updated.lastName, login: updated.login },
      });
    }

    return NextResponse.json({
      employee: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        login: updated.login,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

const deleteSchema = z.object({
  reassignToId: z.string().optional(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiEmployeesAccess();
    const { id } = await params;

    if (id === actor.id) {
      return NextResponse.json({ error: "Нельзя удалить свой собственный аккаунт" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.deletedAt) {
      return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
    }

    if (!canManageRole(actor.role, target.role)) {
      return NextResponse.json(
        { error: "Вы можете удалять только сотрудников отдела холодных звонков" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reassignToId } = deleteSchema.parse(body ?? {});

    const [activeLeads, pendingTasks] = await Promise.all([
      prisma.lead.findMany({
        where: { ownerId: id, status: { notIn: ["DEAL", "REJECTED"] } },
        select: { id: true },
      }),
      prisma.task.findMany({
        where: { assigneeId: id, status: "PENDING" },
        select: { id: true },
      }),
    ]);

    if ((activeLeads.length > 0 || pendingTasks.length > 0) && !reassignToId) {
      return NextResponse.json(
        {
          requiresReassignment: true,
          activeLeadsCount: activeLeads.length,
          pendingTasksCount: pendingTasks.length,
        },
        { status: 409 }
      );
    }

    if (reassignToId) {
      const newOwner = await prisma.user.findUnique({ where: { id: reassignToId } });
      if (!newOwner || newOwner.deletedAt || newOwner.status !== "ACTIVE") {
        return NextResponse.json({ error: "Выбранный сотрудник недоступен" }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.lead.updateMany({
          where: { ownerId: id, status: { notIn: ["DEAL", "REJECTED"] } },
          data: { ownerId: reassignToId },
        }),
        prisma.task.updateMany({
          where: { assigneeId: id, status: "PENDING" },
          data: { assigneeId: reassignToId },
        }),
      ]);
      await logAudit({
        actor,
        action: "REASSIGN_ON_DELETE",
        entityType: "User",
        entityId: id,
        newValue: {
          reassignedTo: `${newOwner.firstName} ${newOwner.lastName}`,
          leadsCount: activeLeads.length,
          tasksCount: pendingTasks.length,
        },
      });
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "BLOCKED" },
    });

    await logAudit({
      actor,
      action: "DELETE_USER",
      entityType: "User",
      entityId: id,
      oldValue: { firstName: target.firstName, lastName: target.lastName, login: target.login },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
