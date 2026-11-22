import { z } from "zod";
import { paraNumero } from "@/lib/financeiro/valores";

/** Schemas do comercial (Zod), usados no cliente e no servidor. */

const VALOR_OPCIONAL = z
  .string()
  .trim()
  .refine((v) => !v || paraNumero(v) !== null, "Valor inválido")
  .refine((v) => !v || (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo")
  .optional();

const DATA = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .or(z.literal(""))
  .optional();

export const leadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da oportunidade")
    .max(120, "Use no máximo 120 caracteres"),
  contact_name: z.string().trim().max(120).or(z.literal("")).optional(),
  contact_email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .or(z.literal(""))
    .optional(),
  contact_phone: z.string().trim().max(40).or(z.literal("")).optional(),
  source: z.string().trim().max(40).or(z.literal("")).optional(),
  channel: z.enum([
    "Social selling",
    "Tráfego pago",
    "Instagram orgânico",
    "Indicação",
    "Evento",
    "Grupos e WhatsApp",
    "Parceria",
    "Visita presencial",
    "Outro",
  ]),
  /**
   * Obrigatória, como no protótipo da Vitória. Uma temperatura em
   * branco não ordena fila nenhuma, e um campo que pode ficar em
   * branco fica em branco.
   */
  temperature: z.enum(["Quente", "Morno", "Frio"], {
    errorMap: () => ({ message: "Escolha a temperatura" }),
  }),
  stage: z.enum([
    "Novo lead",
    "Primeiro contato",
    "Em conversa",
    "Diagnóstico",
    "Reunião marcada",
    "Proposta apresentada",
    "Negociação",
    "Fechado",
    "Perdido",
  ]),
  estimated_monthly: VALOR_OPCIONAL,
  /**
   * Quando é a reunião, já como INSTANTE (ISO com fuso).
   *
   * O `<input type="datetime-local">` devolve "2026-11-12T16:05", sem
   * fuso nenhum — e o servidor roda em UTC. Se essa string chegasse
   * crua lá, a reunião das 16h de Boa Vista viraria 16h UTC, ou seja
   * 12h aqui. Por isso quem converte é o navegador, que é o único que
   * sabe o fuso de quem está marcando, e o que viaja é o instante.
   */
  meeting_at: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data da reunião inválida")
    .or(z.literal(""))
    .optional(),
  /** "YYYY-MM-DD", ou vazio. Sugerido pela etapa ao mover. */
  next_contact_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .or(z.literal(""))
    .optional(),
  notes: z.string().trim().max(2000).or(z.literal("")).optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const LEAD_FORM_PADRAO: LeadFormValues = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "",
  channel: "Social selling",
  temperature: "Morno",
  next_contact_on: "",
  stage: "Novo lead",
  estimated_monthly: "",
  meeting_at: "",
  notes: "",
};

export const propostaFormSchema = z
  .object({
    monthly_amount: z
      .string()
      .trim()
      .min(1, "Informe o valor mensal")
      .refine((v) => paraNumero(v) !== null, "Valor inválido")
      .refine((v) => (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo"),
    setup_amount: VALOR_OPCIONAL,
    monthly_goal: z
      .string()
      .trim()
      .regex(/^\d*$/, "Use apenas números")
      .optional(),
    scope: z.string().trim().max(1000).or(z.literal("")).optional(),
    status: z.enum(["Rascunho", "Apresentada", "Aceita", "Recusada"]),
    sent_at: DATA,
    valid_until: DATA,
    notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  })
  .refine(
    (v) => !v.sent_at || !v.valid_until || v.valid_until >= v.sent_at,
    { message: "A validade não pode ser anterior ao envio", path: ["valid_until"] },
  );

export type PropostaFormValues = z.infer<typeof propostaFormSchema>;

export const PROPOSTA_FORM_PADRAO: PropostaFormValues = {
  monthly_amount: "",
  setup_amount: "",
  monthly_goal: "",
  scope: "",
  status: "Rascunho",
  sent_at: "",
  valid_until: "",
  notes: "",
};

/** Dados do fechamento de um negócio ganho. */
export const fechamentoSchema = z.object({
  mesInicio: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM"),
  meses: z
    .string()
    .trim()
    .regex(/^\d*$/, "Use apenas números")
    .refine((v) => !v || Number(v) <= 120, "No máximo 120 meses")
    .optional(),
  diaVencimento: z
    .string()
    .trim()
    .regex(/^\d*$/, "Use apenas números")
    .refine((v) => !v || (Number(v) >= 1 && Number(v) <= 31), "Use um dia entre 1 e 31")
    .optional(),
});

export type FechamentoValues = z.infer<typeof fechamentoSchema>;

/**
 * Uma atividade: o que precisa ser feito com um cliente.
 *
 * O prazo é opcional de propósito. "Ligar para a Laura" sem dia é uma
 * anotação legítima; obrigar uma data faria a pessoa inventar uma, e
 * data inventada entope a fila de falso atraso.
 */
export const atividadeFormSchema = z.object({
  kind: z.enum(["Tarefa", "Reunião", "Ligação", "WhatsApp"]),
  subject: z
    .string()
    .trim()
    .min(2, "Escreva o que precisa ser feito")
    .max(200, "Use no máximo 200 caracteres"),
  /** "YYYY-MM-DDTHH:mm" no fuso da agência, ou vazio. */
  due_at: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Prazo inválido")
    .or(z.literal(""))
    .optional(),
  /** "YYYY-MM-DD", ou vazio. Sugerido pela etapa ao mover. */
  next_contact_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .or(z.literal(""))
    .optional(),
  notes: z.string().trim().max(2000).or(z.literal("")).optional(),
});

export type AtividadeFormValues = z.infer<typeof atividadeFormSchema>;

export const ATIVIDADE_FORM_PADRAO: AtividadeFormValues = {
  kind: "Tarefa",
  subject: "",
  due_at: "",
  notes: "",
};

/**
 * Um lançamento de investimento num canal.
 *
 * Sem isto o Painel de canais não consegue dizer qual canal compensa:
 * ele sabe quantos fecharam, e não quanto custou.
 */
export const investimentoFormSchema = z.object({
  mes: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido"),
  channel: z.enum([
    "Social selling",
    "Tráfego pago",
    "Instagram orgânico",
    "Indicação",
    "Evento",
    "Grupos e WhatsApp",
    "Parceria",
    "Visita presencial",
    "Outro",
  ]),
  amount: z
    .string()
    .trim()
    .min(1, "Informe o valor")
    .refine((v) => paraNumero(v) !== null, "Valor inválido")
    .refine((v) => (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo"),
  notes: z.string().trim().max(200).or(z.literal("")).optional(),
});

export type InvestimentoFormValues = z.infer<typeof investimentoFormSchema>;
