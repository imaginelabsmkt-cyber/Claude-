import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ArtesBoard } from "@/components/contents/artes-board";
import { EmptyState } from "@/components/shared/empty-state";
import { listContents, listClientOptions } from "@/lib/data/contents";
import { estaAtrasado } from "@/lib/rules/contents";

export const dynamic = "force-dynamic";

const FORMATOS_ARTE = ["Carrossel", "Post estático"];

interface PageProps {
  searchParams: { mes?: string };
}

function Stat({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </span>
      <span className="text-sm font-bold text-gray-900">{valor}</span>
    </div>
  );
}

/** Entrega de artes e carrosséis: quadro por fase, arrastar para avançar. */
export default async function ArtesPage({ searchParams }: PageProps) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const filtrarMes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "");
  const mes = filtrarMes ? searchParams.mes! : mesAtual;

  const [todos, clientes] = await Promise.all([
    listContents({}),
    listClientOptions(),
  ]);

  const artes = todos.filter(
    (c) =>
      c.format != null &&
      FORMATOS_ARTE.includes(c.format) &&
      c.status !== "Cancelado" &&
      c.status !== "Pausado" &&
      (!filtrarMes || c.reference_month === mes),
  );

  const atrasadas = artes.filter(
    (c) => c.status !== "Publicado" && estaAtrasado(c),
  ).length;

  const [ano, mesN] = mes.split("-").map(Number);
  const tituloMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mesN - 1, 1));
  const mesDelta = (d: number) => {
    const dt = new Date(ano, mesN - 1 + d, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <>
      <PageHeader
        titulo="Artes"
        descricao="Entrega de artes e carrosséis. Arraste para avançar a etapa."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/artes?mes=${mesDelta(-1)}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
          <span className="text-base font-bold capitalize text-gray-900">
            {tituloMes}
          </span>
          <Link
            href={`/artes?mes=${mesDelta(1)}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Próximo →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Stat rotulo="Artes no mês" valor={artes.length} />
          <Stat rotulo="Atrasadas" valor={atrasadas} />
        </div>
      </div>

      {artes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma arte ou carrossel"
          descricao="Conteúdos de formato Carrossel ou Post estático aparecem aqui."
        />
      ) : (
        <ArtesBoard contents={artes} clientes={clientes} />
      )}
    </>
  );
}
