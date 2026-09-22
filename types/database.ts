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

  // Sessão de edição (quando a Fran vai editar — vira bloco no Google Agenda)
  editing_date: DateString | null;
  editing_time: string | null;

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
  /** Se for uma CAPA gerada de um vídeo, guarda o id do vídeo de origem. */
  cover_source_id: UUID | null;

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

/** client_files — arquivos centralizados por cliente (metadados). */
export type ClientFile = {
  id: UUID;
  client_id: UUID;
  name: string;
  path: string;
  /** Tipo do documento — permite achar "os contratos". */
  kind: ClientFileKind;
  size_bytes: number | null;
  mime_type: string | null;
  uploaded_by: UUID | null;
  created_at: ISODateString;
}
export type ClientFileInsert = Omit<ClientFile, "id" | "created_at" | "kind"> & {
  id?: UUID;
  kind?: ClientFileKind;
};

/** client_onboarding — DNA/onboarding do cliente (JSONB flexível). */
export type ClientOnboarding = {
  client_id: UUID;
  data: Record<string, string>;
  created_at: ISODateString;
  updated_at: ISODateString;
}
export type ClientOnboardingInsert = {
  client_id: UUID;
  data?: Record<string, string>;
};

/** client_reports — relatórios mensais/quinzenais do cliente. */
export type ClientReport = {
  id: UUID;
  client_id: UUID;
  reference_month: string | null;
  title: string | null;
  path: string | null;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_by: UUID | null;
  created_at: ISODateString;
  /** Análise "mastigada" gerada por IA (JSON serializado). */
  analysis: string | null;
}
export type ClientReportInsert = Omit<
  ClientReport,
  "id" | "created_at" | "analysis"
> & {
  id?: UUID;
  analysis?: string | null;
};

/** client_diagnostics — diagnóstico visual (HTML) do cliente. */
export type ClientDiagnostic = {
  id: UUID;
  client_id: UUID;
  title: string | null;
  html: string;
  created_at: ISODateString;
  uploaded_by: UUID | null;
}
export type ClientDiagnosticInsert = Omit<
  ClientDiagnostic,
  "id" | "created_at"
> & {
  id?: UUID;
};

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
// Módulo financeiro (espelha 20260908120000_financeiro.sql)
// -------------------------------------------------------------

/** Natureza do lançamento financeiro. */
export type FinancialKind = "Receita" | "Despesa";

/** Situação do lançamento (coluna "Status" da planilha). */
export type FinancialStatus = "Pago" | "Pendente";

/** Mês de competência no formato "YYYY-MM". */
export type MonthString = string;

/** financial_settings — linha única com o saldo inicial da série. */
export type FinancialSettings = {
  id: true;
  opening_balance: number;
  opening_month: MonthString;
  updated_at: ISODateString;
}

