"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import type { FileRef } from "@/types/lead";

const CATEGORIES: Record<string, string> = {
  proposal: "Коммерческое предложение",
  presentation: "Презентация",
  brief: "Бриф",
  spec: "Техническое задание",
  contract: "Договор",
  other: "Другое",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function FilesPanel({ leadId, files, onChange }: { leadId: string; files: FileRef[]; onChange: () => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("other");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const res = await fetch(`/api/leads/${leadId}/files`, { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Не удалось загрузить файл", data.error);
        return;
      }
      toast.success("Файл загружен", file.name);
      onChange();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-3">
        <p className="text-[13px] font-semibold text-text-primary">Файлы</p>
        <div className="flex items-center gap-2">
          <Select className="!h-8 w-auto text-[13px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button variant="secondary" size="sm" icon={<Upload />} loading={uploading} onClick={() => inputRef.current?.click()}>
            Загрузить
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState icon={<FileText />} title="Файлов пока нет" description="Загрузите КП, бриф, ТЗ или договор" />
      ) : (
        <div className="divide-y divide-border-subtle">
          {files.map((file) => (
            <a
              key={file.id}
              href={file.storagePath}
              target="_blank"
              className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-text-primary">{file.fileName}</p>
                <p className="text-xs text-text-tertiary">
                  {file.category && `${CATEGORIES[file.category] ?? file.category} · `}
                  {formatSize(file.size)} · {file.uploadedBy.firstName} {file.uploadedBy.lastName} ·{" "}
                  {formatDateTime(file.createdAt)}
                </p>
              </div>
              <Download className="h-4 w-4 shrink-0 text-text-tertiary" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
