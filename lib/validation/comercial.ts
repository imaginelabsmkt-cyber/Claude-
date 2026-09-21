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
  stage: z.enum([
    "Contato feito",
    "Diagnóstico",
    "Proposta enviada",
    "Negociação",
    "Fechado",
    "Perdido",
  ]),
  estimated_monthly: VALOR_OPCIONAL,
  notes: z.string().trim().max(2000).or(z.literal("")).optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const LEAD_FORM_PADRAO: LeadFormValues = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "",
  stage: "Contato feito",
  estimated_monthly: "",
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
    status: z.enum(["Rascunho", "Enviada", "Aceita", "Recusada"]),
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
