import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaHeader } from "@/components/interno/area-header";
import { Badge } from "@/components/ui/badge";
import { FecharNegocio } from "@/components/comercial/fechar-negocio";
import { LeadForm } from "@/components/comercial/lead-form";
import { PropostasPanel } from "@/components/comercial/propostas-panel";
import { ReabrirLead } from "@/components/comercial/reabrir-lead";
import { obterLead } from "@/lib/data/comercial";
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

  const aberta = estaAberta(lead);
  const parado = estaParado(lead);
  const dias = diasParado(lead);

  return (
    <>
      <AreaHeader
        titulo={lead.name}
        contexto={lead.stage}
        acao={
          <Link
            href="/interno/comercial/funil"
            className="text-sm font-medium text-gray-500 hover:underline"
          >
            Voltar ao funil
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <span className="text-xl font-bold tabular-nums text-gray-900">
          {formatarMoeda(Number(lead.estimated_monthly))}
          <span className="ml-1 text-xs font-normal text-gray-400">/mês estimado</span>
        </span>
        {lead.source ? <Badge>{lead.source}</Badge> : null}
        {aberta ? (
          <span className={parado ? "text-xs font-semibold text-alerta" : "text-xs text-gray-500"}>
            {dias === 0 ? "entrou hoje nesta etapa" : `${dias} dia(s) nesta etapa`}
            {parado ? " — passou do prazo" : ""}
          </span>
        ) : null}
        {lead.client ? (
          <Link
            href={`/clientes/${lead.client.id}`}
            className="ml-auto text-sm font-medium text-area hover:underline"
          >
            Ver o cliente {lead.client.name} →
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
              ? "Negócio ganho"
              : `Negócio perdido${lead.lost_reason ? ` — ${lead.lost_reason}` : ""}`}
          </p>
          {lead.stage === "Fechado" ? (
            <p className="mt-1 text-xs text-gray-500">
              O cliente e a mensalidade já foram criados no financeiro.
            </p>
          ) : null}
          <div className="mt-3">
            <ReabrirLead id={lead.id} />
          </div>
        </div>
      )}

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
      </div>
    </>
  );
}
