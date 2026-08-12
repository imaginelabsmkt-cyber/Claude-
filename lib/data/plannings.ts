import { createClient } from "@/lib/supabase/server";
import type { Planning } from "@/types";

/** Lista os planejamentos de um mês de referência (YYYY-MM). */
export async function listPlannings(referenceMonth: string): Promise<Planning[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plannings")
    .select("*")
    .eq("reference_month", referenceMonth);
  return (data as Planning[] | null) ?? [];
}
