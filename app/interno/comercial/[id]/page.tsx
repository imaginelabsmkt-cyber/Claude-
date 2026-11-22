import Link from "next/link";
import { notFound } from "next/navigation";
import { rotuloDaEtapa } from "@/lib/comercial/etapas";
import { AreaHeader } from "@/components/interno/area-header";
import { Badge } from "@/components/ui/badge";
import { AtividadesPanel } from "@/components/comercial/atividades-panel";
import { BarraDeEtapas } from "@/components/comercial/barra-de-etapas";
import { FecharNegocio } from "@/components/comercial/fechar-negocio";
import { LinhaDoTempo } from "@/components/comercial/linha-do-tempo";
import { LeadForm } from "@/components/comercial/lead-form";
import { PropostasPanel } from "@/components/comercial/propostas-panel";
import { ReabrirLead } from "@/components/comercial/reabrir-lead";
import {
  listarAtividades,
  listarHistoricoDeEtapas,
  obterLead,
} from "@/lib/data/comercial";
import { diasParado, estaAberta, estaParado } from "@/lib/comercial/funil";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

/** Ficha da oportunidade: dados, propostas e o fechamento. */
export default async function OportunidadePage({ params }: PageProps) {
  const lead = await obterLead(params.id);
  if (!lead) notFound();

  /* Um instante só para a ficha inteira, calculado no servidor: a
     linha do tempo e os prazos das atividades têm que concordar. */
  const agora = new Date();

  const [passos, atividades] = await Promise.all([
    listarHistoricoDeEtapas(params.id),
    // Inclusive as feitas: na ficha, a atividade concluída é memória
    // ("já liguei em 3/11"), não entulho. Na fila de trabalho, não.
    listarAtividades({ leadId: params.id, abertas: false }),
  ]);

  const aberta = estaAberta(lead);
  const parado = estaParado(lead, agora);
  const dias = diasParado(lead, agora);

  return (
    <>
      <AreaHeader
        titulo={lead.name}
        contexto={rotuloDaEtapa(lead.stage)}
        acao={
          <Link
            href="/interno/comercial/funil"
            className="text-sm font-medium text-gray-500 hover:underline"
          >
            Funil
          </Link>
        }
      />

      {/* A barra de etapas, clicável — do raio-X do Zoho: "a Visão
          geral traz uma barra clicável com as situações do lead".
          Antes, mudar de etapa só dava arrastando o cartão no quadro. */}
      <div className="mb-3">
        <BarraDeEtapas leadId={lead.id} etapa={lead.stage} encerrada={!aberta} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <span className="text-xl font-bold tabular-nums text-gray-900">
          {formatarMoeda(Number(lead.estimated_monthly))}
          <span className="ml-1 text-xs font-normal text-gray-400">/mês estimado</span>
        </span>
        {lead.source ? <Badge>{lead.source}</Badge> : null}
        {aberta ? (
          <span className={parado ? "text-xs font-semibold text-alerta" : "text-xs text-gray-500"}>
            {dias === 0 ? "entrou hoje na etapa" : `${dias} dia(s) na etapa`}
            {parado ? " · além do prazo" : ""}
          </span>
        ) : null}
        {lead.client ? (
          <Link
            href={`/clientes/${lead.client.id}`}
            className="ml-auto text-sm font-medium text-area hover:underline"
          >
            Abrir {lead.client.name} →
          </Link>
        ) : null}
      </div>

      {aberta ? (
        <div className="mb-6">
          <FecharNegocio lead={lead} />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">
            {lead.stage === "Fechado"
              ? "Contrato fechado"
              : `Encerrada sem contrato${
                  lead.lost_reason_kind ?? lead.lost_reason
                    ? ` · ${lead.lost_reason_kind ?? lead.lost_reason}`
                    : ""
                }`}
          </p>
          <div className="mt-3">
            <ReabrirLead id={lead.id} />
          </div>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Atividades
        </h2>
        <AtividadesPanel
          leadId={lead.id}
          atividades={atividades}
          agoraISO={agora.toISOString()}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Propostas
          </h2>
          <PropostasPanel leadId={lead.id} propostas={lead.proposals} />
        </section>

        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Dados da oportunidade
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <LeadForm lead={lead} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Linha do tempo
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <LinhaDoTempo passos={passos} agora={agora} />
          </div>
        </section>
      </div>
    </>
  );
}
