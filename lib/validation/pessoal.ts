import { z } from "zod";
import { paraNumero } from "@/lib/financeiro/valores";
import { mesValido } from "@/lib/financeiro/meses";

const valor = z
  .string()
  .trim()
  .min(1, "Informe o valor")
  .refine((v) => paraNumero(v) !== null, "Valor inválido")
  .refine((v) => (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo");

const mes = z.string().trim().refine(mesValido, "Mês inválido (use AAAA-MM)");

const dia = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{1,2}$/.test(v), "Use um dia de 1 a 31")
  .refine(
    (v) => !v || (Number(v) >= 1 && Number(v) <= 31),
    "Use um dia de 1 a 31",
  )
  .or(z.literal(""))
  .optional();

/** Um gasto (ou receita) pessoal do mês. */
export const gastoPessoalFormSchema = z.object({
  reference_month: mes,
  kind: z.enum(["Receita", "Despesa"]),
  category: z
    .string()
    .trim()
    .min(1, "Informe a categoria")
    .max(60, "Use no máximo 60 caracteres"),
  description: z
    .string()
    .trim()
    .min(1, "Informe a descrição")
    .max(160, "Use no máximo 160 caracteres"),
  amount: valor,
  entry_date: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
    .or(z.literal(""))
    .optional(),
  paid: z.boolean(),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
});

export type GastoPessoalFormValues = z.infer<typeof gastoPessoalFormSchema>;

/** Um item do plano fixo pessoal. */
export const fixoPessoalFormSchema = z
  .object({
    kind: z.enum(["Receita", "Despesa"]),
    category: z
      .string()
      .trim()
      .min(1, "Informe a categoria")
      .max(60, "Use no máximo 60 caracteres"),
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição")
      .max(160, "Use no máximo 160 caracteres"),
    amount: valor,
    due_day: dia,
    start_month: mes,
    end_month: z
      .string()
      .trim()
      .refine((v) => !v || mesValido(v), "Mês inválido (use AAAA-MM)")
      .or(z.literal(""))
      .optional(),
    active: z.boolean(),
  })
  .refine(
    (v) => !v.end_month || v.end_month >= v.start_month,
    { message: "O fim não pode ser antes do início", path: ["end_month"] },
  );

export type FixoPessoalFormValues = z.infer<typeof fixoPessoalFormSchema>;

export const GASTO_PESSOAL_PADRAO: Omit<GastoPessoalFormValues, "reference_month"> = {
  kind: "Despesa",
  category: "",
  description: "",
  amount: "",
  entry_date: "",
  // Nasce pago: o normal é lançar o que já aconteceu.
  paid: true,
  notes: "",
};

export const FIXO_PESSOAL_PADRAO: Omit<FixoPessoalFormValues, "start_month"> = {
  kind: "Despesa",
  category: "",
  description: "",
  amount: "",
  due_day: "",
  end_month: "",
  active: true,
};
