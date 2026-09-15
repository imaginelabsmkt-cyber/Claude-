import { createClient } from "@/lib/supabase/server";
import type { Demand } from "@/types";

/**
 * Lista as demandas ATIVAS (não arquivadas). As não concluídas primeiro;
 * dentro disso, pelo prazo (mais próximo primeiro; sem prazo vai pro fim) e
 * depois pela criação mais recente.
 */
export async function listDemands(): Promise<Demand[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("demands")
    .select("*")
    .is("archived_at", null);
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

/**
 * Demandas de um cliente CONCLUÍDAS (Feita) dentro de um período — inclui as
 * arquivadas, pois servem de registro do que foi feito (relatório semanal).
 * `de`/`ate` são datas ISO (YYYY-MM-DD); filtra pela data de conclusão
 * (updated_at).
 */
export async function listDemandsFeitasCliente(
  clientId: string,
  de: string,
  ate: string,
): Promise<Demand[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("demands")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "Feita")
    .gte("updated_at", `${de}T00:00:00`)
    .lte("updated_at", `${ate}T23:59:59`)
    .order("updated_at", { ascending: false });
  return (data as Demand[] | null) ?? [];
}

