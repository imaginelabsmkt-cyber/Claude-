import Link from "next/link";
import { rotuloMesCurto } from "@/lib/financeiro/meses";
import { formatarMoeda } from "@/lib/utils";
import type { PremissasAutomaticas } from "@/lib/metas/automaticas";
import type { RitmoParaAMeta } from "@/lib/metas/projecao";

/**
 * Os números da projeção que ninguém digita.
 *
 * A Fran: "essa projeção aqui, eu acho que eu já quero que seja
 * automático, de acordo com o comercial, com o financeiro, com a
 * administrativa, com tudo. As premissas, eu também já quero que
 * seja automático."
 *
 * Eram treze campos de digitar. Quatro deles o sistema já sabia e
 * perguntava assim mesmo, o que é pior do que não ter o campo: a
 * pessoa escreve um número, o sistema tem outro, e os dois convivem
 * até alguém reparar. Dois outros não eram usados em conta nenhuma:
 * dava para mudar o preço por vídeo do editor e a projeção não se
 * mexia.
 *
 * Agora cada um aparece com a ORIGEM e o caminho de onde se muda.
 * Travado aqui não é esconder: é dizer onde fica a torneira.
 */
export function PremissasDoSistema({
  calculadas,
  ritmo,
  mesDaMeta,
  clientesHoje,
  faturamentoDeHoje,
  custoFixoDoMes,
  mesDoCustoFixo,
}: {
  calculadas: PremissasAutomaticas;
  ritmo: RitmoParaAMeta;
  mesDaMeta: string;
  clientesHoje: number;
  faturamentoDeHoje: number;
  /** As contas fixas somadas no primeiro mês da projeção. */
  custoFixoDoMes: number;
  mesDoCustoFixo: string;
}) {
  const linhas: {
    rotulo: string;
    valor: string;
    origem: string;
    onde: string;
    href: string;
    alerta?: boolean;
  }[] = [
    {
      rotulo: "Clientes novos por mês",
      valor: ritmo.naoChega
        ? `mais de ${ritmo.quantosPorMes}`
        : String(ritmo.quantosPorMes),
      origem: ritmo.naoChega
        ? `nem ${ritmo.quantosPorMes} por mês chegam na meta`
        : ritmo.faltaComUmAMenos != null && ritmo.faltaComUmAMenos > 0
          ? `com ${ritmo.quantosPorMes - 1} por mês faltariam ${formatarMoeda(ritmo.faltaComUmAMenos)} até ${rotuloMesCurto(mesDaMeta)}`
          : `o menor ritmo que chega na meta até ${rotuloMesCurto(mesDaMeta)}`,
      onde: "muda a meta ou o mês dela",
      href: "#decisoes",
      alerta: ritmo.naoChega,
    },
    {
      rotulo: "Ticket do cliente novo",
      valor: formatarMoeda(calculadas.ticketNovo.valor),
      origem:
        calculadas.ticketNovo.origem === "funil"
          ? "média das oportunidades que estão em negociação"
          : calculadas.ticketNovo.comoMudar,
      onde: "Comercial, funil",
      href: "/interno/comercial/funil",
    },
    {
      rotulo: "Vídeos por cliente novo",
      valor: calculadas.videosPorCliente.valor.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      }),
      origem:
        calculadas.videosPorCliente.origem === "carteira"
          ? "média dos contratos de hoje"
          : calculadas.videosPorCliente.comoMudar,
      onde: "Administrativo, clientes",
      href: "/interno/administrativo/clientes",
      alerta: calculadas.videosPorCliente.origem !== "carteira",
    },
    {
      rotulo: "Carteira de hoje",
      valor: `${clientesHoje} clientes`,
      origem: `${formatarMoeda(faturamentoDeHoje)} por mês em mensalidades`,
      onde: "Administrativo, clientes",
      href: "/interno/administrativo/clientes",
    },
    {
      rotulo: `Contas fixas de ${rotuloMesCurto(mesDoCustoFixo)}`,
      valor: formatarMoeda(custoFixoDoMes),
      origem:
        custoFixoDoMes > 0
          ? "soma do que está valendo nesse mês, conta a conta"
          : "nenhuma conta fixa cadastrada, a projeção está otimista",
      onde: "Financeiro, contas fixas",
      href: "/interno/financeiro/recorrencias",
      alerta: custoFixoDoMes <= 0,
    },
    {
      rotulo: "DAS do MEI",
      valor: formatarMoeda(calculadas.dasDoMei.valor),
      origem:
        calculadas.dasDoMei.origem === "contas fixas"
          ? "é a conta fixa do DAS, e sai do custo quando a agência sair do MEI"
          : calculadas.dasDoMei.comoMudar,
      onde: "Financeiro, contas fixas",
      href: "/interno/financeiro/recorrencias",
      alerta: calculadas.dasDoMei.origem !== "contas fixas",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-4 py-2.5">
        <h3 className="text-sm font-bold text-gray-900">Vêm do sistema</h3>
        <p className="text-xs text-gray-500">
          Não se digitam aqui. Cada um muda na tela onde ele nasce.
        </p>
      </header>

      <ul className="divide-y divide-gray-100">
        {linhas.map((l) => (
          <li
            key={l.rotulo}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5"
          >
            <span className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <span className="block text-sm font-medium text-gray-900">
                {l.rotulo}
              </span>
              <span
                className={
                  "block text-xs " +
                  (l.alerta ? "font-medium text-alerta" : "text-gray-500")
                }
              >
                {l.origem}
              </span>
            </span>

            <span className="text-base font-bold tabular-nums text-gray-900">
              {l.valor}
            </span>

            <Link
              href={l.href}
              className="w-40 shrink-0 text-right text-xs font-medium text-gray-500 hover:underline"
            >
              {l.onde}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
