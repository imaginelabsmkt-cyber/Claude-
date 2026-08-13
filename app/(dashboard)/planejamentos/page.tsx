import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  PlanningsTable,
  type LinhaPlanejamento,
} from "@/components/plannings/plannings-table";
import { listClientOptions } from "@/lib/data/contents";
import { listPlannings } from "@/lib/data/plannings";
import { hojeISO } from "@/lib/rules/contents";
import { PLANNING_ENTREGUE } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { mes?: string };
}

function Stat({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  const alerta = destaque && valor > 0;
  return (
    <div
      className={
        "flex items-baseline gap-2 rounded-lg border px-3 py-1.5 " +
        (alerta ? "border-red-200 bg-red-50" : "border-gray-200 bg-white")
      }
    >
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </span>
      <span
        className={
          "text-sm font-bold " + (alerta ? "text-red-600" : "text-gray-900")
        }
      >
        {valor}
      </span>
    </div>
  );
}

/** Aba de Planejamentos: criação do planejamento mensal por cliente. */
export default async function PlanejamentosPage({ searchParams }: PageProps) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "")
    ? searchParams.mes!
    : mesAtual;
  const [ano, mesN] = mes.split("-").map(Number);
  const hojeStr = hojeISO(hoje);

  const [clientes, plannings] = await Promise.all([
    listClientOptions(),
    listPlannings(mes),
  ]);
  const porCliente = new Map(plannings.map((p) => [p.client_id, p]));

  const linhas: LinhaPlanejamento[] = clientes.map((c) => ({
    clientId: c.id,
    clienteNome: c.name,
    cor: c.color,
    planning: porCliente.get(c.id) ?? null,
  }));

  // Resumo
  const aMarcar = linhas.filter(
    (l) => (l.planning?.status ?? "Marcar reunião") === "Marcar reunião",
  ).length;
  const atrasados = linhas.filter((l) => {
    const p = l.planning;
    return (
      p?.delivery_deadline &&
      p.delivery_deadline < hojeStr &&
      !PLANNING_ENTREGUE.includes(p.status)
    );
  }).length;
  const aprovados = linhas.filter(
    (l) => l.planning?.status === "Aprovado",
  ).length;

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
        titulo="Planejamentos"
        descricao="Reunião, criação e entrega do planejamento de cada cliente."
        icone="planejamentos"
        tom="rosa"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/planejamentos?mes=${mesDelta(-1)}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
          <span className="text-base font-bold capitalize text-gray-900">
            {tituloMes}
          </span>
          <Link
            href={`/planejamentos?mes=${mesDelta(1)}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Próximo →
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Stat rotulo="A marcar reunião" valor={aMarcar} />
          <Stat rotulo="Atrasados" valor={atrasados} destaque />
          <Stat rotulo="Aprovados" valor={aprovados} />
        </div>
      </div>

      <PlanningsTable mes={mes} hojeISO={hojeStr} linhas={linhas} />
    </>
  );
}
