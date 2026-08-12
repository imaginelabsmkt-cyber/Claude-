/**
 * =============================================================
 * TIPOS DO BANCO DE DADOS (Supabase)
 * =============================================================
 * Espelham fielmente o schema definido em
 * `supabase/migrations/20260714120000_initial_schema.sql`.
 *
 * Fonte única de verdade dos modelos de dados. Quando o schema mudar,
 * atualize este arquivo (ou gere-o via `supabase gen types typescript`).
 *
 * Convenção: colunas em snake_case; datas como string ISO 8601;
 * IDs como UUID (string).
 * =============================================================
 */

export type UUID = string;
/** Data/hora ISO 8601, ex.: "2026-07-14T12:00:00Z". */
export type ISODateString = string;
/** Data (sem hora) no formato "YYYY-MM-DD". */
export type DateString = string;

// -------------------------------------------------------------
// ENUMs (espelham os tipos ENUM do Postgres)
// -------------------------------------------------------------

export type UserRole = "planner" | "producer" | "admin";

export type ContentStatus =
  | "Planejamento"
  | "Roteiro pronto"
  | "Aguardando gravação"
  | "Gravado"
  | "Fila de edição"
  | "Em edição"
  | "Revisão interna"
  | "Aprovação do cliente"
  | "Ajustes"
  | "Aprovado"
  | "Agendado"
  | "Publicado"
  | "Pausado"
  | "Cancelado";

export type ContentPriority = "Urgente" | "Alta" | "Média" | "Baixa";

// -------------------------------------------------------------
// Linhas das tabelas (Row)
// -------------------------------------------------------------

