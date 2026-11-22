import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import {
  CaixaDoDia,
  type LinhaDoDia,
} from "@/components/comercial/caixa-do-dia";
import { listarLeads, listarTodasEncerradas } from "@/lib/data/comercial";
import { caixasDoDia, paraRetomar, quandoFalar } from "@/lib/comercial/hoje";
import { rotuloDaEtapa } from "@/lib/comercial/etapas";
import { hojeISO } from "@/lib/financeiro/meses";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hoje" };

/**
 * Hoje: o que fazer agora.
 *
 * Do protótipo da Vitória. É a primeira tela do comercial lá, e é a
 * que faltava aqui: o Funil mostra o desenho da coisa, mas não diz
 * por onde começar numa terça de manhã.
 *
 * Quatro caixas, não uma lista: quem passou da data, quem é para
 * hoje, quem é da semana, e quem já pode ser procurado de novo. Numa
 * lista só, o atrasado some no meio do que é para a semana que vem.
 */
export default async function HojePage() {
  const hoje = hojeISO();
  const [leads, encerradas] = await Promise.all([
    listarLeads(),
    listarTodasEncerradas(),
  ]);

  const caixas = caixasDoDia(
    leads.map((l) => ({
      id: l.id,
      name: l.name,
      stage: l.stage,
      next_contact_on: l.next_contact_on ?? null,
      estimated_monthly: Number(l.estimated_monthly ?? 0),
      temperature: l.temperature ?? null,
    })),
    hoje,
  );

  const retomar = paraRetomar(encerradas, hoje);

  const linha = (l: (typeof caixas.atrasados)[number]): LinhaDoDia => ({
    id: l.id,
    name: l.name,
    detalhe: rotuloDaEtapa(l.stage),
    quando: quandoFalar(l.next_contact_on!, hoje),
    atrasado: l.next_contact_on! < hoje,
    valor: l.estimated_monthly,
    temperatura: l.temperature,
  });

  return (
    <>
      <AreaHeader
        contexto="Hoje"
        acao={
          <Link
            href="/interno/comercial/funil"
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            Ver o funil
          </Link>
        }
      />

      <ComercialTabs />

      <CaixaDoDia
        titulo="Passou da data"
        sub="Contato combinado que ficou para trás. Comece por aqui."
        linhas={caixas.atrasados.map(linha)}
        vazio="Nada atrasado."
      />

      <CaixaDoDia
        titulo="Para hoje"
        sub="Contato combinado para hoje."
        linhas={caixas.hoje.map(linha)}
        vazio="Nada marcado para hoje."
      />

      <CaixaDoDia
        titulo="Próximos 7 dias"
        sub="Já dá para se programar."
        linhas={caixas.semana.map(linha)}
        vazio="Semana livre."
      />

      <CaixaDoDia
        titulo="Retomar"
        sub="Não fecharam há mais de 90 dias."
        linhas={retomar.map(({ lead, dias, motivo }) => ({
          id: lead.id,
          name: lead.name,
          quando: `há ${dias} dias`,
          valor: Number(lead.estimated_monthly ?? 0),
          temperatura: null,
          detalhe: motivo,
        }))}
        vazio="Ninguém para retomar agora."
      />
    </>
  );
}
