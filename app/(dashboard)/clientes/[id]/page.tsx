import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveToggle } from "@/components/clients/active-toggle";
import { EditableContentsTable } from "@/components/contents/editable-contents-table";
import {
  ContentMonthCalendar,
  type CelulaDia,
  type ItemCalendario,
} from "@/components/contents/content-month-calendar";
import { DeletePlanningButton } from "@/components/contents/delete-planning-button";
import { obterCliente } from "@/lib/data/clients";
import { listContents, listProfiles } from "@/lib/data/contents";
import { resumoProducao, inicioDaSemana, hojeISO } from "@/lib/rules/contents";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { mes?: string };
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Indicador compacto do mês. */
function Stat({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-lg border px-3 py-1.5",
        destaque ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white",
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        {rotulo}
      </span>
      <span className="text-sm font-bold text-gray-900">{valor}</span>
    </div>
  );
}

/** Painel operacional do cliente. */
export default async function ClientePage({ params, searchParams }: PageProps) {
  const cliente = await obterCliente(params.id);
  if (!cliente) notFound();

  const [todos, perfis] = await Promise.all([
    listContents({ client_id: cliente.id }),
    listProfiles(),
  ]);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "")
    ? searchParams.mes!
    : mesAtual;
  const [ano, mesN] = mes.split("-").map(Number);

  // Resumo compacto referente ao mês exibido (por mês de referência)
  const doMes = todos.filter((c) => c.reference_month === mes);
  const resumo = resumoProducao(doMes);
  const planejados = doMes.filter((c) => c.status !== "Cancelado").length;

  // Calendário: conteúdos pela DATA prevista dentro do mês exibido
  const primeiro = new Date(ano, mesN - 1, 1);
  const inicioGrade = inicioDaSemana(primeiro);
  const dias: CelulaDia[][] = [];
  for (let s = 0; s < 6; s++) {
    const semana: CelulaDia[] = [];
    for (let d = 0; d < 7; d++) {
      const data = addDays(inicioGrade, s * 7 + d);
      const iso = hojeISO(data);
      semana.push({
        iso,
        dia: data.getDate(),
        noMes: data.getMonth() === mesN - 1,
        hoje: iso === hojeISO(hoje),
      });
    }
    dias.push(semana);
  }

  const itensCalendario: ItemCalendario[] = todos
    .filter((c) => c.planned_date)
    .map((c) => ({
      id: c.id,
      title: c.title,
      format: c.format,
      iso: c.planned_date!,
    }));

  const tituloMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(primeiro);
  const mesDelta = (delta: number) => {
    const dt = new Date(ano, mesN - 1 + delta, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };

  const clienteOpt = [
    { id: cliente.id, name: cliente.name, color: cliente.color },
  ];

  return (
    <>
      <Link
        href="/clientes"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Voltar para clientes
      </Link>

      <PageHeader
        titulo={cliente.name}
        descricao={
          cliente.niche ? `Nicho: ${cliente.niche}` : "Painel operacional"
        }
        acao={
          <div className="flex items-center gap-2">
            {cliente.active ? (
              <Badge tom="verde">Ativo</Badge>
            ) : (
              <Badge tom="cinza">Inativo</Badge>
            )}
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button variante="secundaria">Editar</Button>
            </Link>
            <ActiveToggle id={cliente.id} ativo={cliente.active} />
          </div>
        }
      />

      {/* Calendário do mês */}
      <ContentMonthCalendar
        titulo={tituloMes}
        dias={dias}
        itens={itensCalendario}
        hrefAnterior={`/clientes/${cliente.id}?mes=${mesDelta(-1)}`}
        hrefProximo={`/clientes/${cliente.id}?mes=${mesDelta(1)}`}
      />

      {/* Resumo compacto do mês + ação de apagar planejamento */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Stat
            rotulo="Meta"
            destaque
            valor={
              cliente.monthly_goal != null
                ? `${planejados}/${cliente.monthly_goal}`
                : planejados
            }
          />
          <Stat rotulo="A gravar" valor={resumo.aguardandoGravacao} />
          <Stat rotulo="Em edição" valor={resumo.filaEdicao + resumo.emEdicao} />
          <Stat rotulo="Aprovação" valor={resumo.emAprovacao} />
          <Stat rotulo="Publicados" valor={resumo.publicados} />
        </div>
        <DeletePlanningButton
          clientId={cliente.id}
          mes={mes}
          quantidade={doMes.length}
          rotuloMes={tituloMes}
        />
      </div>

      {/* Planilha editável — ferramenta principal */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Conteúdos do cliente
          </h2>
          <span className="text-[11px] text-gray-400">
            Edite qualquer campo direto na linha — salva sozinho. Clique no
            título para abrir.
          </span>
        </div>
        <EditableContentsTable
          contents={todos}
          clientes={clienteOpt}
          perfis={perfis}
          mostrarCliente={false}
          vazioTitulo="Nenhum conteúdo"
          vazioDescricao="Este cliente ainda não tem conteúdos cadastrados."
        />
      </div>
    </>
  );
}
