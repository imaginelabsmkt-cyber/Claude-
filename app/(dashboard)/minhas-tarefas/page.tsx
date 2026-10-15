import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MinhasTarefasLista,
  type GrupoLista,
  type ItemLista,
  type SecaoLista,
} from "@/components/tarefas/minhas-tarefas-lista";
import { getAuthContext } from "@/lib/auth";
import { listContents, listAllClients } from "@/lib/data/contents";
import { listPlannings } from "@/lib/data/plannings";
import { listDemands } from "@/lib/data/demands";
import {
  classificarGravacao,
  estaGravado,
  ehArte,
  hojeISO,
  papelResponsavel,
  prazoPrincipal,
  statusAoConcluir,
  type PapelDemanda,
} from "@/lib/rules/contents";
import { PLANNING_ENTREGUE } from "@/types";
import type { Content, Planning } from "@/types";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Grupo {
  titulo: string;
  itens: Content[];
}

const CRIACAO_ARTE = ["Roteiro pronto", "Fila de edição", "Em edição"];
const PRONTOS_POSTAR = ["Aprovado", "Agendado"];

/** Grupos de tarefas do PLANEJAMENTO (Vitória): roteiros e artes. */
function gruposPlanner(contents: Content[]): Grupo[] {
  const meus = contents.filter((c) => papelResponsavel(c) === "planner");
  return [
    {
      titulo: "Planejamentos pendentes",
      itens: meus.filter((c) => c.status === "Planejamento" && !c.script_url),
    },
    {
      titulo: "Roteiros em criação",
      itens: meus.filter((c) => c.status === "Planejamento" && !!c.script_url),
    },
    {
      titulo: "Artes a criar",
      itens: meus.filter(
        (c) => ehArte(c.format) && CRIACAO_ARTE.includes(c.status),
      ),
    },
    {
      titulo: "Ajustes de arte",
      itens: meus.filter((c) => ehArte(c.format) && c.status === "Ajustes"),
    },
    {
      titulo: "Vídeos a revisar",
      itens: meus.filter((c) => c.status === "Revisão interna"),
    },
    {
      titulo: "Aprovações de clientes",
      itens: meus.filter((c) => c.status === "Aprovação do cliente"),
    },
    {
      titulo: "Prontos para postar",
      itens: meus.filter((c) => PRONTOS_POSTAR.includes(c.status)),
    },
  ];
}

/** Grupos de tarefas da PRODUÇÃO (Fran): gravações, fotos e edição de vídeo. */
function gruposProducer(contents: Content[], hoje: Date): Grupo[] {
  const meus = contents.filter((c) => papelResponsavel(c) === "producer");
  const paraGravar = meus.filter(
    (c) =>
      c.requires_recording && !estaGravado(c.status) && c.status !== "Cancelado",
  );
  const fotosArte = contents.filter(
    (c) =>
      ehArte(c.format) &&
      c.requires_recording &&
      !estaGravado(c.status) &&
      c.status !== "Cancelado",
  );
  return [
    { titulo: "Fotos a produzir (artes)", itens: fotosArte },
    {
      titulo: "Produções da semana",
      itens: paraGravar.filter((c) => classificarGravacao(c, hoje) === "semana"),
    },
    {
      titulo: "Próximas gravações",
      itens: paraGravar.filter((c) => classificarGravacao(c, hoje) !== "semana"),
    },
    {
      titulo: "Vídeos em edição",
      itens: meus.filter((c) => c.status === "Em edição"),
    },
    {
      titulo: "Ajustes solicitados",
      itens: meus.filter((c) => c.status === "Ajustes"),
    },
    {
      titulo: "Fila de edição",
      itens: meus.filter((c) => c.status === "Fila de edição"),
    },
    {
      titulo: "Conteúdos gravados",
      itens: meus.filter((c) => c.status === "Gravado"),
    },
    {
      titulo: "Artes a revisar",
      itens: meus.filter((c) => c.status === "Revisão interna"),
    },
  ];
}

