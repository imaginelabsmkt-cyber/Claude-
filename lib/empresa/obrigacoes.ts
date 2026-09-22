/**
 * Regras de prazo das obrigações da empresa.
 *
 * Funções PURAS, cobertas por testes. O problema que resolvem: dada uma
 * obrigação periódica e a lista de períodos já cumpridos, qual é o
 * vencimento que está ABERTO agora — e ele está atrasado?
 *
 * Períodos são texto porque a chave muda com a periodicidade:
 *   Mensal/Trimestral -> "2026-09"
 *   Anual             -> "2026"
 *   Única             -> "unica"
 */

import type { ObligationCadence } from "@/types";

/** O mínimo que as regras precisam saber de uma obrigação. */
export interface PrazoObrigacao {
  cadence: ObligationCadence;
  due_day: number | null;
  due_month: number | null;
  due_date: string | null;
  alert_days: number;
  /**
   * Desde quando esta obrigação existe ("YYYY-MM-DD", normalmente o
   * `created_at`). Períodos anteriores a isso NÃO contam como atraso —
   * sem esse corte, cadastrar hoje uma obrigação mensal faria o sistema
   * acusar seis meses de atraso que nunca existiram.
   */
  since?: string | null;
}

/** Quantos períodos para trás vale procurar pendência. */
const OLHAR_PARA_TRAS = 6;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function semHoras(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diasEntre(de: Date, ate: Date): number {
  return Math.round((semHoras(ate).getTime() - semHoras(de).getTime()) / 86_400_000);
}

/**
 * Data de vencimento dentro de um mês, respeitando meses curtos: dia 31
 * em abril cai em 30, dia 31 em fevereiro cai em 28 (ou 29).
 */
function dataNoMes(ano: number, mes: number, dia: number): string {
  const ultimo = new Date(ano, mes, 0).getDate();
  const diaFinal = Math.min(Math.max(dia, 1), ultimo);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

/** Vencimento de um período específico. */
export function vencimentoDoPeriodo(
  o: PrazoObrigacao,
  periodo: string,
): string | null {
  if (o.cadence === "Única") return o.due_date;
  if (!o.due_day) return null;

  if (o.cadence === "Anual") {
    const ano = Number(periodo);
    if (!ano || !o.due_month) return null;
    return dataNoMes(ano, o.due_month, o.due_day);
  }

  const [ano, mes] = periodo.split("-").map(Number);
  if (!ano || !mes) return null;
  return dataNoMes(ano, mes, o.due_day);
}

/**
 * Os períodos que essa obrigação tem por volta de agora: alguns para
 * trás (para pegar o que ficou pendente) e um para frente.
 *
 * O trimestral usa `due_month` como âncora: com âncora em março, vence
 * em março, junho, setembro e dezembro.
 */
export function periodosProximos(
  o: PrazoObrigacao,
  hoje: Date = new Date(),
): string[] {
  if (o.cadence === "Única") return ["unica"];

  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  if (o.cadence === "Anual") {
    return [String(ano - 1), String(ano), String(ano + 1)];
  }

  const meses: string[] = [];
  for (let i = -OLHAR_PARA_TRAS; i <= 1; i++) {
    const d = new Date(ano, mes - 1 + i, 1);
    const m = d.getMonth() + 1;
    if (o.cadence === "Trimestral") {
      const ancora = o.due_month ?? 1;
      // Só os meses alinhados ao trimestre da âncora.
      if ((((m - ancora) % 3) + 3) % 3 !== 0) continue;
    }
    meses.push(`${d.getFullYear()}-${String(m).padStart(2, "0")}`);
  }
  return meses;
}

export type SituacaoObrigacao = "Atrasada" | "Vence em breve" | "Em dia" | "Cumprida";

/** O vencimento em aberto de uma obrigação. */
export interface VencimentoAberto {
  periodo: string;
  /** Data "YYYY-MM-DD" do vencimento. */
  data: string;
  /** Dias até vencer (negativo = já passou). */
  dias: number;
  situacao: SituacaoObrigacao;
}

/**
 * Qual vencimento está em aberto: o período mais antigo ainda não
 * cumprido cuja data já chegou ou está próxima.
 *
 * Períodos com vencimento anterior a `since` são ignorados — a
 * obrigação não podia estar atrasada antes de existir.
 *
 * Devolve null quando tudo que já venceu está cumprido e o próximo
 * vencimento ainda está longe (fora do aviso).
 */
export function vencimentoAberto(
  o: PrazoObrigacao,
  cumpridos: string[],
  hoje: Date = new Date(),
): VencimentoAberto | null {
  const jaFeitos = new Set(cumpridos);
  const desde = o.since ? o.since.slice(0, 10) : null;

  const candidatos = periodosProximos(o, hoje)
    .filter((p) => !jaFeitos.has(p))
    .map((periodo) => {
      const data = vencimentoDoPeriodo(o, periodo);
      return data ? { periodo, data, dias: diasEntre(hoje, new Date(`${data}T00:00:00`)) } : null;
    })
    .filter((c): c is { periodo: string; data: string; dias: number } => c !== null)
    .filter((c) => !desde || c.data >= desde)
    // Do mais antigo para o mais novo: pendência velha vem primeiro.
    .sort((a, b) => a.data.localeCompare(b.data));

  // Pendência que já venceu manda, por mais antiga que seja.
  const atrasada = candidatos.find((c) => c.dias < 0);
  if (atrasada) return { ...atrasada, situacao: "Atrasada" };

  // Senão, o próximo a vencer — só se já entrou na janela de aviso.
  const proxima = candidatos[0];
  if (!proxima) return null;
  if (proxima.dias > o.alert_days) {
    return { ...proxima, situacao: "Em dia" };
  }
  return { ...proxima, situacao: "Vence em breve" };
}

/** Texto humano do prazo, para a lista. */
export function textoPrazo(v: VencimentoAberto): string {
  if (v.dias < -1) return `venceu há ${Math.abs(v.dias)} dias`;
  if (v.dias === -1) return "venceu ontem";
  if (v.dias === 0) return "vence hoje";
  if (v.dias === 1) return "vence amanhã";
  return `em ${v.dias} dias`;
}

/** Rótulo do período, para exibir ("Set/2026", "2026", "—"). */
export function rotuloPeriodo(periodo: string): string {
  if (periodo === "unica") return "uma vez";
  if (/^\d{4}$/.test(periodo)) return periodo;
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [ano, mes] = periodo.split("-").map(Number);
  if (!ano || !mes) return periodo;
  return `${nomes[mes - 1]}/${ano}`;
}

/** Período que a obrigação está cumprindo agora (para o botão "marcar feito"). */
export function periodoCorrente(
  o: PrazoObrigacao,
  hoje: Date = new Date(),
): string {
  if (o.cadence === "Única") return "unica";
  if (o.cadence === "Anual") return String(hoje.getFullYear());
  const m = hoje.getMonth() + 1;
  if (o.cadence === "Trimestral") {
    // Recua até o mês alinhado ao trimestre da âncora.
    const ancora = o.due_month ?? 1;
    let mes = m;
    while ((((mes - ancora) % 3) + 3) % 3 !== 0) mes -= 1;
    const d = new Date(hoje.getFullYear(), mes - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${hoje.getFullYear()}-${String(m).padStart(2, "0")}`;
}

/** Data de hoje em ISO, para gravar `completed_at`. */
export function hojeISO(hoje: Date = new Date()): string {
  return iso(hoje);
}
