import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { FinanceTabs } from "@/components/financeiro/finance-tabs";
import { MonthNav } from "@/components/financeiro/month-nav";
import { mesAtual, mesValido, anoDoMes } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

export const metadata = { title: "Relatórios" };

interface PageProps {
  searchParams: { mes?: string };
}

/**
 * A estante dos relatórios.
 *
 * Esta tela existe por causa de uma frase da Fran: "por isso que eu
 * pedi para você buscar outros sistemas, por isso que eu te mostrei
 * outros sistemas de como funcionam".
 *
 * Fui ver. Conta Azul, Nibo, Granatum, QuickBooks e Xero são
 * diferentes em quase tudo, menos em três lugares: um PAINEL de
 * abertura, uma tela de MOVIMENTO (o dinheiro entrando e saindo) e uma
 * estante de RELATÓRIOS. Ninguém tem uma aba chamada "Ano"; todo mundo
 * tem uma chamada "Relatórios", e o resumo do ano é o primeiro item
 * dentro dela.
 *
 * Antes dela, cinco telas do financeiro não estavam em lugar nenhum:
 * existiam, mas só se chegava por um link escondido no pé de outra
 * tela. "Se eu quiser ver o anual, eu não vou conseguir ver o anual."
 * Agora todas moram aqui, cada uma com a pergunta que responde.
 */
interface Relatorio {
  titulo: string;
  responde: string;
  href: string;
}

export default function RelatoriosPage({ searchParams }: PageProps) {
  const mes =
    searchParams.mes && mesValido(searchParams.mes) ? searchParams.mes : mesAtual();
  const ano = anoDoMes(mes);

  const RELATORIOS: Relatorio[] = [
    {
      titulo: `O ano de ${ano}`,
      responde: "Quanto entrou e quanto saiu em cada mês, por categoria",
      href: `/interno/financeiro/resumo-anual?mes=${mes}`,
    },
    {
      titulo: "O caixa mês a mês",
      responde: "Para onde o dinheiro está indo, do primeiro mês até hoje",
      href: `/interno/financeiro/fluxo-caixa?mes=${mes}`,
    },
    {
      titulo: "Quanto cada cliente rende",
      responde: "O que cada cliente paga e o que ele custa",
      href: `/interno/financeiro/rentabilidade?mes=${mes}`,
    },
    {
      titulo: "Impostos e contabilidade",
      responde: "O DAS e os honorários, mês a mês",
      href: `/interno/financeiro/impostos?mes=${mes}`,
    },
    {
      titulo: "Fechamento do mês",
      responde: "A folha do mês no formato de imprimir",
      href: `/interno/relatorio?mes=${mes}`,
    },
  ];

  return (
    <>
      <AreaHeader titulo="Financeiro" acao={<MonthNav mes={mes} />} />

      <FinanceTabs />

      <ul className="grid gap-3 sm:grid-cols-2">
        {RELATORIOS.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="block h-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className="block text-sm font-bold text-gray-900">
                {r.titulo}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-gray-500">
                {r.responde}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
