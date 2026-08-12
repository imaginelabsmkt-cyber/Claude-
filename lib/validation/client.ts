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
  // --- Cobrança de tráfego ---
  whatsapp: z
    .string()
    .trim()
    .max(30, "Número muito longo")
    .refine(
      (v) => !v || v.replace(/\D/g, "").length >= 10,
      "Informe DDD + número (ex.: 11 98765-4321)",
    )
    .or(z.literal(""))
    .optional(),
  traffic_billing_active: z.boolean(),
  traffic_value: z
    .string()
    .trim()
    .regex(/^(\d{1,7}([.,]\d{1,2})?)?$/, "Use um valor válido, ex.: 500 ou 500,00")
    .optional(),
  traffic_pix_code: z
    .string()
    .trim()
    .max(2000, "Código Pix muito longo")
    .or(z.literal(""))
    .optional(),
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
  whatsapp: "",
  traffic_billing_active: false,
  traffic_value: "",
  traffic_pix_code: "",
};
