import { z } from "zod";
import { paraNumero } from "@/lib/financeiro/valores";

/**
 * Schemas de validação do módulo financeiro (Zod).
 * Reutilizados no cliente (feedback imediato) e no servidor (segurança).
 */

const MES = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM");

const DATA = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .or(z.literal(""))
  .optional();

/** Valor monetário digitado como texto ("1.700,00"), convertido e validado. */
const VALOR = z
  .string()
  .trim()
  .min(1, "Informe o valor")
  .refine((v) => paraNumero(v) !== null, "Valor inválido")
  .refine((v) => (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo")
  .refine((v) => (paraNumero(v) ?? 0) <= 99_999_999, "Valor acima do limite");

export const lancamentoFormSchema = z.object({
  reference_month: MES,
  kind: z.enum(["Receita", "Despesa"], { message: "Escolha receita ou despesa" }),
  category_id: z.string().uuid("Escolha uma categoria"),
  client_id: z.string().uuid().or(z.literal("")).optional(),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição")
    .max(160, "Use no máximo 160 caracteres"),
  amount: VALOR,
  status: z.enum(["Pago", "Pendente"]),
  due_date: DATA,
  paid_date: DATA,
  payment_method: z.string().trim().max(40).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000, "Use no máximo 1000 caracteres").or(z.literal("")).optional(),
});

export type LancamentoFormValues = z.infer<typeof lancamentoFormSchema>;

/** Valores iniciais de um novo lançamento (o mês vem da tela). */
export function lancamentoPadrao(mes: string): LancamentoFormValues {
  return {
    reference_month: mes,
    kind: "Receita",
    category_id: "",
    client_id: "",
    description: "",
    amount: "",
    status: "Pendente",
    due_date: "",
    paid_date: "",
    payment_method: "",
    notes: "",
  };
}

export const recorrenciaFormSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição")
      .max(160, "Use no máximo 160 caracteres"),
    kind: z.enum(["Receita", "Despesa"]),
    category_id: z.string().uuid("Escolha uma categoria"),
    client_id: z.string().uuid().or(z.literal("")).optional(),
    amount: VALOR,
    due_day: z
      .string()
      .trim()
      .regex(/^\d*$/, "Use apenas números")
      .refine((v) => !v || (Number(v) >= 1 && Number(v) <= 31), "Use um dia entre 1 e 31")
      .optional(),
    start_month: MES,
    end_month: MES.or(z.literal("")).optional(),
    active: z.boolean(),
    notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  })
  .refine((v) => !v.end_month || v.end_month >= v.start_month, {
    message: "O mês final não pode ser anterior ao inicial",
    path: ["end_month"],
  });

export type RecorrenciaFormValues = z.infer<typeof recorrenciaFormSchema>;

/** Valores iniciais de uma nova recorrência. */
export function recorrenciaPadrao(mes: string): RecorrenciaFormValues {
  return {
    description: "",
    kind: "Receita",
    category_id: "",
    client_id: "",
    amount: "",
    due_day: "",
    start_month: mes,
    end_month: "",
    active: true,
    notes: "",
  };
}

export const configuracaoFinanceiraSchema = z.object({
  opening_balance: z
    .string()
    .trim()
    .refine((v) => paraNumero(v) !== null, "Valor inválido"),
  opening_month: MES,
});

export type ConfiguracaoFinanceiraValues = z.infer<
  typeof configuracaoFinanceiraSchema
>;

export const categoriaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria")
    .max(80, "Use no máximo 80 caracteres"),
  kind: z.enum(["Receita", "Despesa"]),
  sort_order: z.string().trim().regex(/^\d*$/, "Use apenas números").optional(),
  active: z.boolean(),
});

export type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;
