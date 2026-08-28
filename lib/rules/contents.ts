import type { Content, ContentStatus } from "@/types";

/**
 * =============================================================
 * CAMADA CENTRAL DE REGRAS DE NEGÓCIO DOS CONTEÚDOS
 * =============================================================
 * Fonte ÚNICA das regras derivadas de um conteúdo. Componentes NÃO devem
 * reimplementar estas regras — sempre importar daqui.
 *
 * Calcula: próxima ação, responsável atual, prazo principal, se está
 * atrasado e o motivo da prioridade. Coberto por testes em
 * `contents.test.ts`.
 * =============================================================
 */

// -------------------------------------------------------------
// Ordem do pipeline (para comparar etapas)
// -------------------------------------------------------------
/**
 * Índice de cada status no fluxo linear de produção. Pausado e Cancelado
 * ficam fora do fluxo (-1): são estados transversais.
 */
export const ORDEM_STATUS: Record<ContentStatus, number> = {
  Planejamento: 0,
  "Roteiro pronto": 1,
  "Aguardando gravação": 2,
  Gravado: 3,
  "Fila de edição": 4,
  "Em edição": 5,
  "Revisão interna": 6,
  "Aprovação do cliente": 7,
  Ajustes: 8,
  Aprovado: 9,
  Agendado: 10,
  Publicado: 11,
  Pausado: -1,
  Cancelado: -1,
};

/** Janela (em dias) para considerar uma data fixa "próxima". */
export const JANELA_DATA_FIXA_DIAS = 3;

/** Formatos tratados como arte/design (Carrossel, Post estático). */
export const FORMATOS_ARTE = ["Carrossel", "Post estático"];

/** É um conteúdo de arte/design (Carrossel, Post estático)? */
export function ehArte(format: string | null | undefined): boolean {
  return format != null && FORMATOS_ARTE.includes(format);
}

/**
 * É a demanda de CAPA de um vídeo (arte gerada automaticamente ao editar o
 * vídeo)? A capa NÃO tem roteiro nem gravação: é só a arte da capa (Vitória),
 * com o título que vai nela. Identificada por ter cover_source_id.
 */
export function ehCapa(
  content: { cover_source_id?: string | null } | null | undefined,
): boolean {
  return content?.cover_source_id != null;
}

// -------------------------------------------------------------
// Utilitários de data (comparação por dia, sem hora)
// -------------------------------------------------------------
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Converte "YYYY-MM-DD" em Date local (ou null). */
export function parseData(s: string | null): Date | null {
  if (!s) return null;
  const [ano, mes, dia] = s.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

/** Diferença em dias inteiros (a - b), comparando apenas a data. */
export function difEmDias(a: Date, b: Date): number {
  return Math.round(
    (inicioDoDia(a).getTime() - inicioDoDia(b).getTime()) / 86_400_000,
  );
}

/** Início da semana (segunda-feira) da data informada. */
export function inicioDaSemana(d: Date): Date {
  const dia = inicioDoDia(d);
  const desdeSegunda = (dia.getDay() + 6) % 7; // 0=segunda ... 6=domingo
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - desdeSegunda);
}

/** Verifica se duas datas caem na mesma semana (segunda a domingo). */
export function mesmaSemana(a: Date, b: Date): boolean {
  return inicioDaSemana(a).getTime() === inicioDaSemana(b).getTime();
}