/** profiles */
export type Profile = {
  id: UUID; // = auth.users.id
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** clients */
export type Client = {
  id: UUID;
  name: string;
  active: boolean;
  color: string | null;
  niche: string | null;
  /** Meta de conteúdos por mês (opcional; combo contratado). */
  monthly_goal: number | null;
  notes: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** contents — entidade central */
export type Content = {
  id: UUID;
  client_id: UUID;

  // Identificação / planejamento
  title: string;
  description: string | null;
  format: string | null;
  content_pillar: string | null;
  objective: string | null;
  status: ContentStatus;
  priority: ContentPriority;

  // Datas de planejamento
  reference_month: string | null;
  planned_week: number | null;
  planned_date: DateString | null;
  actual_post_date: DateString | null;

  // Gravação
  requires_recording: boolean;
  recording_date: DateString | null;
  recording_time: string | null; // "HH:MM" (opcional)
  recording_location: string | null;
  participants: string[];
  outfit: string | null;
  required_materials: string[];

  // Responsáveis
  planner_id: UUID | null;
  recorder_id: UUID | null;
  editor_id: UUID | null;
  publisher_id: UUID | null;

  // Prazos
  script_deadline: DateString | null;
  recording_deadline: DateString | null;
  editing_deadline: DateString | null;

  // Conteúdo rico (vindo do planejamento)
  script: string | null; // roteiro completo (cenas/falas/stories)
  caption: string | null; // legenda do post

  // Arquivos / links
  reference_url: string | null; // referência (Instagram/TikTok) que inspira o conteúdo
  script_url: string | null;
  raw_files_url: string | null;
  edited_file_url: string | null;
  published_url: string | null;

  // Controle
  notes: string | null;
  revision_count: number;
  editing_queue_position: number | null;
  is_fixed_date: boolean;
  is_campaign: boolean;

  created_at: ISODateString;
  updated_at: ISODateString;
}

/** content_history */
export type ContentHistory = {
  id: UUID;
  content_id: UUID;
  user_id: UUID | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: ISODateString;
}

/** comments */
export type Comment = {
  id: UUID;
  content_id: UUID;
  user_id: UUID | null;
  comment: string;
  created_at: ISODateString;
}

/** plannings — gestão da criação do planejamento mensal por cliente */
export type Planning = {
  id: UUID;
  client_id: UUID;
  reference_month: string;
  status: string;
  meeting_date: DateString | null;
  meeting_time: string | null;
  delivery_deadline: DateString | null;
  notes: string | null;
  situation: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}
export type PlanningInsert = {
  id?: UUID;
  client_id: UUID;
  reference_month: string;
  status?: string;
  meeting_date?: DateString | null;
  meeting_time?: string | null;
  delivery_deadline?: DateString | null;
  notes?: string | null;
  situation?: string | null;
  created_at?: ISODateString;
  updated_at?: ISODateString;
};

/** planning_google_sync — mapeia planejamento -> evento/tarefa no Google */
export type PlanningGoogleSync = {
  id: UUID;
  planning_id: UUID;
  user_id: UUID;
  kind: string;
  external_id: string;
  updated_at: ISODateString;
}
export type PlanningGoogleSyncInsert = Omit<
  PlanningGoogleSync,
  "id" | "updated_at"
> & { id?: UUID; updated_at?: ISODateString };

/** google_accounts — conexão do usuário com o Google */
export type GoogleAccount = {
  user_id: UUID;
  email: string | null;
  refresh_token: string;
  scope: string | null;
  cal_reunioes: string | null;
  cal_producao: string | null;
  cal_postagens: string | null;
  connected_at: ISODateString;
  updated_at: ISODateString;
}
export type GoogleAccountInsert = Omit<
  GoogleAccount,
  "connected_at" | "updated_at" | "cal_reunioes" | "cal_producao" | "cal_postagens"
> & {
  cal_reunioes?: string | null;
  cal_producao?: string | null;
  cal_postagens?: string | null;
  connected_at?: ISODateString;
  updated_at?: ISODateString;
};

/** google_sync — mapeia conteúdo -> evento/tarefa no Google, por usuário */
export type GoogleSync = {
  id: UUID;
  content_id: UUID;
  user_id: UUID;
  kind: string; // 'event' | 'task'
  external_id: string;
  updated_at: ISODateString;
}
export type GoogleSyncInsert = Omit<GoogleSync, "id" | "updated_at"> & {
  id?: UUID;
  updated_at?: ISODateString;
};

// -------------------------------------------------------------
// Tipos de Insert / Update (colunas com default são opcionais)
// -------------------------------------------------------------

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at"> & {
  role?: UserRole;
  avatar_url?: string | null;
};
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export type ClientInsert = Omit<Client, "id" | "created_at" | "updated_at"> & {
  id?: UUID;
  active?: boolean;
  niche?: string | null;
  monthly_goal?: number | null;
};
export type ClientUpdate = Partial<Omit<Client, "id" | "created_at" | "updated_at">>;

export type ContentInsert = Omit<
  Content,
  | "id"
  | "created_at"
  | "updated_at"
  | "editing_queue_position"
  | "status"
  | "priority"
  | "requires_recording"
  | "participants"
  | "required_materials"
  | "revision_count"
  | "is_fixed_date"
  | "is_campaign"
  | "script"
  | "caption"
  | "reference_url"
  | "recording_time"
> & {
  id?: UUID;
  status?: ContentStatus;
  reference_url?: string | null;
  recording_time?: string | null;
  priority?: ContentPriority;
  requires_recording?: boolean;
  participants?: string[];
  required_materials?: string[];
  revision_count?: number;
  editing_queue_position?: number | null;
  is_fixed_date?: boolean;
  is_campaign?: boolean;
  script?: string | null;
  caption?: string | null;
};
export type ContentUpdate = Partial<Omit<Content, "id" | "created_at" | "updated_at">>;

export type ContentHistoryInsert = Omit<ContentHistory, "id" | "created_at"> & {
  id?: UUID;
};

export type CommentInsert = Omit<Comment, "id" | "created_at"> & {
  id?: UUID;
};

// -------------------------------------------------------------
// Tipo Database (formato compatível com @supabase/supabase-js)
// -------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      contents: {
        Row: Content;
        Insert: ContentInsert;
        Update: ContentUpdate;
        Relationships: [];
      };
      content_history: {
        Row: ContentHistory;
        Insert: ContentHistoryInsert;
        Update: Partial<ContentHistoryInsert>;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: Partial<CommentInsert>;
        Relationships: [];
      };
      plannings: {
        Row: Planning;
        Insert: PlanningInsert;
        Update: Partial<PlanningInsert>;
        Relationships: [];
      };
      google_accounts: {
        Row: GoogleAccount;
        Insert: GoogleAccountInsert;
        Update: Partial<GoogleAccountInsert>;
        Relationships: [];
      };
      google_sync: {
        Row: GoogleSync;
        Insert: GoogleSyncInsert;
        Update: Partial<GoogleSyncInsert>;
        Relationships: [];
      };
      planning_google_sync: {
        Row: PlanningGoogleSync;
        Insert: PlanningGoogleSyncInsert;
        Update: Partial<PlanningGoogleSyncInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      content_status: ContentStatus;
      content_priority: ContentPriority;
    };
    CompositeTypes: Record<string, never>;
  };
}
