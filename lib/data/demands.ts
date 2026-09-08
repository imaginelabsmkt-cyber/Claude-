import { createClient } from "@/lib/supabase/server";
import type { Demand } from "@/types";

/**
 * Lista todas as demandas gerais. As não concluídas primeiro; dentro disso,
 * pelo prazo (mais próximo primeiro; sem prazo vai pro fim) e depois pela
 * criação mais recente.
 */
export async function listDemands(): Promise<Demand[]> {
  const supabase = createClient();
  const { data } = await supabase.from("demands").select("*");
  const lista = (data as Demand[] | null) ?? [];
  return lista.sort((a, b) => {
    const feitaA = a.status === "Feita" ? 1 : 0;
    const feitaB = b.status === "Feita" ? 1 : 0;
    if (feitaA !== feitaB) return feitaA - feitaB;
    const prazoA = a.due_date ?? "9999-99-99";
    const prazoB = b.due_date ?? "9999-99-99";
    if (prazoA !== prazoB) return prazoA.localeCompare(prazoB);
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}
