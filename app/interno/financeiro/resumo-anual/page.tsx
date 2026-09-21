import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { Card } from "@/components/ui/card";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { obterResumoAnual, type LinhaResumoAnual } from "@/lib/data/financeiro";
import { anoDoMes, mesAtual, mesValido, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda, formatarPercentual } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string; ano?: string };
}

/** Célula monetária da matriz (valores zerados ficam discretos). */
function Celula({ valor, cor }: { valor: number; cor?: string }) {
  return (
    <td
      className={
        "whitespace-nowrap px-3 py-2 text-right tabular-nums " +
        (valor === 0 ? "text-gray-300" : (cor ?? "text-gray-700"))
      }
    >
      {valor === 0 ? "—" : formatarMoeda(valor)}
    </td>
  );
}

/**
 * Resumo anual: uma coluna por mês, uma linha por categoria — a
 * consolidação que na planilha dependia de fórmulas apontando para cada
 * aba (e que quebravam quando uma linha era inserida).
 */
export default async function ResumoAnualPage({ searchParams }: PageProps) {
  const mesFoco =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();
  const ano = searchParams.ano ? Number(searchParams.ano) : anoDoMes(mesFoco);

  const resumo = await obterResumoAnual(ano);

  const linha = (l: LinhaResumoAnual, cor: string) => (
    <tr key={l.categoriaId} className="hover:bg-gray-50">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-normal text-gray-700 hover:bg-gray-50"
      >
        {l.nome}
      </th>
      {l.porMes.map((valor, i) => (
        <Celula key={resumo.meses[i]} valor={valor} cor={cor} />
      ))}
      <td className="whitespace-nowrap bg-gray-50 px-3 py-2 text-right font-semibold tabular-nums text-gray-900">
        {formatarMoeda(l.total)}
      </td>
    </tr>
  );

  const totalLinha = (
    rotulo: string,
    valores: number[],
    total: number,
    classe: string,
  ) => (
    <tr className={classe}>
      <th
        scope="row"
        className={"sticky left-0 z-10 px-3 py-2 text-left text-sm font-bold " + classe}
      >
        {rotulo}
      </th>
      {valores.map((valor, i) => (
        <td
          key={resumo.meses[i]}
          className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums"
        >
          {valor === 0 ? "—" : formatarMoeda(valor)}
        </td>
      ))}
      <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">
        {formatarMoeda(total)}
      </td>
    </tr>
  );

  return (
    <>
      <AreaHeader
        titulo={`Resumo anual ${ano}`}
        contexto="Todos os meses"
        acao={
          <div className="flex gap-2">
            <Link
              href={`/interno/financeiro/resumo-anual?ano=${ano - 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {ano - 1}
            </Link>
            <Link
              href={`/interno/financeiro/resumo-anual?ano=${ano + 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {ano + 1}
            </Link>
          </div>
        }
      />

      <FinanceTabs />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Receitas no ano
          </p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {formatarMoeda(resumo.totais.receitas)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Despesas no ano
          </p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatarMoeda(resumo.totais.despesas)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Resultado do ano
          </p>
          <p
            className={
              "mt-1 text-xl font-bold " +
              (resumo.totais.resultado >= 0 ? "text-green-700" : "text-red-600")
            }
          >
            {formatarMoeda(resumo.totais.resultado)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Margem {formatarPercentual(resumo.totais.margem)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Saldo em caixa (dez)
          </p>
          <p
            className={
              "mt-1 text-xl font-bold " +
              (resumo.totais.saldoFinal >= 0 ? "text-green-700" : "text-red-600")
            }
          >
            {formatarMoeda(resumo.totais.saldoFinal)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left font-medium"
                >
                  Categoria
                </th>
                {resumo.meses.map((mes) => (
                  <th key={mes} scope="col" className="px-3 py-3 text-right font-medium">
                    <Link href={`/interno/financeiro?mes=${mes}`} className="hover:text-brand-700">
                      {rotuloMesCurto(mes)}
                    </Link>
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              <tr className="bg-green-50">
                <th
                  colSpan={resumo.meses.length + 2}
                  scope="colgroup"
                  className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-green-800"
                >
                  💰 Receitas
                </th>
              </tr>
              {resumo.receitas.map((l) => linha(l, "text-gray-700"))}
              {totalLinha(
                "Total de receitas",
                resumo.serie.map((r) => r.receitas),
                resumo.totais.receitas,
                "bg-green-50 text-green-800",
              )}

              <tr className="bg-red-50">
                <th
                  colSpan={resumo.meses.length + 2}
                  scope="colgroup"
                  className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-red-800"
                >
                  📤 Despesas
                </th>
              </tr>
              {resumo.despesas.map((l) => linha(l, "text-gray-700"))}
              {totalLinha(
                "Total de despesas",
                resumo.serie.map((r) => r.despesas),
                resumo.totais.despesas,
                "bg-red-50 text-red-800",
              )}

              <tr className="bg-gray-100">
                <th
                  colSpan={resumo.meses.length + 2}
                  scope="colgroup"
                  className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-700"
                >
                  📊 Resultado
                </th>
              </tr>
              {totalLinha(
                "Resultado líquido",
                resumo.serie.map((r) => r.resultado),
                resumo.totais.resultado,
                "bg-white text-gray-900",
              )}
              {totalLinha(
                "Saldo acumulado",
                resumo.serie.map((r) => r.saldoFinal),
                resumo.totais.saldoFinal,
                "bg-brand-50 text-brand-800",
              )}
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-normal text-gray-700"
                >
                  Margem líquida
                </th>
                {resumo.serie.map((r) => (
                  <td
                    key={r.mes}
                    className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600"
                  >
                    {r.receitas ? formatarPercentual(r.margem) : "—"}
                  </td>
                ))}
                <td className="whitespace-nowrap bg-gray-50 px-3 py-2 text-right font-semibold tabular-nums text-gray-900">
                  {formatarPercentual(resumo.totais.margem)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-gray-500">
        Os valores exibidos são os <strong>realizados</strong> (lançamentos
        marcados como pagos). Pendências aparecem no painel do mês, em
        &quot;a receber&quot; e &quot;a pagar&quot;.
      </p>
    </>
  );
}
