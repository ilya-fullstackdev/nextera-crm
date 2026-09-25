import { Globe, MapPin, Tag, Calendar, Briefcase, Pencil } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LEAD_SOURCE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { normalizeUrl } from "@/lib/finance";
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

export function CompanyContactCard({ lead, onEdit }: { lead: LeadDetail; onEdit?: () => void }) {
  return (
    <Card>
      <CardHeader
        title="О компании"
        action={
          onEdit && (
            <Button variant="ghost" size="sm" icon={<Pencil />} onClick={onEdit} title="Изменить название, телефон и другие данные">
              Изменить
            </Button>
          )
        }
      />
      <CardBody className="pt-2">
        <Row icon={<Briefcase />} label="Ниша" value={lead.company.niche || "—"} />
        <Row icon={<MapPin />} label="Город" value={lead.company.city || "—"} />
        <Row
          icon={<Globe />}
          label="Сайт"
          value={
            lead.company.website ? (
              <a href={normalizeUrl(lead.company.website)} target="_blank" className="text-primary-600 hover:underline">
                {lead.company.website}
              </a>
            ) : (
              "Сайта нет"
            )
          }
        />
        <Row icon={<Tag />} label="Где нашли" value={LEAD_SOURCE_LABELS[lead.source]} />
        <Row
          icon={<Calendar />}
          label="Добавлен"
          value={`${formatDate(lead.createdAt)} · ${lead.createdBy.firstName} ${lead.createdBy.lastName}`}
        />
      </CardBody>
    </Card>
  );
}
