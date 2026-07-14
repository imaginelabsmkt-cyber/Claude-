import { z } from "zod";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type ContentPriority,
  type ContentStatus,
} from "@/types";

const STATUS_TUPLE = STATUS_OPTIONS as [ContentStatus, ...ContentStatus[]];
const PRIORITY_TUPLE = PRIORITY_OPTIONS as [
  ContentPriority,
  ...ContentPriority[],
];

// Helpers para campos opcionais em texto/data/url/uuid (aceitam "").
const textoOpcional = (max = 2000) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres`).optional();
const dataOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .or(z.literal(""))
  .optional();
const urlOpcional = z
  .string()
  .trim()
  .url("Link inválido (inclua http:// ou https://)")
  .or(z.literal(""))
  .optional();
const uuidOpcional = z
  .string()
  .uuid("Responsável inválido")
  .or(z.literal(""))
  .optional();

/**
 * Schema do formulário de conteúdo. Recebe os valores do formulário
 * (strings) e produz os campos tipados (números coeridos). A conversão
 * para arrays/null acontece na server action.
 */
export const contentFormSchema = z.object({
  // Obrigatórios
  client_id: z.string().uuid("Selecione um cliente"),
  title: z.string().trim().min(1, "Informe o título").max(200),
  format: z.string().trim().min(1, "Selecione o formato"),
  status: z.enum(STATUS_TUPLE),
  priority: z.enum(PRIORITY_TUPLE),
  reference_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Selecione o mês de referência"),
  planned_week: z.coerce
    .number({ invalid_type_error: "Informe a semana" })
    .int("Semana inválida")
    .min(1, "Semana entre 1 e 6")
    .max(6, "Semana entre 1 e 6"),

  // Opcionais — texto
  description: textoOpcional(),
  content_pillar: textoOpcional(120),
  objective: textoOpcional(200),
  recording_location: textoOpcional(160),
  participants: textoOpcional(),
  outfit: textoOpcional(160),
  required_materials: textoOpcional(),
  notes: textoOpcional(),

  // Opcionais — datas
  planned_date: dataOpcional,
  actual_post_date: dataOpcional,
  recording_date: dataOpcional,
  script_deadline: dataOpcional,
  recording_deadline: dataOpcional,
  editing_deadline: dataOpcional,

  // Opcionais — links
  script_url: urlOpcional,
  raw_files_url: urlOpcional,
  edited_file_url: urlOpcional,
  published_url: urlOpcional,

  // Opcionais — responsáveis
  planner_id: uuidOpcional,
  recorder_id: uuidOpcional,
  editor_id: uuidOpcional,
  publisher_id: uuidOpcional,

  // Opcionais — controle
  revision_count: z.coerce.number().int().min(0).default(0),
  requires_recording: z.boolean(),
  is_fixed_date: z.boolean(),
  is_campaign: z.boolean(),
});

/** Tipo dos valores mantidos no estado do formulário (strings). */
export interface ContentFormValues {
  client_id: string;
  title: string;
  format: string;
  status: ContentStatus;
  priority: ContentPriority;
  reference_month: string;
  planned_week: string;
  description: string;
  content_pillar: string;
  objective: string;
  recording_location: string;
  participants: string;
  outfit: string;
  required_materials: string;
  notes: string;
  planned_date: string;
  actual_post_date: string;
  recording_date: string;
  script_deadline: string;
  recording_deadline: string;
  editing_deadline: string;
  script_url: string;
  raw_files_url: string;
  edited_file_url: string;
  published_url: string;
  planner_id: string;
  recorder_id: string;
  editor_id: string;
  publisher_id: string;
  revision_count: string;
  requires_recording: boolean;
  is_fixed_date: boolean;
  is_campaign: boolean;
}

/** Valores iniciais para um novo conteúdo. */
export const CONTENT_FORM_PADRAO: ContentFormValues = {
  client_id: "",
  title: "",
  format: "",
  status: "Planejamento",
  priority: "Média",
  reference_month: "",
  planned_week: "1",
  description: "",
  content_pillar: "",
  objective: "",
  recording_location: "",
  participants: "",
  outfit: "",
  required_materials: "",
  notes: "",
  planned_date: "",
  actual_post_date: "",
  recording_date: "",
  script_deadline: "",
  recording_deadline: "",
  editing_deadline: "",
  script_url: "",
  raw_files_url: "",
  edited_file_url: "",
  published_url: "",
  planner_id: "",
  recorder_id: "",
  editor_id: "",
  publisher_id: "",
  revision_count: "0",
  requires_recording: false,
  is_fixed_date: false,
  is_campaign: false,
};