export default async function MinhasTarefasPage() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const hojeStr = hojeISO(hoje);

  const [ctx, contents, clientes, plannings, demands] = await Promise.all([
    getAuthContext(),
    listContents({}),
    listAllClients(),
    listPlannings(mesAtual),
    listDemands(),
  ]);

  const clientesById = new Map(clientes.map((c) => [c.id, c]));

  // Demandas atribuídas a mim (todas), agrupadas por status.
  const minhasDemandas = demands.filter(
    (d) =>
      !!ctx.profile?.id && (d.assignee_ids ?? []).includes(ctx.profile.id),
  );
  const porPrazo = (
    a: (typeof minhasDemandas)[number],
    b: (typeof minhasDemandas)[number],
  ) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
  const demPendentes = minhasDemandas.filter((d) => d.status !== "Feita");
  const demFeitas = minhasDemandas
    .filter((d) => d.status === "Feita")
    .sort((a, b) => porPrazo(b, a));
  const demFeitasMostrar = demFeitas.slice(0, 15);
  const feitasExtras = demFeitas.length - demFeitasMostrar.length;

  // Demandas pendentes agrupadas por MÊS da entrega. Atrasadas no topo; meses a
  // 2+ de distância (ex.: ano que vem) começam recolhidos, pra não poluir.
  const idxMes = (s: string) => {
    const [y, m] = s.split("-").map(Number);
    return y * 12 + (m - 1);
  };
  const idxAtual = hoje.getFullYear() * 12 + hoje.getMonth();
  const rotuloMes = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const s = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(new Date(y, m - 1, 1));
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const demAtrasadas = demPendentes
    .filter((d) => d.due_date && d.due_date < hojeStr)
    .sort(porPrazo);
  const demSemData = demPendentes.filter((d) => !d.due_date);
  const demFuturas = demPendentes
    .filter((d) => d.due_date && d.due_date >= hojeStr)
    .sort(porPrazo);
  const mesesMap = new Map<string, typeof demFuturas>();
  for (const d of demFuturas) {
    const k = d.due_date!.slice(0, 7);
    mesesMap.set(k, [...(mesesMap.get(k) ?? []), d]);
  }

  const role = (ctx.profile?.role ?? "admin") as PapelDemanda | "admin";
  const nome = ctx.profile?.name ?? "você";

  // Planejamentos a FAZER (planner): reunião já aconteceu e ainda não entregou.
  const planejamentosAFazer: Planning[] =
    role === "producer"
      ? []
      : plannings
          .filter(
            (p) =>
              p.meeting_date != null &&
              p.meeting_date <= hojeStr &&
              !PLANNING_ENTREGUE.includes(p.status),
          )
          .sort((a, b) =>
            (a.delivery_deadline ?? "9999-99-99").localeCompare(
              b.delivery_deadline ?? "9999-99-99",
            ),
          );
  const etiquetaPlanej = (status: string) =>
    status === "Em criação" ? "em criação" : "aguardando planejamento";

  const blocos: { rotulo: string; grupos: Grupo[] }[] =
    role === "planner"
      ? [{ rotulo: "", grupos: gruposPlanner(contents) }]
      : role === "producer"
        ? [{ rotulo: "", grupos: gruposProducer(contents, hoje) }]
        : [
            { rotulo: "Planejamento e artes", grupos: gruposPlanner(contents) },
            { rotulo: "Produção e edição", grupos: gruposProducer(contents, hoje) },
          ];

  const descricao =
    role === "admin"
      ? "Visão completa (planejamento, artes e produção)"
      : `Tarefas de ${nome}`;

  // --- Monta as seções da lista (com caixinha de concluir) ---
  const secoes: SecaoLista[] = [];

  const itemDemanda = (d: (typeof minhasDemandas)[number]): ItemLista => {
    const cli = d.client_id ? clientesById.get(d.client_id) : null;
    const atrasada =
      d.status !== "Feita" && !!d.due_date && d.due_date < hojeStr;
    return {
      id: d.id,
      tipo: "demanda",
      titulo: d.title,
      cliente: cli?.name ?? "Interna (FAVIE)",
      cor: cli?.color ?? null,
      meta: d.due_date
        ? `${atrasada ? "Atrasada · " : ""}${formatarData(d.due_date)}`
        : "sem data",
      alerta: atrasada,
      feito: d.status === "Feita",
      concluivel: true,
      proximo: null,
      dataEditavel: true,
      dataISO: d.due_date ?? null,
      href: "/demandas",
    };
  };

  if (minhasDemandas.length > 0) {
    const gruposDem: GrupoLista[] = [];
    if (demAtrasadas.length > 0) {
      gruposDem.push({ rotulo: "Atrasadas", itens: demAtrasadas.map(itemDemanda) });
    }
    for (const ym of [...mesesMap.keys()].sort()) {
      gruposDem.push({
        rotulo: rotuloMes(ym),
        itens: (mesesMap.get(ym) ?? []).map(itemDemanda),
        inicialFechado: idxMes(ym) - idxAtual >= 2,
      });
    }
    if (demSemData.length > 0) {
      gruposDem.push({
        rotulo: "Sem data marcada",
        itens: demSemData.map(itemDemanda),
      });
    }
    if (demFeitas.length > 0) {
      gruposDem.push({
        rotulo: "Concluídas",
        itens: demFeitasMostrar.map(itemDemanda),
        inicialFechado: true,
        extra:
          feitasExtras > 0
            ? { label: `+${feitasExtras} concluídas — ver todas`, href: "/demandas" }
            : undefined,
      });
    }
    secoes.push({
      titulo: "Minhas demandas",
      href: "/demandas",
      contador: demPendentes.length,
      grupos: gruposDem,
    });
  }

  if (planejamentosAFazer.length > 0) {
    secoes.push({
      titulo: "Planejamentos a fazer",
      contador: planejamentosAFazer.length,
      grupos: [
        {
          rotulo: "Fila de entrega",
          itens: planejamentosAFazer.map((p, i): ItemLista => {
            const cli = clientesById.get(p.client_id);
            return {
              id: p.id,
              tipo: "conteudo",
              titulo: `${i + 1}º · Fazer planejamento (${etiquetaPlanej(p.status)})`,
              cliente: cli?.name ?? "Cliente",
              cor: cli?.color ?? null,
              meta: p.delivery_deadline
                ? `Entregar até ${formatarData(p.delivery_deadline)}`
                : `Reunião: ${formatarData(p.meeting_date)}`,
              alerta: false,
              feito: false,
              concluivel: false,
              proximo: null,
              href: "/planejamentos",
            };
          }),
        },
      ],
    });
  }

  for (const bloco of blocos) {
    const grupos = bloco.grupos
      .filter((g) => g.itens.length > 0)
      .map((g) => ({
        rotulo: g.titulo,
        itens: g.itens.map((c): ItemLista => {
          const cli = clientesById.get(c.client_id);
          const prazo = prazoPrincipal(c);
          const proximo = statusAoConcluir(c.status);
          return {
            id: c.id,
            tipo: "conteudo",
            titulo: c.title,
            cliente: cli?.name ?? "·",
            cor: cli?.color ?? null,
            meta: prazo ? `Prazo: ${formatarData(prazo)}` : null,
            alerta: false,
            feito: false,
            concluivel: !!proximo,
            proximo,
            href: `/conteudos/${c.id}`,
          };
        }),
      }));
    if (grupos.length > 0) {
      secoes.push({ titulo: bloco.rotulo || "Minhas etapas", grupos });
    }
  }

  return (
    <>
      <PageHeader titulo="Minhas tarefas" descricao={descricao} icone="tarefas" tom="indigo" />

      {secoes.length === 0 ? (
        <EmptyState
          titulo="Nada pendente por aqui"
          descricao="Quando houver tarefas nas suas etapas, elas aparecerão aqui."
        />
      ) : (
        <MinhasTarefasLista secoes={secoes} />
      )}
    </>
  );
}
