import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { BarrasRanqueadas } from "@/components/interno/barras-ranqueadas";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { Secao } from "@/components/interno/secao";
import { Stat } from "@/components/interno/stat";
import { listarTodasEncerradas } from "@/lib/data/comercial";
import { motivosDaPerda, placar } from "@/lib/comercial/encerrados";
import { formatarData, formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fechados e perdidos" };

/**
 * A base de dados do comercial: quem virou cliente e quem não virou.
 *
 * A Fran: "não aparece os clientes que a gente fecha (...) e quando o
 * cliente não fecha, ele vai apenas para a nossa base de dados, ele
 * vai ali como a pessoa que a gente não fechou e a gente vai tentar
 * entender essa métrica depois."
 *
 * Existia uma lista das seis últimas no pé do Funil, misturando ganhas
 * e perdidas em letra miúda. Aqui estão todas, separadas, e com a
 * conta que a lista não fazia: quantas de cada dez viram cliente, e
 * por quais motivos as outras foram embora.
 */
export default async function EncerradosPage() {
  const encerradas = await listarTodasEncerradas();

  const p = placar(encerradas);
  const motivos = motivosDaPerda(encerradas);
  const ganhas = encerradas.filter((e) => e.stage === "Fechado");
  const perdidas = encerradas.filter((e) => e.stage === "Perdido");

  return (
    <>
      <AreaHeader contexto="Tudo que já foi ganho e perdido" />

      <ComercialTabs />

      {encerradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-gray-900">
            Nenhuma oportunidade encerrada ainda
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Quando você ganhar ou perder uma, ela aparece aqui — com o motivo,
            no caso das perdidas.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              rotulo="Viraram cliente"
              valor={String(p.ganhas)}
              detalhe={`${formatarMoeda(p.ganho)} de mensalidade`}
            />
            <Stat
              rotulo="Não fecharam"
              valor={String(p.perdidas)}
              detalhe={`${formatarMoeda(p.perdido)} que não entrou`}
            />
            <Stat
              rotulo="Aproveitamento"
              valor={
                p.aproveitamento === null
                  ? "—"
                  : `${p.aproveitamento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              }
              detalhe="das que acabaram"
            />
            <Stat
              rotulo="Encerradas"
              valor={String(encerradas.length)}
              detalhe="no total"
            />
          </div>

          {motivos.length > 0 ? (
            <Secao titulo="Por que a gente perde">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                {/* Ranqueado por QUANTAS vezes, não por dinheiro: a
                    pergunta aqui é o padrão que se repete, e um
                    negócio grande perdido uma vez não é padrão. */}
                <BarrasRanqueadas
                  itens={motivos.map((m) => ({
                    rotulo: m.motivo,
                    valor: m.quantas,
                    detalhe: `${formatarMoeda(m.valor)} de mensalidade`,
                  }))}
                  cor="#b8301f"
                  formatar={(v) => (v === 1 ? "1 vez" : `${v} vezes`)}
                />
              </div>
            </Secao>
          ) : null}

          <div className="lg:columns-2 lg:gap-x-4">
            <Secao
              className="break-inside-avoid"
              titulo={`Viraram cliente (${ganhas.length})`}
              acao={
                ganhas.length > 0 ? (
                  <Link
                    href="/interno/administrativo/clientes"
                    className="font-medium text-gray-600 hover:underline"
                  >
                    Abrir os clientes
                  </Link>
                ) : undefined
              }
            >
              <Lista vazia="Nenhuma ganha ainda.">
                {ganhas.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5"
                  >
                    <Link
                      href={`/interno/comercial/${l.id}`}
                      className="min-w-0 flex-1 text-sm font-medium text-gray-900 hover:underline"
                    >
                      {l.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {l.channel} · {formatarData(l.encerrada_em)}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {formatarMoeda(l.estimated_monthly)}
                    </span>
                  </li>
                ))}
              </Lista>
            </Secao>

            <Secao
              className="break-inside-avoid"
              titulo={`Não fecharam (${perdidas.length})`}
            >
              <Lista vazia="Nenhuma perdida — por enquanto.">
                {perdidas.map((l) => (
                  <li key={l.id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <Link
                        href={`/interno/comercial/${l.id}`}
                        className="min-w-0 flex-1 text-sm font-medium text-gray-900 hover:underline"
                      >
                        {l.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {l.channel} · {formatarData(l.encerrada_em)}
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm tabular-nums text-gray-600">
                        {formatarMoeda(l.estimated_monthly)}
                      </span>
                    </div>
                    {l.lost_reason ? (
                      <p className="mt-0.5 text-xs text-gray-600">
                        {l.lost_reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </Lista>
            </Secao>
          </div>
        </>
      )}
    </>
  );
}

/** A moldura das duas listas, para as duas serem a mesma coisa. */
function Lista({
  vazia,
  children,
}: {
  vazia: string;
  children: React.ReactNode[];
}) {
  if (children.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
        {vazia}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {children}
    </ul>
  );
}
