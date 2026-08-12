import type {
  ChargeStatus,
  TrafficCharge,
  TrafficSettings,
} from "@/types";
import { difEmDias, parseData } from "@/lib/rules/contents";

/**
 * =============================================================
 * CAMADA CENTRAL DE REGRAS — COBRANÇA DE TRÁFEGO
 * =============================================================
 * Fonte única das regras derivadas de uma cobrança: qual é a segunda-feira
 * de referência da semana, quando vence, se está atrasada e se já é hora de
 * mandar um lembrete. Componentes e ações NÃO devem reimplementar isto.
 *
 * Todas as funções sensíveis a "hoje" recebem a data como parâmetro para
 * serem determinísticas nos testes (`traffic.test.ts`).
 * =============================================================
 */

/** Formata um Date local como "YYYY-MM-DD". */
export function formatarDataISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Retorna a segunda-feira (início) da semana que contém `d`, como string
 * "YYYY-MM-DD". Semana começa na segunda; domingo pertence à semana que
 * começou na segunda anterior.
 */
export function segundaDaSemana(d: Date = new Date()): string {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaSemana = base.getDay(); // 0=domingo, 1=segunda, ... 6=sábado
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  base.setDate(base.getDate() - recuo);
  return formatarDataISO(base);
}

/** Soma `dias` a uma data "YYYY-MM-DD" e devolve outra string ISO. */
export function somarDias(dataISO: string, dias: number): string {
  const d = parseData(dataISO);
  if (!d) return dataISO;
  d.setDate(d.getDate() + dias);
  return formatarDataISO(d);
}

/**
 * Vencimento de uma cobrança: a segunda-feira de referência + o
 * deslocamento configurado (due_offset_days).
 */
export function calcularVencimento(
  referenceWeek: string,
  offsetDays: number,
): string {
  return somarDias(referenceWeek, offsetDays);
}

/** Status que já saíram do fluxo de cobrança (não geram atraso/lembrete). */
const STATUS_ENCERRADOS: ChargeStatus[] = ["Pago", "Cancelado"];

/**
 * Uma cobrança está atrasada quando ainda não foi paga/cancelada e a data
 * de vencimento (ou a semana de referência, na ausência de vencimento) já
 * passou em relação a `hoje`.
 */
export function estaAtrasada(
  charge: Pick<TrafficCharge, "status" | "due_date" | "reference_week">,
  hoje: Date = new Date(),
): boolean {
  if (STATUS_ENCERRADOS.includes(charge.status)) return false;
  const vencimento = parseData(charge.due_date ?? charge.reference_week);
  if (!vencimento) return false;
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return difEmDias(inicioHoje, vencimento) > 0;
}

/**
 * Decide se uma cobrança deve receber um lembrete automático agora.
 * Regras:
 * - só cobranças já enviadas (status "Enviado");
 * - vencidas há pelo menos `reminder_days`;
 * - com menos lembretes que `reminder_max`;
 * - respeitando `reminder_interval` dias desde o último lembrete.
 */
export function deveEnviarLembrete(
  charge: Pick<
    TrafficCharge,
    | "status"
    | "due_date"
    | "reference_week"
    | "reminder_count"
    | "last_reminder_at"
  >,
  settings: Pick<
    TrafficSettings,
    "reminder_days" | "reminder_interval" | "reminder_max"
  >,
  hoje: Date = new Date(),
): boolean {
  if (charge.status !== "Enviado") return false;
  if (charge.reminder_count >= settings.reminder_max) return false;

  const vencimento = parseData(charge.due_date ?? charge.reference_week);
  if (!vencimento) return false;

  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const diasVencida = difEmDias(inicioHoje, vencimento);
  if (diasVencida < settings.reminder_days) return false;

  // Respeita o intervalo mínimo desde o último lembrete.
  if (charge.last_reminder_at) {
    const ultimo = new Date(charge.last_reminder_at);
    const inicioUltimo = new Date(
      ultimo.getFullYear(),
      ultimo.getMonth(),
      ultimo.getDate(),
    );
    if (difEmDias(inicioHoje, inicioUltimo) < settings.reminder_interval) {
      return false;
    }
  }

  return true;
}

export interface ResumoSemana {
  total: number;
  pendentes: number;
  enviadas: number;
  pagas: number;
  atrasadas: number;
  valorTotal: number;
  valorRecebido: number;
  valorEmAberto: number;
}

/** Consolida os números de uma lista de cobranças (para os cards do topo). */
export function resumoSemana(
  charges: Pick<TrafficCharge, "status" | "amount" | "due_date" | "reference_week">[],
  hoje: Date = new Date(),
): ResumoSemana {
  const resumo: ResumoSemana = {
    total: charges.length,
    pendentes: 0,
    enviadas: 0,
    pagas: 0,
    atrasadas: 0,
    valorTotal: 0,
    valorRecebido: 0,
    valorEmAberto: 0,
  };

  for (const c of charges) {
    const valor = Number(c.amount) || 0;
    if (c.status === "Cancelado") continue;
    resumo.valorTotal += valor;

    if (c.status === "Pendente") resumo.pendentes += 1;
    if (c.status === "Enviado") resumo.enviadas += 1;
    if (c.status === "Pago") {
      resumo.pagas += 1;
      resumo.valorRecebido += valor;
    } else {
      resumo.valorEmAberto += valor;
    }
    if (estaAtrasada(c, hoje)) resumo.atrasadas += 1;
  }

  return resumo;
}
