import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Stat } from "@/components/interno/stat";
import { Button } from "@/components/ui/button";
import { FunilBoard } from "@/components/comercial/funil-board";
import { listarEncerrados, listarLeads, obterCarteira } from "@/lib/data/comercial";
import { clientesParaCobrir, estaParado, valorDoFunil } from "@/lib/comercial/funil";
import { mesAtual } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";
import { LEAD_STAGES_ABERTAS } from "@/types";

export const dynamic = "force-dynamic";

/**
 * O quadro do funil: arraste entre as etapas, e entre na ficha para
 * ganhar ou perder (que pedem mais dados).
 */
export default async function FunilPage() {
  const mes = mesAtual();
  const [leads, encerrados, carteira] = await Promise.all([
    listarLeads(LEAD_STAGES_ABERTAS),
    listarEncerrados(6),
    obterCarteira(mes),
  ]);

  const noFunil = valorDoFunil(leads);
  const parados = leads.filter((l) => estaParado(l)).length;
  const falta = carteira.custoFixo - carteira.recorrente;
  const faltamClientes = clientesParaCobrir(falta, carteira.ticketMedio);

  return (
    <>
      <AreaHeader
        titulo="Funil"
        contexto="Oportunidades"
        acao={
          <Link href="/interno/comercial/novo">
            <Button>Nova oportunidade</Button>
          </Link>
        }
      />

      <ComercialTabs />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat rotulo="No funil" valor={String(leads.length)} detalhe="Em aberto" />
        <Stat
          rotulo="Valor do funil"
          valor={formatarMoeda(noFunil)}
          detalhe="Por mês, se tudo fechar"
        />
        <Stat
          rotulo="Parados"
          valor={String(parados)}
          alerta={parados > 0}
          detalhe={parados > 0 ? "Passaram do prazo da etapa" : "Nenhum esquecido"}
        />
        <Stat
          rotulo={falta > 0 ? "Falta para o fixo" : "Já cobre o fixo"}
          valor={formatarMoeda(Math.abs(falta))}
          origem="financeiro"
          alerta={falta > 0}
          detalhe={
            faltamClientes
              ? `~${faltamClientes} cliente(s) do tamanho médio`
              : undefined
          }
        />
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-gray-900">O funil está vazio</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Cadastre a primeira oportunidade. Quando ela for ganha, o cliente e a
            mensalidade nascem sozinhos no financeiro.
          </p>
          <Link href="/interno/comercial/novo" className="mt-4 inline-block">
            <Button>Nova oportunidade</Button>
          </Link>
        </div>
      ) : (
        <FunilBoard leads={leads} />
      )}

      {encerrados.length > 0 ? (
        <>
          <h2 className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Encerradas recentemente
          </h2>
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
                    ? "ganhamos"
                    : `perdemos${l.lost_reason ? ` — ${l.lost_reason}` : ""}`}
                </span>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-600">
                  {formatarMoeda(Number(l.estimated_monthly))}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