/** financial_categories — linhas de agrupamento do resumo anual. */
export type FinancialCategory = {
  id: UUID;
  name: string;
  kind: FinancialKind;
  sort_order: number;
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** financial_recurrences — mensalidades e custos fixos que se repetem. */
export type FinancialRecurrence = {
  id: UUID;
  description: string;
  kind: FinancialKind;
  category_id: UUID;
  client_id: UUID | null;
  amount: number;
  /** Dia do mês do vencimento (1 a 31). */
  due_day: number | null;
  start_month: MonthString;
  end_month: MonthString | null;
  active: boolean;
  notes: string | null;
  /** A quem esta recorrência se refere (pró-labore). */
  team_member_id: UUID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** financial_entries — os lançamentos das abas mensais. */
export type FinancialEntry = {
  id: UUID;
  reference_month: MonthString;
  kind: FinancialKind;
  category_id: UUID;
  client_id: UUID | null;
  description: string;
  amount: number;
  status: FinancialStatus;
  due_date: DateString | null;
  paid_date: DateString | null;
  payment_method: string | null;
  notes: string | null;
  /** Preenchido quando o lançamento nasceu de uma recorrência. */
  recurrence_id: UUID | null;
  /** A quem este pagamento se refere (pró-labore, freela). */
  team_member_id: UUID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Upsert da linha única de configuração (colunas com default opcionais). */
export type FinancialSettingsInsert = {
  id?: true;
  opening_balance?: number;
  opening_month?: MonthString;
};

export type FinancialSettingsUpdate = Partial<
  Omit<FinancialSettings, "id" | "updated_at">
>;

export type FinancialCategoryInsert = Omit<
  FinancialCategory,
  "id" | "created_at" | "updated_at" | "sort_order" | "active"
> & {
  id?: UUID;
  sort_order?: number;
  active?: boolean;
};

export type FinancialRecurrenceInsert = Omit<
  FinancialRecurrence,
  | "id"
  | "created_at"
  | "updated_at"
  | "client_id"
  | "due_day"
  | "end_month"
  | "active"
  | "notes"
  | "team_member_id"
> & {
  team_member_id?: UUID | null;
  id?: UUID;
  client_id?: UUID | null;
  due_day?: number | null;
  end_month?: MonthString | null;
  active?: boolean;
  notes?: string | null;
};

export type FinancialEntryInsert = Omit<
  FinancialEntry,
  | "id"
  | "created_at"
  | "updated_at"
  | "client_id"
  | "status"
  | "due_date"
  | "paid_date"
  | "payment_method"
  | "notes"
  | "recurrence_id"
  | "team_member_id"
> & {
  id?: UUID;
  client_id?: UUID | null;
  team_member_id?: UUID | null;
  status?: FinancialStatus;
  due_date?: DateString | null;
  paid_date?: DateString | null;
  payment_method?: string | null;
  notes?: string | null;
  recurrence_id?: UUID | null;
};

// -------------------------------------------------------------
// Comercial (espelha 20260921120000_comercial.sql)
// -------------------------------------------------------------

/** Etapas do funil. "Fechado" e "Perdido" encerram a oportunidade. */
export type LeadStage =
  | "Contato feito"
  | "Diagnóstico"
  | "Proposta enviada"
  | "Negociação"
  | "Fechado"
  | "Perdido";

export type ProposalStatus = "Rascunho" | "Enviada" | "Aceita" | "Recusada";

/** commercial_leads — uma oportunidade no funil. */
export type Lead = {
  id: UUID;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string | null;
  stage: LeadStage;
  estimated_monthly: number;
  notes: string | null;
  /** Preenchido quando o lead é ganho: o cliente que nasceu dele. */
  client_id: UUID | null;
  lost_reason: string | null;
  /** Quando entrou na etapa atual — alimenta o "parado há N dias". */
  stage_changed_at: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** commercial_proposals — uma proposta enviada a uma oportunidade. */
export type Proposal = {
  id: UUID;
  lead_id: UUID;
  status: ProposalStatus;
  monthly_amount: number;
  setup_amount: number;
  scope: string | null;
  /** Conteúdos por mês — vira a meta do cliente quando aceita. */
  monthly_goal: number | null;
  sent_at: DateString | null;
  valid_until: DateString | null;
  notes: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type LeadInsert = Omit<
  Lead,
  | "id"
  | "created_at"
  | "updated_at"
  | "stage_changed_at"
  | "stage"
  | "estimated_monthly"
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "source"
  | "notes"
  | "client_id"
  | "lost_reason"
> & {
  id?: UUID;
  stage?: LeadStage;
  estimated_monthly?: number;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  source?: string | null;
  notes?: string | null;
  client_id?: UUID | null;
  lost_reason?: string | null;
};

export type ProposalInsert = Omit<
  Proposal,
  | "id"
  | "created_at"
  | "updated_at"
  | "status"
  | "setup_amount"
  | "scope"
  | "monthly_goal"
  | "sent_at"
  | "valid_until"
  | "notes"
> & {
  id?: UUID;
  status?: ProposalStatus;
  setup_amount?: number;
  scope?: string | null;
  monthly_goal?: number | null;
  sent_at?: DateString | null;
  valid_until?: DateString | null;
  notes?: string | null;
};

// -------------------------------------------------------------
// Empresa — documentos e obrigações (20260922120000_empresa.sql)
// -------------------------------------------------------------

/** Periodicidade de uma obrigação com prazo. */
export type ObligationCadence = "Mensal" | "Trimestral" | "Anual" | "Única";

/** Tipos de documento de cliente (check em client_files.kind). */
export type ClientFileKind =
  | "Contrato"
  | "Proposta"
  | "Briefing"
  | "Referência"
  | "Arte"
  | "Nota fiscal"
  | "Outro";

/** Tipos de documento da empresa (check em company_files.kind). */
export type CompanyFileKind =
  | "Contrato social"
  | "CNPJ"
  | "Alvará"
  | "Certidão"
  | "Imposto"
  | "Contabilidade"
  | "Seguro"
  | "Outro";

/** company_files — documento da empresa (binário no bucket company-files). */
export type CompanyFile = {
  id: UUID;
  name: string;
  path: string;
  kind: CompanyFileKind;
  size_bytes: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_by: UUID | null;
  created_at: ISODateString;
}

/** company_obligations — prazo que não é despesa. */
export type Obligation = {
  id: UUID;
  title: string;
  /** Área que cuida do assunto: "contabil" ou "administrativo". */
  area: string;
  cadence: ObligationCadence;
  due_day: number | null;
  due_month: number | null;
  due_date: DateString | null;
  /** Dias de antecedência do aviso. */
  alert_days: number;
  notes: string | null;
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** obligation_completions — um período cumprido. */
export type ObligationCompletion = {
  id: UUID;
  obligation_id: UUID;
  /** "2026-09" (mensal/trimestral), "2026" (anual) ou "unica". */
  period: string;
  completed_at: DateString;
  notes: string | null;
  created_at: ISODateString;
}

export type CompanyFileInsert = Omit<
  CompanyFile,
  "id" | "created_at" | "kind" | "size_bytes" | "mime_type" | "notes" | "uploaded_by"
> & {
  id?: UUID;
  kind?: CompanyFileKind;
  size_bytes?: number | null;
  mime_type?: string | null;
  notes?: string | null;
  uploaded_by?: UUID | null;
};

export type ObligationInsert = Omit<
  Obligation,
  | "id"
  | "created_at"
  | "updated_at"
  | "area"
  | "cadence"
  | "due_day"
  | "due_month"
  | "due_date"
  | "alert_days"
  | "notes"
  | "active"
> & {
  id?: UUID;
  area?: string;
  cadence?: ObligationCadence;
  due_day?: number | null;
  due_month?: number | null;
  due_date?: DateString | null;
  alert_days?: number;
  notes?: string | null;
  active?: boolean;
};

export type ObligationCompletionInsert = Omit<
  ObligationCompletion,
  "id" | "created_at" | "completed_at" | "notes"
> & {
  id?: UUID;
  completed_at?: DateString;
  notes?: string | null;
};

// -------------------------------------------------------------
// Pessoas (20260923120000_pessoas.sql)
// -------------------------------------------------------------

/** Vínculo da pessoa com a agência. */
export type TeamKind = "Sócia" | "Freelancer" | "Prestador";

/**
 * team_members — quem RECEBE dinheiro da agência.
 * Diferente de `Profile`, que é quem FAZ LOGIN; `profile_id` liga as
 * duas quando é a mesma pessoa.
 */
export type TeamMember = {
  id: UUID;
  name: string;
  kind: TeamKind;
  role: string | null;
  profile_id: UUID | null;
  /** Pró-labore mensal ou diária/cachê de referência. */
  default_rate: number | null;
  contact: string | null;
  payment_info: string | null;
  notes: string | null;
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export type TeamMemberInsert = Omit<
  TeamMember,
  | "id"
  | "created_at"
  | "updated_at"
  | "kind"
  | "role"
  | "profile_id"
  | "default_rate"
  | "contact"
  | "payment_info"
  | "notes"
  | "active"
> & {
  id?: UUID;
  kind?: TeamKind;
  role?: string | null;
  profile_id?: UUID | null;
  default_rate?: number | null;
  contact?: string | null;
  payment_info?: string | null;
  notes?: string | null;
  active?: boolean;
};

// -------------------------------------------------------------
// Tipos de Insert / Update (colunas com default são opcionais)
// -------------------------------------------------------------

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at"> & {
  role?: UserRole;
  avatar_url?: string | null;
};
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export type ClientInsert = Omit<
  Client,
  "id" | "created_at" | "updated_at" | "active" | "color" | "niche" | "monthly_goal" | "notes"
> & {
  id?: UUID;
  active?: boolean;
  color?: string | null;
  niche?: string | null;
  monthly_goal?: number | null;
  notes?: string | null;
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
  | "cover_source_id"
  | "editing_date"
  | "editing_time"
> & {
  id?: UUID;
  status?: ContentStatus;
  reference_url?: string | null;
  recording_time?: string | null;
  cover_source_id?: UUID | null;
  editing_date?: DateString | null;
  editing_time?: string | null;
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
      client_files: {
        Row: ClientFile;
        Insert: ClientFileInsert;
        Update: Partial<ClientFileInsert>;
        Relationships: [];
      };
      client_onboarding: {
        Row: ClientOnboarding;
        Insert: ClientOnboardingInsert;
        Update: Partial<ClientOnboardingInsert>;
        Relationships: [];
      };
      client_reports: {
        Row: ClientReport;
        Insert: ClientReportInsert;
        Update: Partial<ClientReportInsert>;
        Relationships: [];
      };
      client_diagnostics: {
        Row: ClientDiagnostic;
        Insert: ClientDiagnosticInsert;
        Update: Partial<ClientDiagnosticInsert>;
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
      financial_settings: {
        Row: FinancialSettings;
        Insert: FinancialSettingsInsert;
        Update: FinancialSettingsUpdate;
        Relationships: [];
      };
      financial_categories: {
        Row: FinancialCategory;
        Insert: FinancialCategoryInsert;
        Update: Partial<FinancialCategoryInsert>;
        Relationships: [];
      };
      financial_recurrences: {
        Row: FinancialRecurrence;
        Insert: FinancialRecurrenceInsert;
        Update: Partial<FinancialRecurrenceInsert>;
        Relationships: [];
      };
      financial_entries: {
        Row: FinancialEntry;
        Insert: FinancialEntryInsert;
        Update: Partial<FinancialEntryInsert>;
        Relationships: [];
      };
      commercial_leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: Partial<LeadInsert>;
        Relationships: [];
      };
      commercial_proposals: {
        Row: Proposal;
        Insert: ProposalInsert;
        Update: Partial<ProposalInsert>;
        Relationships: [];
      };
      company_files: {
        Row: CompanyFile;
        Insert: CompanyFileInsert;
        Update: Partial<CompanyFileInsert>;
        Relationships: [];
      };
      company_obligations: {
        Row: Obligation;
        Insert: ObligationInsert;
        Update: Partial<ObligationInsert>;
        Relationships: [];
      };
      obligation_completions: {
        Row: ObligationCompletion;
        Insert: ObligationCompletionInsert;
        Update: Partial<ObligationCompletionInsert>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: TeamMemberInsert;
        Update: Partial<TeamMemberInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      content_status: ContentStatus;
      content_priority: ContentPriority;
      financial_kind: FinancialKind;
      financial_status: FinancialStatus;
      lead_stage: LeadStage;
      proposal_status: ProposalStatus;
      obligation_cadence: ObligationCadence;
      team_kind: TeamKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
