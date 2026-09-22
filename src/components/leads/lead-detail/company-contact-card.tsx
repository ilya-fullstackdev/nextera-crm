import { Globe, MapPin, Tag, Calendar, Briefcase, Phone, Send, Mail } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { LEAD_SOURCE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { LeadDetail } from "@/types/lead";

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
        <p className="truncate text-[13px] text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export function CompanyContactCard({ lead }: { lead: LeadDetail }) {
  return (
    <Card>
      <CardHeader title="Компания" />
      <CardBody className="pt-2">
        <Row icon={<Briefcase />} label="Ниша" value={lead.company.niche ?? "—"} />
        <Row icon={<MapPin />} label="Город" value={lead.company.city ?? "—"} />
        <Row
          icon={<Globe />}
          label="Сайт"
          value={
            lead.company.website ? (
              <a
                href={lead.company.website.startsWith("http") ? lead.company.website : `https://${lead.company.website}`}
                target="_blank"
                className="text-primary-600 hover:underline"
              >
                {lead.company.website}
              </a>
            ) : (
              "Сайта нет"
            )
          }
        />
        <Row icon={<Tag />} label="Источник" value={LEAD_SOURCE_LABELS[lead.source]} />
        <Row icon={<Calendar />} label="Дата добавления" value={formatDate(lead.createdAt)} />
      </CardBody>

      {lead.contact && (
        <>
          <div className="border-t border-border-subtle px-5 py-3">
            <p className="text-[13px] font-semibold text-text-primary">
              {lead.contact.firstName} {lead.contact.lastName ?? ""}
            </p>
            <p className="text-xs text-text-tertiary">{lead.contact.position ?? "Должность не указана"}</p>
          </div>
          <CardBody className="pt-0">
            {lead.contact.phone && <Row icon={<Phone />} label="Телефон" value={lead.contact.phone} />}
            {lead.contact.telegram && <Row icon={<Send />} label="Telegram" value={lead.contact.telegram} />}
            {lead.contact.email && <Row icon={<Mail />} label="Email" value={lead.contact.email} />}
          </CardBody>
        </>
      )}
    </Card>
  );
}
