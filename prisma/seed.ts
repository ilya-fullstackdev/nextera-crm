import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log("Очистка базы...");
  await prisma.auditLog.deleteMany();
  await prisma.leadHandover.deleteMany();
  await prisma.leadFile.deleteMany();
  await prisma.task.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  console.log("Создание сотрудников...");
  const director = await prisma.user.create({
    data: {
      firstName: "Сергей",
      lastName: "Волков",
      login: "director",
      passwordHash: await hash("director123"),
      role: "DIRECTOR",
      status: "ACTIVE",
    },
  });

  const operator1 = await prisma.user.create({
    data: {
      firstName: "Иван",
      lastName: "Петров",
      login: "ivan.petrov",
      passwordHash: await hash("operator123"),
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  const operator2 = await prisma.user.create({
    data: {
      firstName: "Мария",
      lastName: "Сидорова",
      login: "maria.sidorova",
      passwordHash: await hash("operator123"),
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      firstName: "Алексей",
      lastName: "Смирнов",
      login: "alexey.smirnov",
      passwordHash: await hash("manager123"),
      role: "MANAGER",
      status: "ACTIVE",
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      firstName: "Ольга",
      lastName: "Кузнецова",
      login: "olga.kuznecova",
      passwordHash: await hash("manager123"),
      role: "MANAGER",
      status: "ACTIVE",
    },
  });

  const blockedOperator = await prisma.user.create({
    data: {
      firstName: "Дмитрий",
      lastName: "Соколов",
      login: "dmitry.sokolov",
      passwordHash: await hash("operator123"),
      role: "OPERATOR",
      status: "BLOCKED",
    },
  });

  console.log("Создание компаний, контактов и лидов...");

  const companyDefs = [
    { name: "Стоматология Белый Зуб", niche: "Медицина", city: "Москва", website: "beliy-zub.ru", source: "YANDEX_MAPS" as const },
    { name: "Мебельная фабрика Дуб и Ясень", niche: "Мебель", city: "Санкт-Петербург", website: "dub-yasen.ru", source: "GOOGLE_MAPS" as const },
    { name: "Автосервис ПроМотор", niche: "Автоуслуги", city: "Казань", website: null, source: "INSTAGRAM" as const },
    { name: "Юридическая фирма Право+", niche: "Юриспруденция", city: "Москва", website: "pravoplus.ru", source: "REFERRAL" as const },
    { name: "Кофейня Зерно", niche: "Общепит", city: "Новосибирск", website: null, source: "TIKTOK" as const },
    { name: "Салон красоты Афина", niche: "Красота", city: "Екатеринбург", website: "afina-salon.ru", source: "TELEGRAM" as const },
    { name: "Строительная компания СтройГрад", niche: "Строительство", city: "Москва", website: "stroygrad.ru", source: "MANUAL_SEARCH" as const },
    { name: "Фитнес-клуб Энергия", niche: "Спорт", city: "Краснодар", website: null, source: "INSTAGRAM" as const },
    { name: "Кондитерская Сладкий Дом", niche: "Общепит", city: "Москва", website: "sladkiy-dom.ru", source: "YANDEX_MAPS" as const },
    { name: "Питомник растений ЗелёныйМир", niche: "Озеленение", city: "Ростов-на-Дону", website: null, source: "GOOGLE_MAPS" as const },
    { name: "Клиника Здоровье+", niche: "Медицина", city: "Москва", website: "zdorovie-plus.ru", source: "WEBSITE" as const },
    { name: "Турагентство Горизонт", niche: "Туризм", city: "Сочи", website: null, source: "OTHER" as const },
    { name: "Логистическая компания КарgoExpress", niche: "Логистика", city: "Москва", website: "cargoexpress.ru", source: "REFERRAL" as const },
    { name: "Школа иностранных языков LinguaPro", niche: "Образование", city: "Санкт-Петербург", website: "linguapro.ru", source: "INSTAGRAM" as const },
    { name: "Ветеринарная клиника ДобрыйДоктор", niche: "Ветеринария", city: "Москва", website: null, source: "YANDEX_MAPS" as const },
    { name: "Архитектурное бюро ФормаЛайн", niche: "Архитектура", city: "Москва", website: "formaline.ru", source: "MANUAL_SEARCH" as const },
    { name: "Производство упаковки ПакСервис", niche: "Производство", city: "Челябинск", website: null, source: "OTHER" as const },
    { name: "Event-агентство Праздник", niche: "События", city: "Москва", website: "prazdnik-agency.ru", source: "TELEGRAM" as const },
  ];

  const firstNames = ["Александр", "Дмитрий", "Наталья", "Елена", "Виктор", "Татьяна", "Андрей", "Юлия", "Павел", "Ирина", "Роман", "Светлана", "Николай", "Анна", "Кирилл", "Ольга", "Артём", "Марина"];
  const lastNames = ["Иванов", "Козлов", "Морозова", "Новикова", "Фёдоров", "Волкова", "Соловьёв", "Егорова", "Крылов", "Максимова", "Зайцев", "Павлова", "Семёнов", "Голубева", "Орлов", "Романова", "Гаврилов", "Лебедева"];
  const positions = ["Директор", "Собственник", "Маркетолог", "Коммерческий директор", "Управляющий", "Заместитель директора"];

  const owners = [operator1, operator2];
  const statuses = [
    "NEW", "SEARCHING_DM", "FIRST_CONTACT", "DM_FOUND", "QUALIFICATION",
    "HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT", "DEAL", "CALLBACK_LATER", "REJECTED",
  ] as const;
  const priorities = ["LOW", "MEDIUM", "HIGH"] as const;

  let leadCount = 0;

  for (let i = 0; i < companyDefs.length; i++) {
    const def = companyDefs[i];
    const company = await prisma.company.create({
      data: {
        name: def.name,
        niche: def.niche,
        city: def.city,
        website: def.website,
      },
    });

    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        firstName: fn,
        lastName: ln,
        position: positions[i % positions.length],
        phone: `+7 9${(10 + i).toString().padStart(2, "0")} ${(100 + i * 7).toString().padStart(3, "0")}-${(10 + i).toString().padStart(2, "0")}-${(20 + i).toString().padStart(2, "0")}`,
        telegram: i % 3 === 0 ? `@${fn.toLowerCase()}_${ln.toLowerCase()}` : null,
        email: i % 2 === 0 ? `${fn.toLowerCase()}@${def.website ?? "example.ru"}` : null,
        isDecisionMaker: i % 4 !== 0,
      },
    });

    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const owner = i % 5 === 4 ? manager1 : owners[i % owners.length];
    const isHandedOver = ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT", "DEAL"].includes(status);
    const finalOwner = isHandedOver ? (i % 2 === 0 ? manager1 : manager2) : owner;

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        contactId: contact.id,
        status,
        priority,
        source: def.source,
        ownerId: finalOwner.id,
        createdById: owner.id,
        dmStatus: status === "NEW" ? "NOT_FOUND" : contact.isDecisionMaker ? "FOUND" : "PARTICIPATES",
        needLevel: ["NEW", "SEARCHING_DM"].includes(status) ? "NONE" : "CONFIRMED",
        needDescription: ["NEW", "SEARCHING_DM"].includes(status) ? null : "Требуется новый корпоративный сайт с каталогом услуг и формой заявки",
        currentWebsite: def.website,
        problem: ["NEW", "SEARCHING_DM", "FIRST_CONTACT"].includes(status) ? null : "Текущий сайт устарел, не адаптирован под мобильные устройства",
        desiredResult: ["NEW", "SEARCHING_DM", "FIRST_CONTACT"].includes(status) ? null : "Увеличение заявок с сайта на 30-40%",
        timeline: status === "NEW" ? "UNDEFINED" : i % 3 === 0 ? "NOW" : "ONE_TO_THREE_MONTHS",
        budgetStatus: status === "NEW" ? "UNKNOWN" : i % 2 === 0 ? "ESTIMATE" : "DEFINED",
        budgetComment: status === "NEW" ? null : "От 150 000 до 350 000 рублей",
        interestLevel: ["NEW", "SEARCHING_DM"].includes(status) ? null : (i % 3 === 0 ? "HIGH" : "MEDIUM"),
        contactAttempts: ["NEW"].includes(status) ? 0 : (i % 3) + 1,
        nextContactAt: ["DEAL", "REJECTED"].includes(status) ? null : new Date(Date.now() + (i % 7 - 2) * 24 * 60 * 60 * 1000),
        handedToManagerAt: isHandedOver ? new Date(Date.now() - i * 24 * 60 * 60 * 1000) : null,
        rejectionReason: status === "REJECTED" ? (["NO_BUDGET", "HAS_CONTRACTOR", "NOT_NOW", "EXPENSIVE"] as const)[i % 4] : null,
        rejectionComment: status === "REJECTED" ? "Клиент отказался после презентации КП" : null,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: owner.id,
        type: "STATUS_CHANGE",
        comment: "Лид создан",
        metadata: { toStatus: "NEW" },
        createdAt: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000),
      },
    });

    if (!["NEW"].includes(status)) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: owner.id,
          type: "CALL",
          comment: "Позвонили в компанию. Секретарь переключила на " + positions[i % positions.length].toLowerCase() + ". Обсудили текущую ситуацию с сайтом, договорились созвониться повторно.",
          metadata: { attempt: 1, result: "dm_reached" },
          createdAt: new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (isHandedOver) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: owner.id,
          type: "HANDOVER",
          comment: `${owner.firstName} ${owner.lastName} передал лид ${finalOwner.firstName} ${finalOwner.lastName}`,
          metadata: { fromUserId: owner.id, toUserId: finalOwner.id },
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.leadHandover.create({
        data: {
          leadId: lead.id,
          fromUserId: owner.id,
          toUserId: finalOwner.id,
          dmInfo: `${contact.firstName} ${contact.lastName}, ${contact.position}`,
          needSummary: "Требуется новый корпоративный сайт с каталогом услуг",
          situation: "Текущий сайт сделан 5 лет назад, не адаптирован под мобильные",
          problem: "Низкая конверсия с сайта, устаревший дизайн",
          desiredResult: "Рост заявок на 30-40%, современный дизайн",
          timeline: "1-3 месяца",
          budget: "От 150 000 до 350 000 рублей",
          discussed: "Обсудили примерную структуру сайта и сроки",
          objections: "Сомневается в сроках реализации",
          nextStep: "Подготовить коммерческое предложение",
        },
      });
    }

    if (status === "REJECTED") {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: owner.id,
          type: "REJECTION",
          comment: "Причина отказа: " + lead.rejectionComment,
          metadata: { reason: lead.rejectionReason },
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (!["DEAL", "REJECTED"].includes(status)) {
      await prisma.task.create({
        data: {
          leadId: lead.id,
          title: isHandedOver ? "Связаться с клиентом по КП" : "Повторный звонок клиенту",
          type: isHandedOver ? "FOLLOW_UP" : "CALL",
          dueAt: new Date(Date.now() + (i % 7 - 2) * 24 * 60 * 60 * 1000),
          comment: "Уточнить решение по сотрудничеству",
          status: "PENDING",
          assigneeId: finalOwner.id,
          createdById: owner.id,
        },
      });
    } else {
      await prisma.task.create({
        data: {
          leadId: lead.id,
          title: status === "DEAL" ? "Оформить документы по сделке" : "Финальный созвон",
          type: "OTHER",
          dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: "DONE",
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          assigneeId: finalOwner.id,
          createdById: owner.id,
        },
      });
    }

    leadCount++;
  }

  await prisma.task.create({
    data: {
      title: "Подготовить отчёт по итогам недели",
      type: "OTHER",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "PENDING",
      assigneeId: operator1.id,
      createdById: director.id,
    },
  });

  console.log("Создание записей аудита...");
  await prisma.auditLog.create({
    data: {
      userId: director.id,
      actorName: `${director.firstName} ${director.lastName}`,
      action: "CREATE_USER",
      entityType: "User",
      entityId: operator1.id,
      newValue: { login: operator1.login, role: operator1.role },
    },
  });

  console.log(`Готово. Создано ${leadCount} лидов, ${companyDefs.length} компаний, 6 сотрудников.`);
  console.log("\nУчётные записи для входа:");
  console.log("  Руководитель: director / director123");
  console.log("  Оператор: ivan.petrov / operator123");
  console.log("  Оператор: maria.sidorova / operator123");
  console.log("  Менеджер: alexey.smirnov / manager123");
  console.log("  Менеджер: olga.kuznecova / manager123");
  console.log("  Заблокирован: dmitry.sokolov / operator123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
