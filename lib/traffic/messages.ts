import type { Client, TrafficCharge } from "@/types";
import { formatarData, formatarMoeda } from "@/lib/utils";

/**
 * =============================================================
 * MODELOS DE MENSAGEM — COBRANÇA DE TRÁFEGO
 * =============================================================
 * Monta o texto enviado ao cliente a partir de um modelo com placeholders.
 * Os modelos ficam em traffic_settings (editáveis na UI), então aqui só
 * fazemos a substituição — sem texto fixo escondido no código.
 *
 * Placeholders suportados:
 *   {cliente}     nome do cliente
 *   {valor}       valor formatado (R$)
 *   {pix}         código Pix copia-e-cola
 *   {semana}      segunda-feira de referência (dd/mm/aaaa)
 *   {vencimento}  data de vencimento (dd/mm/aaaa)
 * =============================================================
 */

export interface DadosMensagem {
  cliente: string;
  valor: string;
  pix: string;
  semana: string;
  vencimento: string;
}

/** Substitui os placeholders {chave} do modelo pelos valores informados. */
export function renderizarMensagem(
  modelo: string,
  dados: DadosMensagem,
): string {
  const registro = dados as unknown as Record<string, string>;
  return modelo.replace(/\{(\w+)\}/g, (original, chave: string) => {
    const valor = registro[chave];
    return valor !== undefined ? valor : original;
  });
}

/** Monta os dados de placeholder a partir de uma cobrança e seu cliente. */
export function dadosDaCobranca(
  charge: Pick<
    TrafficCharge,
    "amount" | "pix_code" | "reference_week" | "due_date"
  >,
  client: Pick<Client, "name">,
): DadosMensagem {
  return {
    cliente: client.name,
    valor: formatarMoeda(Number(charge.amount)),
    pix: charge.pix_code ?? "",
    semana: formatarData(charge.reference_week),
    vencimento: formatarData(charge.due_date),
  };
}

/** Conveniência: renderiza direto a partir de cobrança + cliente. */
export function montarMensagem(
  modelo: string,
  charge: Pick<
    TrafficCharge,
    "amount" | "pix_code" | "reference_week" | "due_date"
  >,
  client: Pick<Client, "name">,
): string {
  return renderizarMensagem(modelo, dadosDaCobranca(charge, client));
}
