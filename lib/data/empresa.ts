import { createClient } from "@/lib/supabase/server";
import {
  vencimentoAberto,
  type PrazoObrigacao,
  type VencimentoAberto,
} from "@/lib/empresa/obrigacoes";
import type { ClientFile, CompanyFile, Obligation } from "@/types";

/** Obrigação já com o vencimento em aberto calculado. */
export interface ObrigacaoComPrazo extends Obligation {
  /** Períodos já cumpridos. */
  cumpridos: string[];
  /** O vencimento em aberto (null = nada a fazer por agora). */
  aberto: VencimentoAberto | null;
}

/** Converte a linha do banco no que as regras de prazo esperam. */
function comoPrazo(o: Obligation): PrazoObrigacao {
  return {
    cadence: o.cadence,
    due_day: o.due_day,
    due_month: o.due_month,
    due_date: o.due_date,
    alert_days: o.alert_days,
    // A obrigação não podia estar atrasada antes de existir.
    since: o.created_at.slice(0, 10),
  };
}

/**
 * Lista as obrigações ativas (opcionalmente de uma área), cada uma com
 * o vencimento em aberto já resolvido. Atrasadas primeiro.
 */
export async function listarObrigacoes(
  area?: string,
): Promise<ObrigacaoComPrazo[]> {
  const supabase = createClient();

  let query = supabase
    .from("company_obligations")
    .select("*")
    .eq("active", true)
    .order("title");
  if (area) query = query.eq("area", area);

  const [{ data: obrigacoes }, { data: feitos }] = await Promise.all([
    query,
    supabase.from("obligation_completions").select("obligation_id, period"),
  ]);

  const porObrigacao = new Map<string, string[]>();
  for (const f of feitos ?? []) {
    const lista = porObrigacao.get(f.obligation_id) ?? [];
    lista.push(f.period);
    porObrigacao.set(f.obligation_id, lista);
  }

  return (obrigacoes ?? [])
    .map((o) => {
      const cumpridos = porObrigacao.get(o.id) ?? [];
      return {
        ...o,
        cumpridos,
        aberto: vencimentoAberto(comoPrazo(o), cumpridos),
      };
    })
    .sort((a, b) => {
      // Atrasada > vence em breve > em dia > sem nada em aberto.
      const peso = (x: ObrigacaoComPrazo) =>
        x.aberto?.situacao === "Atrasada"
          ? 0
          : x.aberto?.situacao === "Vence em breve"
            ? 1
            : x.aberto
              ? 2
              : 3;
      const d = peso(a) - peso(b);
      if (d !== 0) return d;
      return (a.aberto?.data ?? "9999").localeCompare(b.aberto?.data ?? "9999");
    });
}

/** Obrigações que pedem atenção agora (atrasadas ou vencendo). */
export async function listarObrigacoesUrgentes(): Promise<ObrigacaoComPrazo[]> {
  const todas = await listarObrigacoes();
  return todas.filter(
    (o) => o.aberto?.situacao === "Atrasada" || o.aberto?.situacao === "Vence em breve",
  );
}

/** Documentos da empresa, mais recentes primeiro. */
export async function listarDocumentosEmpresa(): Promise<CompanyFile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("company_files")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Um contrato de cliente: o arquivo mais o nome do cliente. */
export interface ContratoCliente extends ClientFile {
  clienteNome: string;
  clienteAtivo: boolean;
}

/**
 * Contratos assinados de clientes.
 *
 * Não há tabela de contratos: o arquivo do contrato é um arquivo do
 * cliente (`client_files` com `kind = 'Contrato'`), e continua
 * aparecendo na ficha dele. Aqui só se faz o recorte.
 */
export async function listarContratos(): Promise<ContratoCliente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_files")
    .select("*, client:clients(name, active)")
    .eq("kind", "Contrato")
    .order("created_at", { ascending: false });

  type Linha = ClientFile & { client: { name: string; active: boolean } | null };
  return ((data ?? []) as unknown as Linha[]).map((f) => ({
    ...f,
    clienteNome: f.client?.name ?? "Cliente removido",
    clienteAtivo: f.client?.active ?? false,
  }));
}
