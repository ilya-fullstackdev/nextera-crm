import type {
  LeadStatus,
  Priority,
  LeadSource,
  DecisionMakerStatus,
  NeedLevel,
  DealTimeline,
  BudgetStatus,
  InterestLevel,
  RejectionReason,
  ActivityType,
  TaskType,
  TaskStatus,
} from "@/generated/prisma/enums";

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ContactRef {
  id: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  isDecisionMaker: boolean;
  companyId: string;
}

export interface ActivityRef {
  id: string;
  type: ActivityType;
  comment: string | null;
  createdAt: string;
  user: UserRef;
}

export interface TaskRef {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  dueAt: string;
  comment: string | null;
  completedAt: string | null;
  assignee: UserRef;
}

export interface FileRef {
  id: string;
  fileName: string;
  category: string | null;
  storagePath: string;
  size: number;
  createdAt: string;
  uploadedBy: UserRef;
}

export interface HandoverRef {
  id: string;
  createdAt: string;
  fromUser: UserRef;
  toUser: UserRef;
  dmInfo: string | null;
  needSummary: string | null;
  situation: string | null;
  problem: string | null;
  desiredResult: string | null;
  timeline: string | null;
  budget: string | null;
  discussed: string | null;
  objections: string | null;
  nextStep: string | null;
}

export interface LeadDetail {
  id: string;
  status: LeadStatus;
  priority: Priority;
  source: LeadSource;
  companyId: string;
  company: {
    id: string;
    name: string;
    niche: string | null;
    city: string | null;
    website: string | null;
    createdAt: string;
  };
  contactId: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    position: string | null;
    phone: string | null;
    telegram: string | null;
    email: string | null;
  } | null;
  owner: UserRef;
  createdBy: UserRef;
  dmStatus: DecisionMakerStatus;
  needLevel: NeedLevel;
  needDescription: string | null;
  currentWebsite: string | null;
  problem: string | null;
  desiredResult: string | null;
  timeline: DealTimeline;
  budgetStatus: BudgetStatus;
  budgetComment: string | null;
  currentContractor: string | null;
  interestLevel: InterestLevel | null;
  nextContactAt: string | null;
  contactAttempts: number;
  rejectionReason: RejectionReason | null;
  rejectionComment: string | null;
  handedToManagerAt: string | null;
  createdAt: string;
  decisionMakers: ContactRef[];
  activities: ActivityRef[];
  tasks: TaskRef[];
  files: FileRef[];
  handovers: HandoverRef[];
}
