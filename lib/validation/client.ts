import { z } from "zod";

/**
 * Schema de validação do formulário de cliente (Zod).
 * Reutilizado no cliente (feedback imediato) e no servidor (segurança).
 */
export const clienteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente")
    .max(120, "Use no máximo 120 caracteres"),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use uma cor no formato #RRGGBB")
    .or(z.literal(""))
    .optional(),
  niche: z
    .string()
    .trim()
    .max(80, "Use no máximo 80 caracteres")
    .or(z.literal(""))
    .optional(),
  monthly_goal: z
    .string()
    .trim()
    .regex(/^\d*$/, "Use apenas números")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Use no máximo 2000 caracteres")
    .or(z.literal(""))
    .optional(),
  active: z.boolean(),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;

/** Valores iniciais para um novo cliente. */
export const CLIENTE_FORM_PADRAO: ClienteFormValues = {
  name: "",
  color: "",
  niche: "",
  monthly_goal: "",
  notes: "",
  active: true,
};
