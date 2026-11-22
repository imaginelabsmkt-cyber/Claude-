import Link from "next/link";
import { diasParado, estaParado } from "@/lib/comercial/funil";
import {
  diasAte,
  quandoEhAReuniao,
  reuniaoPassou,
} from "@/lib/comercial/reuniao";
import { Badge } from "@/components/ui/badge";
import { LEAD_TEMPERATURE_TONE } from "@/types";
import { cn, formatarMoeda } from "@/lib/utils";
import type { LeadWithRelations } from "@/types";

/**
 * O funil em LISTA.
 *
 * A Fran: "os clientes que estão em prospecção, eles não aparecem, só
 * aparece tipo quantitativo". No quadro o nome está lá, mas espalhado
 * em cinco colunas que rolam de lado — não havia um lugar que
 * respondesse "me mostra todas, em ordem, com quanto e em que pé".
 *
 * As colunas são as do "modelo de dados mínimo" do raio-X do Zoho que
 * a Vitória fez: nome, origem, etapa, valor e a PRÓXIMA COISA. Essa
 * última é a etiqueta que, no Zoho, aparece em toda lista — e é o que
 * transforma lista em tela de trabalho: reunião hoje, parado há seis
 * dias, proposta vencida.
 */

/** Dias entre hoje e a data combinada, no fuso da agência. */
function diasAteOContato(data: string, agora: Date): number {
  return diasAte(new Date(`${data}T12:00:00-04:00`), agora);
}

/**
 * A etiqueta da próxima coisa: o que essa oportunidade está pedindo.
 *
 * O `agora` vem de cima, calculado uma vez na página. Antes cada
 * linha chamava `new Date()` depois de montar, para o servidor e o
 * navegador não discordarem — e a coluna mais útil da lista ficava
 * vazia no primeiro quadro. Agora as frases são escritas no fuso de
 * Boa Vista (ver lib/comercial/reuniao.ts), então os dois lados dizem
 * a mesma coisa e isto volta a ser componente de servidor.
 */
function Proxima({
  lead,
  agora,
}: {
  lead: LeadWithRelations;
  agora: Date;
}) {
  /* O COMPROMISSO vem antes do alarme. Se existe data marcada para
     falar de novo, é isso que a pessoa precisa ver; "parado há 9
     dias" é o que o sistema deduz quando ninguém marcou nada. */
  if (lead.next_contact_on) {
    const dias = diasAteOContato(lead.next_contact_on, agora);
    const atrasado = dias < 0;
    return (
      <span
        className={cn(
          "text-xs font-semibold",
          atrasado ? "text-alerta" : dias === 0 ? "text-area" : "text-gray-600",
        )}
      >
        {atrasado
          ? `Contato venceu há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`
          : dias === 0
            ? "Falar hoje"
            : `Falar ${quandoEhAReuniao(`${lead.next_contact_on}T12:00:00-04:00`, agora)}`}
      </span>
    );
  }

  if (lead.meeting_at) {
    const atrasada = reuniaoPassou(lead.meeting_at, agora);
    return (
      <span
        className={cn(
          "text-xs font-semibold",
          atrasada ? "text-alerta" : "text-area",
        )}
      >
        Reunião {quandoEhAReuniao(lead.meeting_at, agora)}
      </span>
    );
  }

  if (estaParado(lead, agora)) {
    const d = diasParado(lead, agora);
    return (
      <span className="text-xs font-semibold text-alerta">
        Sem movimentação há {d} dia{d > 1 ? "s" : ""}
      </span>
    );
  }

  const d = diasParado(lead, agora);
  return (
    <span className="text-xs text-gray-500">
      {d === 0 ? "entrou hoje" : `${d} dia${d > 1 ? "s" : ""} na etapa`}
    </span>
  );
}

export function ListaOportunidades({
  leads,
  agora,
}: {
  leads: LeadWithRelations[];
  /** Instante de referência, calculado na página. */
  agora: Date;
}) {
  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
        Nenhuma oportunidade neste filtro.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Celular: uma linha por oportunidade, sem tabela. A tabela em
          tela estreita vira rolagem lateral, e rolagem lateral é a
          primeira coisa que ela deixa de usar. */}
      <ul className="divide-y divide-gray-100 sm:hidden">
        {leads.map((l) => (
          <li key={l.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={`/interno/comercial/${l.id}`}
                className="min-w-0 flex-1 text-sm font-semibold text-gray-900 hover:underline"
              >
                {l.name}
              </Link>
              <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                {formatarMoeda(Number(l.estimated_monthly))}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
              {l.temperature ? (
                <Badge tom={LEAD_TEMPERATURE_TONE[l.temperature]}>
                  {l.temperature}
                </Badge>
              ) : null}
              <span>
                {l.stage} · {l.channel}
              </span>
            </p>
            <div className="mt-0.5">
              <Proxima lead={l} agora={agora} />
            </div>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-4 py-2 text-left font-bold">Oportunidade</th>
            <th className="px-4 py-2 text-left font-bold">Temp.</th>
            <th className="px-4 py-2 text-left font-bold">Etapa</th>
            <th className="px-4 py-2 text-left font-bold">Origem</th>
            <th className="px-4 py-2 text-right font-bold">Valor mensal</th>
            <th className="px-4 py-2 text-left font-bold">Próxima ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5">
                <Link
                  href={`/interno/comercial/${l.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {l.name}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                {l.temperature ? (
                  <Badge tom={LEAD_TEMPERATURE_TONE[l.temperature]}>
                    {l.temperature}
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-gray-600">{l.stage}</td>
              <td className="px-4 py-2.5 text-gray-600">{l.channel}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                {formatarMoeda(Number(l.estimated_monthly))}
              </td>
              <td className="px-4 py-2.5">
                <Proxima lead={l} agora={agora} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
