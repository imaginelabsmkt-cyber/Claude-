import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { Conta } from "@/components/interno/conta";
import { MetaDoAnoCartao } from "@/components/interno/meta-do-ano";
import type { FaturamentoAnual } from "@/lib/interno/ano";
import type { MetaDoAno } from "@/lib/interno/meta";
import { mesesDoAno, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

interface CartaoDoAnoProps {
  ano: FaturamentoAnual;
  meta: MetaDoAno | null;
  /** Mês em foco nas colunas (o mês que a tela está mostrando). */
  mesFoco: string;
}

/**
 * O ano inteiro num cartão: a conta, a meta e os dois gráficos.
 *
 * Vive num componente só porque a prévia visual desenha ESTE arquivo.
 * Antes a prévia tinha uma cópia do markup da página, e cópia
 * envelhece: já aconteceu de eu mostrar à Fran uma tela que não existia
 * mais — e, pior, com números inventados. Agora não tem cópia.
 */
export function CartaoDoAno({ ano, meta, mesFoco }: CartaoDoAnoProps) {
  const sobrou = ano.resultado >= 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      {/* A conta do ano numa linha só. O faturamento é o número
          grande porque é o que a Fran quer ver ao abrir; os outros
          dois estão ali para ele querer dizer alguma coisa. */}
      <Conta
        parcelas={[
          {
            rotulo: "Faturamento do ano",
            valor: ano.recebido,
            destaque: true,
          },
          { rotulo: "Saiu", valor: ano.pago, sinal: "−" },
          {
            rotulo: sobrou ? "Sobrou" : "Faltou",
            valor: Math.abs(ano.resultado),
            sinal: "=",
            alerta: !sobrou,
          },
        ]}
      />

      <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] text-gray-500">
        {ano.mesesFaturados > 0 ? (
          <span>
            {ano.mesesFaturados}{" "}
            {ano.mesesFaturados === 1 ? "mês faturado" : "meses faturados"},
            média de{" "}
            <strong className="font-semibold text-gray-700">
              {formatarMoeda(ano.mediaMensal)}
            </strong>
          </span>
        ) : null}
        {ano.melhorMes ? (
          <span>
            melhor mês{" "}
            <strong className="font-semibold text-gray-700">
              {rotuloMesCurto(ano.melhorMes.mes)}
            </strong>
            , {formatarMoeda(ano.melhorMes.valor)}
          </span>
        ) : null}
      </p>

      {meta ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <MetaDoAnoCartao meta={meta} />
        </div>
      ) : null}

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          O caixa no fim de cada mês
        </p>
        <GraficoCaixa pontos={ano.pontos} meses={mesesDoAno(ano.ano)} />
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          Entrou e saiu, mês a mês
        </p>
        <GraficoAno barras={ano.barras} mesFoco={mesFoco} />
      </div>
    </div>
  );
}
