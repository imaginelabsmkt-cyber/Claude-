/**
 * Prévia das telas novas do comercial: Hoje, Leads e clientes e
 * Como funciona.
 *
 * ATENÇÃO, regra deste arquivo: o funil da Favie não está no seed, e
 * aqui não há dado real para copiar. Os nomes são INVENTADOS e estão
 * marcados como exemplo. Quem olhar a imagem tem que saber na hora.
 *
 * Os três blocos renderizam os COMPONENTES DE VERDADE
 * (CaixaDoDia, TabelaDeLeads, a página de Como funciona inteira),
 * nunca uma cópia do markup, que envelhece e mente.
 */
import { describe, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/interno/comercial/hoje",
  useSearchParams: () => new URLSearchParams(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { CaixaDoDia } from "@/components/comercial/caixa-do-dia";
import { TabelaDeLeads } from "@/components/comercial/tabela-de-leads";
import ComoFuncionaPage from "@/app/interno/comercial/como-funciona/page";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import type { DaBase } from "@/lib/comercial/base";

const BASE: DaBase[] = [
  {
    id: "1",
    name: "Exemplo 1 (clínica)",
    channel: "Indicação",
    stage: "Negociação",
    temperature: "Quente",
    next_contact_on: "2026-11-25",
    estimated_monthly: 2400,
    client: null,
  },
  {
    id: "2",
    name: "Exemplo 2 (restaurante)",
    channel: "Tráfego pago",
    stage: "Reunião marcada",
    temperature: "Frio",
    next_contact_on: "2026-11-24",
    estimated_monthly: 1800,
    client: null,
  },
  {
    id: "3",
    name: "Exemplo 3 (loja)",
    channel: "Instagram orgânico",
    stage: "Fechado",
    temperature: "Morno",
    next_contact_on: null,
    estimated_monthly: 1500,
    client: { active: true },
  },
  {
    id: "4",
    name: "Exemplo 4 (advocacia)",
    channel: "Evento",
    stage: "Fechado",
    temperature: null,
    next_contact_on: null,
    estimated_monthly: 1300,
    client: { active: false },
  },
  {
    id: "5",
    name: "Exemplo 5 (estúdio)",
    channel: "Social selling",
    stage: "Perdido",
    temperature: "Frio",
    next_contact_on: null,
    estimated_monthly: 900,
    client: null,
  },
];

function Aviso() {
  return (
    <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
      PRÉVIA, os nomes são inventados. O desenho é o de verdade.
    </p>
  );
}

describe("prévia: as telas novas do comercial", () => {
  it("desenha", () => {
    const html = renderToStaticMarkup(
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Aviso />

        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          Hoje
        </h2>
        <ComercialTabs />
        <CaixaDoDia
          titulo="Passou da data"
          sub="Contato combinado que ficou para trás. Comece por aqui."
          linhas={[
            {
              id: "1",
              name: "Exemplo 1 (clínica)",
              detalhe: "Negociação",
              quando: "atrasado 3 dias",
              atrasado: true,
              valor: 2400,
              temperatura: "Quente",
            },
            {
              id: "2",
              name: "Exemplo 2 (restaurante)",
              detalhe: "Em conversa",
              quando: "atrasado 1 dia",
              atrasado: true,
              valor: 1800,
              temperatura: "Frio",
            },
          ]}
          vazio="Nada atrasado."
        />
        <CaixaDoDia
          titulo="Para hoje"
          sub="Contato combinado para hoje."
          linhas={[
            {
              id: "3",
              name: "Exemplo 3 (loja)",
              detalhe: "Proposta apresentada",
              quando: "hoje",
              valor: 1500,
              temperatura: "Morno",
            },
          ]}
          vazio="Nada marcado para hoje."
        />
        <CaixaDoDia
          titulo="Próximos 7 dias"
          sub="Já dá para se programar."
          linhas={[]}
          vazio="Semana livre."
        />
        <CaixaDoDia
          titulo="Retomar"
          sub="Não fecharam há mais de 90 dias."
          linhas={[
            {
              id: "5",
              name: "Exemplo 5 (estúdio)",
              detalhe: "Achou caro",
              quando: "há 118 dias",
              valor: 900,
              temperatura: null,
            },
          ]}
          vazio="Ninguém para retomar agora."
        />

        <h2 className="mb-2 mt-10 text-xs font-bold uppercase tracking-widest text-gray-400">
          Leads e clientes
        </h2>
        <TabelaDeLeads linhas={BASE} />

        <h2 className="mb-2 mt-10 text-xs font-bold uppercase tracking-widest text-gray-400">
          Como funciona
        </h2>
        <ComoFuncionaPage />
      </div>,
    );
    writeFileSync(
      process.env.SAIDA_COMERCIAL_TELAS!,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="app.css"></head>
<body data-area="comercial">${html}</body></html>`,
    );
  });
});
