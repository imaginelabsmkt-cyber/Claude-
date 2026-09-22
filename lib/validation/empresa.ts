import { z } from "zod";

/** Schemas do módulo Empresa (obrigações e documentos). */

export const obrigacaoFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Informe o nome da obrigação")
      .max(140, "Use no máximo 140 caracteres"),
    area: z.enum(["contabil", "administrativo"]),
    cadence: z.enum(["Mensal", "Trimestral", "Anual", "Única"]),
    due_day: z.string().trim().regex(/^\d*$/, "Use apenas números").optional(),
    due_month: z.string().trim().regex(/^\d*$/, "Use apenas números").optional(),
    due_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .or(z.literal(""))
      .optional(),
    alert_days: z
      .string()
      .trim()
      .regex(/^\d*$/, "Use apenas números")
      .refine((v) => !v || Number(v) <= 180, "No máximo 180 dias")
      .optional(),
    notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  })
  // As periódicas precisam do dia; a única precisa da data.
  .refine(
    (v) =>
      v.cadence === "Única"
        ? Boolean(v.due_date)
        : Boolean(v.due_day) && Number(v.due_day) >= 1 && Number(v.due_day) <= 31,
    { message: "Informe um dia entre 1 e 31", path: ["due_day"] },
  )
  .refine((v) => v.cadence !== "Única" || Boolean(v.due_date), {
    message: "Informe a data",
    path: ["due_date"],
  })
  // Anual e trimestral precisam saber o mês (o trimestral usa como âncora).
  .refine(
    (v) =>
      v.cadence !== "Anual" && v.cadence !== "Trimestral"
        ? true
        : Boolean(v.due_month) && Number(v.due_month) >= 1 && Number(v.due_month) <= 12,
    { message: "Informe um mês entre 1 e 12", path: ["due_month"] },
  );

export type ObrigacaoFormValues = z.infer<typeof obrigacaoFormSchema>;

export const OBRIGACAO_FORM_PADRAO: ObrigacaoFormValues = {
  title: "",
  area: "contabil",
  cadence: "Mensal",
  due_day: "",
  due_month: "",
  due_date: "",
  alert_days: "7",
  notes: "",
};
