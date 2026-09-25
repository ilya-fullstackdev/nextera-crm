import { Avatar } from "@/components/ui/avatar";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TeamRow {
  id: string;
  name: string;
  calls: number;
  newLeads: number;
  handed: number;
}

/** Руководителю сразу видно, кто сегодня работает, а кто нет. */
export function TeamToday({ rows }: { rows: TeamRow[] }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
      <div className="flex items-center gap-1.5 border-b border-border-subtle px-4 py-3 sm:px-5">
        <h2 className="text-[14px] font-semibold text-text-primary">Команда сегодня</h2>
        <Hint>Звонки, новые лиды и переданные вам лиды за сегодня. Красным — кто ещё не сделал ни одного звонка</Hint>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-text-tertiary">В отделе звонков пока нет сотрудников</p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-text-tertiary">
              <th className="px-4 py-2 font-medium sm:px-5">Сотрудник</th>
              <th className="px-2 py-2 text-right font-medium">Звонки</th>
              <th className="px-2 py-2 text-right font-medium">Новые</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Передано</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((r) => {
              const [first, ...rest] = r.name.split(" ");
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="flex items-center gap-2">
                      <Avatar firstName={first} lastName={rest.join(" ")} size="xs" />
                      <span className="truncate text-text-primary">{r.name}</span>
                    </span>
                  </td>
                  <td className={cn("px-2 py-2.5 text-right font-semibold", r.calls === 0 ? "text-danger-600" : "text-text-primary")}>
                    {r.calls}
                  </td>
                  <td className="px-2 py-2.5 text-right text-text-secondary">{r.newLeads}</td>
                  <td className="px-4 py-2.5 text-right text-text-secondary sm:px-5">{r.handed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
