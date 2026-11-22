import Link from "next/link";
import { AreaHeader } from "@/components/interno/area-header";
import { ComercialTabs } from "@/components/comercial/comercial-tabs";
import { TabelaDeLeads } from "@/components/comercial/tabela-de-leads";
import { Stat } from "@/components/interno/stat";
import { listarLeads } from "@/lib/data/comercial";
import {
  SITUACOES,
  contar,
  filtrar,
  ordenar,
  type DaBase,
} from "@/lib/comercial/base";
import {
  LEAD_CHANNEL_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
} from "@/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads e clientes" };

interface PageProps {
  searchParams: {
    q?: string;
    origem?: string;
    temp?: string;
    sit?: string;
  };
}

/**
 * Leads e clientes: todo mundo que já passou pelo comercial.
 *
 * Do protótipo da Vitória. É a tela que faltava: o Funil mostra só
 * quem está em jogo, e "Encerradas" mostrava só quem já acabou. Não
 * havia um lugar com TODO MUNDO, filtrável.
 *
 * Os filtros andam pela barra de endereço (um formulário comum, sem
 * JavaScript): o estado da tela cabe no link, e o link pode ser
 * salvo e mandado para a outra sócia.
 */
export default async function LeadsPage({ searchParams }: PageProps) {
  const todos = await listarLeads();

  const base: (DaBase & { id: string })[] = todos.map((l) => ({
    id: l.id,
    name: l.name,
    channel: l.channel,
    stage: l.stage,
    temperature: l.temperature ?? null,
    next_contact_on: l.next_contact_on ?? null,
    estimated_monthly: Number(l.estimated_monthly ?? 0),
    client: l.client ? { active: l.client.active } : null,
  }));

  const c = contar(base);
  const lista = ordenar(
    filtrar(base, {
      busca: searchParams.q,
      origem: searchParams.origem,
      temperatura: searchParams.temp,
      situacao: searchParams.sit,
    }),
  );

  const campo =
    "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900";

  return (
    <>
      <AreaHeader
        contexto="Leads e clientes"
        acao={
          <Link
            href="/interno/comercial/novo"
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            Nova oportunidade
          </Link>
        }
      />

      <ComercialTabs />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SITUACOES.map((s) => (
          <Stat key={s} rotulo={s} valor={String(c[s])} />
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className={campo + " min-w-0 flex-1 basis-48"}
        />
        <select
          name="origem"
          defaultValue={searchParams.origem ?? ""}
          aria-label="Origem"
          className={campo}
        >
          <option value="">Toda origem</option>
          {LEAD_CHANNEL_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          name="temp"
          defaultValue={searchParams.temp ?? ""}
          aria-label="Temperatura"
          className={campo}
        >
          <option value="">Toda temperatura</option>
          {LEAD_TEMPERATURE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          name="sit"
          defaultValue={searchParams.sit ?? ""}
          aria-label="Situação"
          className={campo}
        >
          <option value="">Toda situação</option>
          {SITUACOES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-area px-4 py-1.5 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
        <Link
          href="/interno/comercial/leads"
          className="px-1 text-sm text-gray-500 hover:underline"
        >
          Limpar
        </Link>
      </form>

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {base.length === 0
            ? "Nenhuma oportunidade cadastrada ainda."
            : "Nenhum resultado com esses filtros."}
        </p>
      ) : (
        <TabelaDeLeads linhas={lista} />
      )}
    </>
  );
}
