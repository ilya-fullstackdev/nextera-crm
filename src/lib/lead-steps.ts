import type { LeadStatus } from "@/generated/prisma/enums";

/**
 * Чистая логика воронки: по заполненности карточки определяет и статус лида,
 * и подсказку «что сделать дальше». Используется и на сервере (автостатус),
 * и на клиенте (блок «Следующий шаг»).
 */

export interface LeadFacts {
  status: LeadStatus;
  dmStatus: string;
  needLevel: string;
  timeline: string;
  budgetStatus: string;
  contactAttempts: number;
  decisionMakersCount: number;
  /** Был звонок, сообщение, письмо или встреча. */
  hasContactActivity: boolean;
  /** Есть хоть какая-то работа по лиду: заметка, файл. */
  hasAnyWork: boolean;
}

/** Стадии, до которых лид доходит сам. */
export const AUTO_FLOW: LeadStatus[] = ["NEW", "SEARCHING_DM", "FIRST_CONTACT", "DM_FOUND", "QUALIFICATION"];

/** Дальше — только решение человека. */
export const MANUAL_ONLY: LeadStatus[] = [
  "HANDED_TO_MANAGER",
  "NEGOTIATION",
  "PROPOSAL_SENT",
  "DEAL",
  "REJECTED",
  "CALLBACK_LATER",
];

export function isDmFound(facts: Pick<LeadFacts, "dmStatus" | "decisionMakersCount">) {
  return ["FOUND", "PARTICIPATES", "MULTIPLE"].includes(facts.dmStatus) || facts.decisionMakersCount > 0;
}

/** Максимальная стадия, которую подтверждают данные карточки. */
export function deriveStatus(facts: Omit<LeadFacts, "status">): LeadStatus {
  const dmFound = isDmFound(facts);
  const needKnown = facts.needLevel !== "NONE";
  const dealShapeKnown = facts.budgetStatus !== "UNKNOWN" || facts.timeline !== "UNDEFINED";

  if (dmFound && needKnown && dealShapeKnown) return "QUALIFICATION";
  if (dmFound) return "DM_FOUND";
  if (facts.hasContactActivity || facts.contactAttempts > 0) return "FIRST_CONTACT";
  if (facts.hasAnyWork) return "SEARCHING_DM";
  return "NEW";
}

export type StepAction = "activity" | "decisionMaker" | "qualification" | "handover" | "close" | "finance" | "none";

export interface NextStep {
  /** Что сделать — коротко и по-человечески. */
  title: string;
  /** Зачем это и что произойдёт после. */
  description: string;
  /** Какую кнопку показать рядом. */
  action: StepAction;
  actionLabel?: string;
}

/**
 * Подсказка «что делать дальше» — меняется по мере заполнения карточки.
 * `canCloseDeal` показывает, что смотрит руководитель.
 */
export function nextStep(facts: LeadFacts, options: { canCloseDeal: boolean; hasDeal: boolean }): NextStep {
  if (options.hasDeal) {
    return {
      title: "Сделка закрыта",
      description: "Проверьте выплаты сотрудникам и регулярные расходы проекта",
      action: "finance",
      actionLabel: "Финансы",
    };
  }

  if (facts.status === "REJECTED") {
    return {
      title: "Лид в отказе",
      description: "Работа закрыта. Причина указана в карточке — вернуться к клиенту можно позже",
      action: "none",
    };
  }

  if (facts.status === "CALLBACK_LATER") {
    return {
      title: "Перезвонить в назначенную дату",
      description: "Клиент попросил связаться позже. Запишите звонок, когда свяжетесь",
      action: "activity",
      actionLabel: "Записать звонок",
    };
  }

  if (!facts.hasContactActivity && facts.contactAttempts === 0) {
    return {
      title: "Позвонить клиенту",
      description: "Позвоните и нажмите, чем закончился разговор. Следующий звонок назначится сам",
      action: "activity",
      actionLabel: "Записать звонок",
    };
  }

  if (!isDmFound(facts)) {
    return {
      title: "Выйти на того, кто принимает решение",
      description:
        "Когда поговорите с директором или владельцем, выберите итог «Вышли на ЛПР» — остальное отметится само",
      action: "activity",
      actionLabel: "Записать звонок",
    };
  }

  if (facts.needLevel === "NONE") {
    return {
      title: "Выяснить потребность",
      description: "Ответьте в блоке «Что узнали о клиенте»: нужен ли ему сайт. Это главный признак живого лида",
      action: "qualification",
      actionLabel: "Ответить",
    };
  }

  if (facts.budgetStatus === "UNKNOWN" && facts.timeline === "UNDEFINED") {
    return {
      title: "Уточнить бюджет и сроки",
      description: "Достаточно чего-то одного — нажмите вариант в блоке «Что узнали о клиенте»",
      action: "qualification",
      actionLabel: "Ответить",
    };
  }

  if (MANUAL_ONLY.includes(facts.status)) {
    return options.canCloseDeal
      ? {
          title: "Довести до оплаты",
          description: "Когда клиент оплатит работу, закройте сделку и укажите сумму — выплаты посчитаются сами",
          action: "close",
          actionLabel: "Закрыть сделку",
        }
      : {
          title: "Лид у руководителя",
          description: "Дальше по нему работает руководитель. Если клиент перезвонит вам — запишите звонок",
          action: "none",
        };
  }

  return options.canCloseDeal
    ? {
        title: "Лид квалифицирован",
        description: "Данных достаточно. Доведите до оплаты и закройте сделку с суммой",
        action: "close",
        actionLabel: "Закрыть сделку",
      }
    : {
        title: "Передать лид руководителю",
        description: "Клиент заинтересован и всё нужное известно. Брифинг для руководителя соберётся сам",
        action: "handover",
        actionLabel: "Передать",
      };
}
