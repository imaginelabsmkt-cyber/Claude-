import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { Button } from "@/components/ui/button";
import { BarrasRanqueadas } from "@/components/interno/barras-ranqueadas";
import { BarraDoFunil } from "@/components/comercial/barra-do-funil";
import { FunilBoard } from "@/components/comercial/funil-board";
import { ListaOportunidades } from "@/components/comercial/lista-oportunidades";
import { listarEncerrados, listarLeads, obterCarteira } from "@/lib/data/comercial";
import {
  ETAPAS_ABERTAS,
  clientesParaCobrir,
  estaParado,
  valorDoFunil,
} from "@/lib/comercial/funil";
import { mesAtual } from "@/lib/financeiro/meses";
import { obterProjecao } from "@/lib/data/metas";
import { formatarMoeda } from "@/lib/utils";
import { LEAD_STAGES_ABERTAS } from "@/types";
import type { LeadChannel, LeadStage, LeadTemperature } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Funil" };

/**
 * O quadro do funil: arraste entre as etapas, e entre na ficha para
 * ganhar ou perder (que pedem mais dados).
 *
 * O último cartão não é do comercial: é quanto falta de mensalidade
 * para a conta da empresa se pagar sozinha. Está aqui porque é a
 * pergunta que o comercial existe para responder, e porque traduzida
 * em "mais ou menos tantos clientes do tamanho médio" ela vira meta.
 */
interface PageProps {
  searchParams: { v?: string; etapa?: string; canal?: string; temp?: string };
}

export default async function FunilPage({ searchParams }: PageProps) {
  const mes = mesAtual();
  /* Um instante só para a tela inteira: duas linhas da lista não podem
     discordar sobre que horas são. */
  const agora = new Date();
  const [leads, encerrados, carteira, metas] = await Promise.all([
    listarLeads(LEAD_STAGES_ABERTAS),
    listarEncerrados(6),
    obterCarteira(mes),
    obterProjecao(),
  ]);

  const noFunil = valorDoFunil(leads);

  /* O recorte da barra. Os números de cima (em aberto, se tudo fechar,
     parados, falta para o fixo) continuam sobre o funil INTEIRO: eles
     respondem "como está o comercial", e um filtro de tela não muda
     isso. Quem o filtro recorta é a lista e o quadro. */
  const etapa = LEAD_STAGES_ABERTAS.includes(searchParams.etapa as LeadStage)
    ? (searchParams.etapa as LeadStage)
    : null;
  const canal = (searchParams.canal ?? "").trim() || null;
  const temp = (searchParams.temp ?? "").trim() || null;
  const recorte = leads.filter(
    (l) =>
      (!etapa || l.stage === etapa) &&
      (!canal || l.channel === (canal as LeadChannel)) &&
      (!temp || l.temperature === (temp as LeadTemperature)),
  );
  const modo = searchParams.v === "quadro" ? "quadro" : "lista";

  // O funil desenhado: uma barra por etapa, do primeiro contato ao
  // fechamento. É o gráfico que a área comercial existe para ter.
  const etapas = ETAPAS_ABERTAS.map((etapa) => {
    const naEtapa = leads.filter((l) => l.stage === etapa);
    return {
      rotulo: etapa,
      valor: naEtapa.reduce((t, l) => t + Number(l.estimated_monthly ?? 0), 0),
      detalhe:
        naEtapa.length === 1
          ? "1 oportunidade"
          : `${naEtapa.length} oportunidades`,
    };
  });
  const parados = leads.filter((l) => estaParado(l)).length;
  const falta = carteira.custoFixo - carteira.recorrente;
  const faltamClientes = clientesParaCobrir(falta, carteira.ticketMedio);

  return (
    <>
      <AreaHeader
        contexto="Oportunidades em aberto"
        acao={
          <Link href="/interno/comercial/novo">
            <Button>Nova oportunidade</Button>
          </Link>
        }
      />

      <ComercialTabs />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          rotulo="Em aberto"
          valor={String(leads.length)}
          detalhe={leads.length === 1 ? "oportunidade" : "oportunidades"}
        />
        <Stat
          rotulo="Valor em negociação"
          valor={formatarMoeda(noFunil)}
          detalhe="receita recorrente potencial"
        />
        <Stat
          rotulo="Sem movimentação"
          valor={String(parados)}
          alerta={parados > 0}
          detalhe={parados > 0 ? "além do prazo da etapa" : "todas em dia"}
        />
        <Stat
          rotulo="Cobertura do custo fixo"
          valor={formatarMoeda(Math.abs(falta))}
          origem="financeiro"
          alerta={falta > 0}
          detalhe={
            faltamClientes
              ? `${faltamClientes} cliente(s) no ticket médio`
              : undefined
          }
        />
        {/* A ponte com as Metas. O funil já responde "quanto está em
            jogo"; esta responde "e isso chega onde a gente quer?" —
            que é a pergunta seguinte e morava em outra tela. */}
        {metas.faltamClientes != null ? (
          <Stat
            rotulo="Para a meta"
            valor={`${metas.faltamClientes} ${metas.faltamClientes === 1 ? "cliente" : "clientes"}`}
            origem="metas"
            alerta={metas.faltamClientes > leads.length}
            detalhe={`${leads.length} em negociação hoje`}
          />
        ) : null}
      </div>

      {leads.length > 0 ? (
        <div className="mb-5">
          <Secao titulo="Funil por etapa">
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <BarrasRanqueadas itens={etapas} cor="#7a2740" ordenar={false} />
            </div>
          </Secao>
        </div>
      ) : null}

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-gray-900">
            Nenhuma oportunidade em aberto
          </p>
          <Link href="/interno/comercial/novo" className="mt-4 inline-block">
            <Button>Nova oportunidade</Button>
          </Link>
        </div>
      ) : (
        <>
          <BarraDoFunil quantos={recorte.length} />
          {modo === "quadro" ? (
            <FunilBoard leads={recorte} />
          ) : (
            <ListaOportunidades leads={recorte} agora={agora} />
          )}
        </>
      )}

      {encerrados.length > 0 ? (
        <div className="mt-7">
        <Secao
          titulo="Encerradas recentemente"
        >
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {encerrados.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 px-4 py-2.5">
                <Link
                  href={`/interno/comercial/${l.id}`}
                  className="min-w-0 flex-1 text-sm font-medium text-gray-900 hover:underline"
                >
                  {l.name}
                </Link>
                <span className="text-xs text-gray-500">
                  {l.stage === "Fechado"
                    ? "Fechado"
                    : `Não fechou${l.lost_reason_kind ?? l.lost_reason ? ` · ${l.lost_reason_kind ?? l.lost_reason}` : ""}`}
                </span>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-600">
                  {formatarMoeda(Number(l.estimated_monthly))}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
        </div>
      ) : null}
    </>
  );
}
