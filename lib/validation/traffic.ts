import { z } from "zod";

/**
 * Validação da configuração do módulo de cobrança de tráfego (Zod).
 * Números chegam como string do formulário e são validados aqui.
 */
export const trafficSettingsSchema = z.object({
  reminder_days: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Use um número de dias válido"),
  reminder_interval: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Use um número de dias válido"),
  reminder_max: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, "Use um número válido"),
  due_offset_days: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, "Use um número de dias válido"),
  charge_template: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem de cobrança")
    .max(2000, "Use no máximo 2000 caracteres"),
  reminder_template: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem de lembrete")
    .max(2000, "Use no máximo 2000 caracteres"),
});

export type TrafficSettingsFormValues = z.infer<typeof trafficSettingsSchema>;
