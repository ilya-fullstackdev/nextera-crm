import { redirect } from "next/navigation";

// Раздел стал вкладкой в общем списке лидов.
export default function Page() {
  redirect("/crm/leads?view=manager");
}
