/**
 * =============================================================
 * TIPOS PRINCIPAIS DO SISTEMA
 * =============================================================
 * Fonte única de verdade para os modelos de domínio.
 * Estes tipos espelham (e no futuro serão gerados a partir de)
 * o schema do banco de dados no Supabase.
 *
 * Convenções:
 * - Campos do banco em snake_case (compatível com Postgres/Supabase).
 * - IDs são UUID (string).
 * - Datas trafegam como string ISO 8601 (timestamptz).
 * - "Status" segue o fluxo de produção definido no PROJECT_CONTEXT.md.
 * =============================================================
 */

// -------------------------------------------------------------
// Identificadores auxiliares
// -------------------------------------------------------------
export type UUID = string;
/** Data/hora em formato ISO 8601 (ex.: "2026-07-14T12:00:00Z"). */
export type ISODateString = string;

// -------------------------------------------------------------
// Enums de domínio
// -------------------------------------------------------------

/** Papel do usuário no sistema. */
export type PapelUsuario = "planejamento" | "edicao" | "admin";

/** Etapas do pipeline de produção de um conteúdo (ordem cronológica). */
export type StatusConteudo =
  | "ideia" // pauta em rascunho
  | "roteiro" // roteiro em elaboração
  | "aprovado" // pronto para gravar
  | "gravacao" // aguardando/registrando gravação
  | "edicao" // na fila de edição
  | "revisao" // aguardando revisão/aprovação
  | "agendado" // aprovado e agendado para postar
  | "publicado"; // publicado nas redes

/** Formato do conteúdo produzido. */
export type FormatoConteudo =
  | "reel"
  | "carrossel"
  | "story"
  | "post_estatico"
  | "video_longo";

/** Plataforma de destino da postagem. */
export type Plataforma =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "outro";

/** Nível de prioridade (usado em conteúdos e tarefas). */
export type Prioridade = "baixa" | "media" | "alta" | "urgente";

/** Situação de uma gravação. */
export type StatusGravacao = "pendente" | "agendada" | "gravada" | "refazer";

/** Situação de uma postagem. */
export type StatusPostagem = "agendada" | "publicada" | "cancelada";

/** Situação de uma tarefa avulsa. */
export type StatusTarefa = "pendente" | "em_andamento" | "concluida";

// -------------------------------------------------------------
// Entidades
// -------------------------------------------------------------

/**
 * Perfil de usuário. Espelha auth.users do Supabase via tabela `profiles`.
 * No MVP: Vitória (planejamento) e Fran (edicao).
 */
export interface Perfil {
  id: UUID; // = auth.users.id
  nome: string;
  email: string;
  papel: PapelUsuario;
  avatar_url: string | null;
  criado_em: ISODateString;
}

/** Cliente atendido pela agência. */
export interface Cliente {
  id: UUID;
  nome: string;
  contato: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: ISODateString;
  atualizado_em: ISODateString;
}

/**
 * Conteúdo — ENTIDADE CENTRAL do sistema.
 * Um conteúdo percorre todo o pipeline (StatusConteudo).
 * As páginas "Gravações", "Fila de edição" e "Postagens" são
 * recortes/visões deste mesmo fluxo, e NÃO entidades duplicadas.
 */
export interface Conteudo {
  id: UUID;
  cliente_id: UUID;
  titulo: string;
  briefing: string | null;
  roteiro: string | null;
  formato: FormatoConteudo;
  plataforma: Plataforma;
  status: StatusConteudo;
  prioridade: Prioridade;
  /** Responsável pelo planejamento/roteiro (ex.: Vitória). */
  responsavel_planejamento_id: UUID | null;
  /** Responsável pela gravação/edição (ex.: Fran). */
  responsavel_producao_id: UUID | null;
  data_prevista: ISODateString | null;
  criado_por: UUID;
  criado_em: ISODateString;
  atualizado_em: ISODateString;
}

/**
 * Gravação vinculada a um conteúdo (metadados da captação).
 * A "página Gravações" lista conteúdos em captação + estes registros.
 */
export interface Gravacao {
  id: UUID;
  conteudo_id: UUID;
  status: StatusGravacao;
  data_agendada: ISODateString | null;
  local: string | null;
  observacoes: string | null;
  link_bruto: string | null; // link do material gravado (Drive, etc.)
  criado_em: ISODateString;
  atualizado_em: ISODateString;
}

/**
 * Postagem vinculada a um conteúdo (agendamento/publicação).
 * A "página Postagens" opera sobre estes registros.
 */
export interface Postagem {
  id: UUID;
  conteudo_id: UUID;
  plataforma: Plataforma;
  status: StatusPostagem;
  data_agendada: ISODateString | null;
  data_publicada: ISODateString | null;
  link_publicado: string | null;
  legenda: string | null;
  criado_em: ISODateString;
  atualizado_em: ISODateString;
}

/**
 * Tarefa avulsa, atribuída a um usuário.
 * Alimenta a página "Minhas tarefas". Pode ou não referenciar um conteúdo.
 */
export interface Tarefa {
  id: UUID;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prioridade: Prioridade;
  responsavel_id: UUID;
  conteudo_id: UUID | null;
  prazo: ISODateString | null;
  criado_por: UUID;
  criado_em: ISODateString;
  atualizado_em: ISODateString;
}

// -------------------------------------------------------------
// Tipos derivados / de apresentação (com relacionamentos)
// -------------------------------------------------------------

/** Conteúdo com relacionamentos resolvidos, para exibição em telas. */
export interface ConteudoComRelacionamentos extends Conteudo {
  cliente: Cliente | null;
  responsavel_planejamento: Perfil | null;
  responsavel_producao: Perfil | null;
}

/** Resumo numérico exibido no Dashboard. */
export interface ResumoDashboard {
  total_conteudos: number;
  em_gravacao: number;
  em_edicao: number;
  agendados: number;
  publicados_mes: number;
  tarefas_pendentes: number;
}

// -------------------------------------------------------------
// Metadados de UI (rótulos em pt-BR) — usados em badges/filtros
// -------------------------------------------------------------

export const ROTULOS_STATUS_CONTEUDO: Record<StatusConteudo, string> = {
  ideia: "Ideia",
  roteiro: "Roteiro",
  aprovado: "Aprovado",
  gravacao: "Gravação",
  edicao: "Edição",
  revisao: "Revisão",
  agendado: "Agendado",
  publicado: "Publicado",
};

export const ROTULOS_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const ROTULOS_PLATAFORMA: Record<Plataforma, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  outro: "Outro",
};

export const ROTULOS_FORMATO: Record<FormatoConteudo, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  story: "Story",
  post_estatico: "Post estático",
  video_longo: "Vídeo longo",
};