/** Hoje no formato "YYYY-MM-DD" (data local). */
export function hojeISO(hoje: Date = new Date()): string {
  const y = hoje.getFullYear();
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const d = String(hoje.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// -------------------------------------------------------------
// 1. Próxima ação (mapa status -> ação)
// -------------------------------------------------------------
export const PROXIMA_ACAO: Record<ContentStatus, string> = {
  Planejamento: "Criar planejamento",
  "Roteiro pronto": "Agendar gravação",
  "Aguardando gravação": "Gravar",
  Gravado: "Adicionar à fila de edição",
  "Fila de edição": "Editar",
  "Em edição": "Finalizar edição",
  "Revisão interna": "Revisar",
  "Aprovação do cliente": "Aguardar cliente",
  Ajustes: "Realizar ajustes",
  Aprovado: "Agendar publicação",
  Agendado: "Publicar",
  Publicado: "Finalizado",
  Pausado: "Aguardar retomada",
  Cancelado: "Nenhuma ação",
};

export function proximaAcao(status: ContentStatus): string {
  return PROXIMA_ACAO[status];
}

/**
 * Status resultante ao "concluir a próxima ação" (avança o pipeline).
 * Retorna null quando não há avanço aplicável (Publicado/Pausado/Cancelado).
 */
export const STATUS_AO_CONCLUIR: Record<ContentStatus, ContentStatus | null> = {
  Planejamento: "Roteiro pronto",
  "Roteiro pronto": "Aguardando gravação",
  "Aguardando gravação": "Gravado",
  Gravado: "Fila de edição",
  "Fila de edição": "Em edição",
  "Em edição": "Revisão interna",
  "Revisão interna": "Aprovação do cliente",
  "Aprovação do cliente": "Aprovado",
  Ajustes: "Revisão interna",
  Aprovado: "Agendado",
  Agendado: "Publicado",
  Publicado: null,
  Pausado: null,
  Cancelado: null,
};

export function statusAoConcluir(status: ContentStatus): ContentStatus | null {
  return STATUS_AO_CONCLUIR[status];
}

/**
 * Rótulo do botão principal (ação contextual) para avançar o pipeline.
 * null quando não há avanço (Publicado/Pausado/Cancelado).
 */
export const ROTULO_AVANCAR: Record<ContentStatus, string | null> = {
  Planejamento: "Marcar roteiro pronto",
  "Roteiro pronto": "Enviar p/ gravação",
  "Aguardando gravação": "Marcar como gravado",
  Gravado: "Enviar p/ edição",
  "Fila de edição": "Iniciar edição",
  "Em edição": "Enviar p/ revisão",
  "Revisão interna": "Enviar ao cliente",
  "Aprovação do cliente": "Marcar aprovado",
  Ajustes: "Enviar p/ revisão",
  Aprovado: "Agendar",
  Agendado: "Marcar publicado",
  Publicado: null,
  Pausado: null,
  Cancelado: null,
};

export function rotuloAvancar(status: ContentStatus): string | null {
  return ROTULO_AVANCAR[status];
}

// -------------------------------------------------------------
// 2. Responsável atual (depende da etapa do pipeline)
// -------------------------------------------------------------
export interface PessoaResumo {
  id: string;
  name: string;
}

export interface ContextoResponsaveis {
  /** Perfil de planejamento (papel planner, ex.: Vitória). */
  planner?: PessoaResumo | null;
  /** Perfil de produção (papel producer, ex.: Fran). */
  producer?: PessoaResumo | null;
  /** Nome do responsável cadastrado pela publicação (publisher_id). */
  publisherName?: string | null;
}

/**
 * Retorna o nome do responsável atual conforme o status:
 * - Planejamento/Roteiro pronto -> planner (Vitória)
 * - Gravação/Edição -> producer (Fran)
 * - Revisão interna -> producer e planner
 * - Aprovação do cliente -> planner (Vitória)
 * - Publicação (Aprovado/Agendado/Publicado) -> responsável cadastrado
 */
export function responsavelAtual(
  content: Pick<Content, "status" | "format">,
  ctx: ContextoResponsaveis,
): string {
  const planner = ctx.planner?.name ?? "Planejamento";
  const producer = ctx.producer?.name ?? "Produção";

  // Pausado / Cancelado: sem responsável, independente do tipo.
  if (content.status === "Pausado" || content.status === "Cancelado") return "—";

  // ARTE / DESIGN (Carrossel, Post estático): a criação inteira é da Vitória
  // (planner) — layout, design e capa. Só a produção de fotos (quando há) é
  // sua, mas o dono da demanda continua sendo a Vitória.
  if (ehArte(content.format)) {
    switch (content.status) {
      case "Revisão interna":
        return producer; // a arte é revisada pela Fran
      case "Aprovação do cliente":
        return planner; // quem manda pro cliente é a Vitória
      case "Aprovado":
      case "Agendado":
      case "Publicado":
        return ctx.publisherName ?? planner;
      default:
        return planner; // planejamento, criação, ajustes
    }
  }

  // VÍDEO: planejamento/roteiro é da Vitória; gravação/edição em diante é sua.
  switch (content.status) {
    case "Planejamento":
    case "Roteiro pronto":
      return planner;
    case "Aguardando gravação":
    case "Gravado":
    case "Fila de edição":
    case "Em edição":
    case "Ajustes":
      return producer;
    case "Revisão interna":
      return planner; // o vídeo é revisado pela Vitória
    case "Aprovação do cliente":
      return planner; // quem manda pro cliente é a Vitória
    case "Aprovado":
    case "Agendado":
    case "Publicado":
      return ctx.publisherName ?? producer;
    default:
      return "—";
  }
}

/**
 * Papel FIXO responsável por uma demanda (time de duas pessoas):
 * - Arte/design (Carrossel, Post estático) => planner (Vitória) na criação.
 * - Vídeo em planejamento/roteiro => planner (Vitória).
 * - Vídeo em produção/edição em diante => producer (Fran).
 * - REVISÃO INTERNA cruza: vídeo é revisado pela Vitória (planner) e arte é
 *   revisada pela Fran (producer).
 * Usado para separar "Minhas tarefas" por pessoa.
 */
export type PapelDemanda = "planner" | "producer";

export function papelResponsavel(
  content: Pick<Content, "status" | "format">,
): PapelDemanda {
  // Revisão interna: a revisão troca de mãos (vídeo -> Vitória, arte -> Fran).
  if (content.status === "Revisão interna") {
    return ehArte(content.format) ? "producer" : "planner";
  }
  if (ehArte(content.format)) return "planner";
  return ORDEM_STATUS[content.status] <= ORDEM_STATUS["Roteiro pronto"]
    ? "planner"
    : "producer";
}

// -------------------------------------------------------------
// 3. Prazo principal (o prazo relevante para a etapa atual)
// -------------------------------------------------------------
/**
 * Retorna o prazo mais relevante conforme a etapa:
 * - Planejamento/Roteiro -> prazo do roteiro
 * - Gravação -> prazo de gravação
 * - Edição/Revisão/Ajustes -> prazo de edição
 * - Publicação -> data prevista de postagem
 * Cai para a data prevista quando o prazo específico não existe.
 */
export function prazoPrincipal(
  content: Pick<
    Content,
    | "status"
    | "script_deadline"
    | "recording_deadline"
    | "editing_deadline"
    | "planned_date"
  >,
): string | null {
  switch (content.status) {
    case "Planejamento":
    case "Roteiro pronto":
      return content.script_deadline ?? content.planned_date;
    case "Aguardando gravação":
    case "Gravado":
      return content.recording_deadline ?? content.planned_date;
    case "Fila de edição":
    case "Em edição":
    case "Revisão interna":
    case "Ajustes":
      // Entrega: 48h antes da postagem (automático) ou o ajuste manual.
      return prazoEntregaEfetivo(content) ?? content.planned_date;
    default:
      return content.planned_date;
  }
}

// -------------------------------------------------------------
// Prazo de entrega: FIXO em 48h antes da postagem
// -------------------------------------------------------------
/** Antecedência fixa de entrega: o conteúdo fica pronto 48h antes da postagem. */
export const HORAS_ENTREGA_ANTES = 48;

/**
 * Prazo de entrega AUTOMÁTICO do conteúdo (arte ou vídeo): 48h (2 dias) antes
 * da data prevista de postagem. É o valor sugerido/padrão.
 * Retorna "YYYY-MM-DD" ou null quando não há data prevista de postagem.
 */
export function prazoEntrega(
  content: Pick<Content, "planned_date">,
): string | null {
  const prevista = parseData(content.planned_date);
  if (!prevista) return null;
  const dias = Math.round(HORAS_ENTREGA_ANTES / 24);
  const entrega = new Date(
    prevista.getFullYear(),
    prevista.getMonth(),
    prevista.getDate() - dias,
  );
  return hojeISO(entrega);
}

/**
 * Prazo de entrega EFETIVO: usa o ajuste manual (editing_deadline) quando
 * existir; senão o automático (48h antes). Assim o preenchimento é automático
 * mas continua alterável.
 */
export function prazoEntregaEfetivo(
  content: Pick<Content, "planned_date" | "editing_deadline">,
): string | null {
  return content.editing_deadline ?? prazoEntrega(content);
}

// -------------------------------------------------------------
// Agrupamentos por status (usados em painéis e dashboard)
// -------------------------------------------------------------
export const GRUPO_EM_APROVACAO: ContentStatus[] = [
  "Revisão interna",
  "Aprovação do cliente",
];
export const GRUPO_PRONTOS_PUBLICAR: ContentStatus[] = ["Aprovado", "Agendado"];

export interface ResumoProducao {
  total: number;
  aguardandoGravacao: number;
  gravados: number;
  filaEdicao: number;
  emEdicao: number;
  emAprovacao: number;
  aprovados: number;
  publicados: number;
}

/** Conta os conteúdos por etapa de produção (para cards de indicadores). */
export function resumoProducao(
  contents: Pick<Content, "status">[],
): ResumoProducao {
  const conta = (s: ContentStatus) =>
    contents.filter((c) => c.status === s).length;
  return {
    total: contents.length,
    aguardandoGravacao: conta("Aguardando gravação"),
    gravados: conta("Gravado"),
    filaEdicao: conta("Fila de edição"),
    emEdicao: conta("Em edição"),
    emAprovacao: contents.filter((c) => GRUPO_EM_APROVACAO.includes(c.status))
      .length,
    aprovados: conta("Aprovado"),
    publicados: conta("Publicado"),
  };
}

// -------------------------------------------------------------
// 4. Está atrasado?
// -------------------------------------------------------------
type ContentAtraso = Pick<
  Content,
  | "status"
  | "planned_date"
  | "recording_deadline"
  | "editing_deadline"
  | "is_fixed_date"
>;

/**
 * Um conteúdo está atrasado quando QUALQUER condição é verdadeira:
 * 1. a data prevista passou e ele não está publicado;
 * 2. o prazo de gravação passou e ele ainda não está gravado;
 * 3. o prazo de edição passou e ele ainda não foi aprovado;
 * 4. possui data fixa próxima (dentro da janela) e ainda não está pronto.
 *
 * Pausado e Cancelado nunca são considerados atrasados.
 * `hoje` é injetável para testes.
 */
export function estaAtrasado(
  content: ContentAtraso,
  hoje: Date = new Date(),
): boolean {
  const { status } = content;
  if (status === "Publicado" || status === "Pausado" || status === "Cancelado") {
    return false;
  }

  const idx = ORDEM_STATUS[status];
  const naoGravado = idx < ORDEM_STATUS["Gravado"];
  const naoAprovado = idx < ORDEM_STATUS["Aprovado"];

  const prevista = parseData(content.planned_date);
  const prazoGravacao = parseData(content.recording_deadline);
  const prazoEdicao = parseData(content.editing_deadline);

  // 1. data prevista passou e não publicado
  if (prevista && difEmDias(prevista, hoje) < 0) return true;
  // 2. prazo de gravação passou e não gravado
  if (prazoGravacao && difEmDias(prazoGravacao, hoje) < 0 && naoGravado) {
    return true;
  }
  // 3. prazo de edição passou e não aprovado
  if (prazoEdicao && difEmDias(prazoEdicao, hoje) < 0 && naoAprovado) {
    return true;
  }
  // 4. data fixa próxima e não pronto
  if (content.is_fixed_date && prevista) {
    const dias = difEmDias(prevista, hoje);
    if (dias >= 0 && dias <= JANELA_DATA_FIXA_DIAS && naoAprovado) return true;
  }

  return false;
}

// -------------------------------------------------------------
// Urgência automática (por prazo) — o mais apertado entre o prazo da ETAPA
// atual e a DATA DE POSTAGEM. "Urgente" manual sempre no topo (reforço).
// -------------------------------------------------------------
export type NivelUrgencia =
  | "urgente"
  | "atrasado"
  | "hoje"
  | "semana"
  | "tranquilo";

export interface Urgencia {
  nivel: NivelUrgencia;
  /** Dias até o prazo mais apertado (negativo = atrasado); null se sem prazo. */
  dias: number | null;
  /** Chave de ordenação: menor = mais urgente. */
  ordem: number;
  /** Texto curto para o selo ("Atrasado 3d", "Vence hoje", "Em 5d"). */
  rotulo: string;
}

const ORDEM_URGENCIA: Record<NivelUrgencia, number> = {
  urgente: 0,
  atrasado: 1,
  hoje: 2,
  semana: 3,
  tranquilo: 4,
};

type ContentUrgencia = Pick<
  Content,
  | "status"
  | "priority"
  | "script_deadline"
  | "recording_deadline"
  | "editing_deadline"
  | "planned_date"
>;

/**
 * Classifica a urgência de um conteúdo pelo prazo mais apertado entre a etapa
 * atual (gravar/editar/roteiro) e a data de postagem. Um "Urgente" manual fura
 * a fila e vem sempre no topo. Publicado/Pausado/Cancelado ficam "tranquilo".
 */
export function urgenciaConteudo(
  content: ContentUrgencia,
  hoje: Date = new Date(),
): Urgencia {
  const tranquilo = (dias: number | null, rotulo: string): Urgencia => ({
    nivel: "tranquilo",
    dias,
    ordem: ORDEM_URGENCIA.tranquilo,
    rotulo,
  });

  if (
    content.status === "Publicado" ||
    content.status === "Cancelado" ||
    content.status === "Pausado"
  ) {
    return tranquilo(null, "");
  }

  // O mais apertado (mais cedo) entre o prazo da etapa e a data de postagem.
  const prazoEtapa = parseData(prazoPrincipal(content));
  const postagem = parseData(content.planned_date);
  const datas = [prazoEtapa, postagem].filter((d): d is Date => d != null);
  const alvo = datas.length
    ? datas.reduce((a, b) => (a < b ? a : b))
    : null;
  const dias = alvo ? difEmDias(alvo, hoje) : null;

  // Urgente manual fura a fila.
  if (content.priority === "Urgente") {
    return { nivel: "urgente", dias, ordem: ORDEM_URGENCIA.urgente, rotulo: "Urgente" };
  }
  if (dias == null) return tranquilo(null, "");
  if (dias < 0)
    return { nivel: "atrasado", dias, ordem: ORDEM_URGENCIA.atrasado, rotulo: `Atrasado ${Math.abs(dias)}d` };
  if (dias === 0)
    return { nivel: "hoje", dias, ordem: ORDEM_URGENCIA.hoje, rotulo: "Vence hoje" };
  if (dias <= 7)
    return { nivel: "semana", dias, ordem: ORDEM_URGENCIA.semana, rotulo: `Em ${dias}d` };
  return tranquilo(dias, `Em ${dias}d`);
}

/** Ordena por urgência (mais urgente primeiro; mais atrasado desempata). */
export function compararUrgencia(a: Urgencia, b: Urgencia): number {
  if (a.ordem !== b.ordem) return a.ordem - b.ordem;
  return (a.dias ?? 9999) - (b.dias ?? 9999);
}

// -------------------------------------------------------------
// Mês EFETIVO do conteúdo (para o acompanhamento por mês).
// Depende do status, não de um campo fixo — porque "ainda não postado"
// pertence ao mês ATUAL (rola sozinho com o tempo):
//   - Publicado  => mês em que REALMENTE saiu (data real da postagem).
//   - Cancelado  => congelado no mês dele (reference_month).
//   - Qualquer outro (em produção, aguardando, pausado) => mês ATUAL.
// -------------------------------------------------------------
export function mesEfetivo(
  content: Pick<
    Content,
    "status" | "actual_post_date" | "planned_date" | "reference_month"
  >,
  hoje: Date = new Date(),
): string {
  const mesAtual = hojeISO(hoje).slice(0, 7);
  if (content.status === "Publicado") {
    return (
      content.actual_post_date ??
      content.planned_date ??
      content.reference_month ??
      mesAtual
    ).slice(0, 7);
  }
  if (content.status === "Cancelado") {
    return (content.reference_month ?? content.planned_date ?? mesAtual).slice(
      0,
      7,
    );
  }
  // Ainda não postado: pertence ao mês atual.
  return mesAtual;
}

/**
 * Entrega em alerta: entrou na janela de 48h antes da postagem (prazo de
 * entrega atingido/vencido), a postagem ainda NÃO chegou e o conteúdo ainda
 * não está pronto. NÃO é "atrasado" — é sinal de "alta prioridade para
 * entregar agora". Publicado/Pausado/Cancelado nunca entram.
 */
export function entregaEmAlerta(
  content: Pick<Content, "status" | "planned_date" | "editing_deadline">,
  hoje: Date = new Date(),
): boolean {
  const { status } = content;
  if (status === "Publicado" || status === "Pausado" || status === "Cancelado") {
    return false;
  }
  const naoAprovado = ORDEM_STATUS[status] < ORDEM_STATUS["Aprovado"];
  if (!naoAprovado) return false;

  const prevista = parseData(content.planned_date);
  if (!prevista) return false;
  // Já passou da postagem => isso é "atrasado", não alerta de entrega.
  if (difEmDias(prevista, hoje) < 0) return false;

  const entrega = parseData(prazoEntregaEfetivo(content));
  if (!entrega) return false;
  return difEmDias(entrega, hoje) <= 0;
}

// -------------------------------------------------------------
// Gravações: já gravado? e classificação em grupos
// -------------------------------------------------------------
/** Um conteúdo está gravado quando atingiu (ou passou de) a etapa "Gravado". */
export function estaGravado(status: ContentStatus): boolean {
  return ORDEM_STATUS[status] >= ORDEM_STATUS["Gravado"];
}

export type GrupoGravacao = "atrasada" | "semana" | "proxima" | "gravada";

/**
 * Classifica um conteúdo de gravação em: atrasada, desta semana, próxima
 * ou já gravada. Usa a data de gravação (ou o prazo de gravação) como
 * referência temporal.
 */
export function classificarGravacao(
  content: Pick<
    Content,
    "status" | "recording_date" | "recording_deadline"
  >,
  hoje: Date = new Date(),
): GrupoGravacao {
  if (estaGravado(content.status)) return "gravada";

  const ref =
    parseData(content.recording_date) ?? parseData(content.recording_deadline);
  if (ref) {
    if (difEmDias(ref, hoje) < 0) return "atrasada";
    if (mesmaSemana(ref, hoje)) return "semana";
    return "proxima";
  }
  return "proxima";
}

// -------------------------------------------------------------
// Ordenação automática da fila de edição
// -------------------------------------------------------------
/**
 * Gera a chave de ordenação automática (menor = mais prioritário),
 * seguindo a ordem: atrasado > entregar (48h) > data fixa > campanha >
 * urgente > data de postagem mais próxima > prazo de entrega mais próximo >
 * prioridade alta > conteúdo da semana > conteúdo da próxima semana.
 */
function chaveFilaEdicao(
  content: Content,
  hoje: Date,
): (number)[] {
  const bool = (v: boolean) => (v ? 0 : 1);
  const prevista = parseData(content.planned_date);
  const prazoEd = parseData(prazoEntregaEfetivo(content));
  const inicioSemanaAtual = inicioDaSemana(hoje).getTime();
  const inicioProxSemana = inicioDaSemana(hoje);
  inicioProxSemana.setDate(inicioProxSemana.getDate() + 7);

  const daSemana =
    prevista != null && inicioDaSemana(prevista).getTime() === inicioSemanaAtual;
  const daProximaSemana =
    prevista != null &&
    inicioDaSemana(prevista).getTime() === inicioProxSemana.getTime();

  return [
    bool(estaAtrasado(content, hoje)),
    bool(entregaEmAlerta(content, hoje)),
    bool(content.is_fixed_date),
    bool(content.is_campaign),
    bool(content.priority === "Urgente"),
    prevista ? prevista.getTime() : Number.POSITIVE_INFINITY,
    prazoEd ? prazoEd.getTime() : Number.POSITIVE_INFINITY,
    bool(content.priority === "Alta"),
    bool(daSemana),
    bool(daProximaSemana),
  ];
}

/** Ordena os conteúdos da fila de edição pelos critérios automáticos. */
export function ordenarFilaEdicao(
  contents: Content[],
  hoje: Date = new Date(),
): Content[] {
  return [...contents].sort((a, b) => {
    const ka = chaveFilaEdicao(a, hoje);
    const kb = chaveFilaEdicao(b, hoje);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
}

/**
 * Ordena a fila respeitando a posição manual (editing_queue_position)
 * quando definida; os demais entram na sequência pela ordem automática.
 */
export function ordenarFilaFinal(
  contents: Content[],
  hoje: Date = new Date(),
): Content[] {
  const manuais = contents
    .filter((c) => c.editing_queue_position != null)
    .sort(
      (a, b) =>
        (a.editing_queue_position as number) -
        (b.editing_queue_position as number),
    );
  const automaticos = ordenarFilaEdicao(
    contents.filter((c) => c.editing_queue_position == null),
    hoje,
  );
  return [...manuais, ...automaticos];
}

// -------------------------------------------------------------
// 5. Motivo da prioridade
// -------------------------------------------------------------
type ContentMotivo = ContentAtraso & Pick<Content, "priority" | "is_campaign">;

/**
 * Retorna o principal fator que justifica a prioridade do conteúdo,
 * na ordem: atrasado > entregar (48h) > data fixa > campanha > urgente >
 * prioridade alta > postagem próxima > rotina. Usado em badges e na fila.
 */
export function motivoPrioridade(
  content: ContentMotivo,
  hoje: Date = new Date(),
): string {
  if (estaAtrasado(content, hoje)) return "Atrasado";
  if (entregaEmAlerta(content, hoje)) return "Entregar";
  if (content.is_fixed_date) return "Data fixa";
  if (content.is_campaign) return "Campanha";
  if (content.priority === "Urgente") return "Urgente";
  if (content.priority === "Alta") return "Prioridade alta";

  const prevista = parseData(content.planned_date);
  if (prevista) {
    const dias = difEmDias(prevista, hoje);
    if (dias >= 0 && dias <= JANELA_DATA_FIXA_DIAS) return "Postagem próxima";
  }
  return "Rotina";
}
