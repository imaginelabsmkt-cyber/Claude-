import { GraficoAno } from "@/components/interno/grafico-ano";
import { GraficoCaixa } from "@/components/interno/grafico-caixa";
import { MetaDoAnoCartao } from "@/components/interno/meta-do-ano";
import type { FaturamentoAnual } from "@/lib/interno/ano";
import type { MetaDoAno } from "@/lib/interno/meta";
import { mesesDoAno, rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";

/**
 * Um número da conta do ano, dentro da conta.
 *
 * "Saiu R$ 108.770,62" sozinho não quer dizer nada — a Fran falou isso
 * com todas as letras: "saiu e sobrou, em qual contexto? Lá na planilha
 * estava dentro de um contexto, aqui a gente não tem contexto nenhum".
 *
 * Na planilha dela o contexto é a conta: TOTAL RECEITAS, TOTAL
 * DESPESAS, Resultado líquido, um debaixo do outro, e dá para ver que
 * um vem do outro. Aqui é a mesma conta, escrita na horizontal, com o
 * menos e o igual no meio.
 */
function Parcela({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {rotulo}
      </p>
      <p
        className={
          "mt-0.5 text-xl font-bold tabular-nums " +
          (alerta ? "text-alerta" : "text-gray-900")
        }
      >
        {formatarMoeda(valor)}
      </p>
    </div>
  );
}

function Sinal({ children }: { children: string }) {
  return (
    <span aria-hidden className="pb-0.5 text-lg font-bold text-gray-400">
      {children}
    </span>
  );
}

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
      {/* A conta do ano numa linha só, com o menos e o igual à vista.
          O faturamento é o número grande porque é o que a Fran quer
          ver ao abrir; os outros dois estão ali para ele querer dizer
          alguma coisa. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Faturamento do ano
          </p>
          <p className="mt-0.5 text-4xl font-bold leading-none tabular-nums tracking-tight text-gray-900 sm:text-5xl">
            {formatarMoeda(ano.recebido)}
          </p>
        </div>
        <Sinal>−</Sinal>
        <Parcela rotulo="Saiu" valor={ano.pago} />
        <Sinal>=</Sinal>
        <Parcela
          rotulo={sobrou ? "Sobrou" : "Faltou"}
          valor={Math.abs(ano.resultado)}
          alerta={!sobrou}
        />
      </div>

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
