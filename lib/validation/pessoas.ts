import { z } from "zod";
import { paraNumero } from "@/lib/financeiro/valores";

/** Schema do cadastro de pessoas. */
export const pessoaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome")
    .max(120, "Use no máximo 120 caracteres"),
  kind: z.enum(["Sócia", "Freelancer", "Prestador"]),
  role: z.string().trim().max(80).or(z.literal("")).optional(),
  default_rate: z
    .string()
    .trim()
    .refine((v) => !v || paraNumero(v) !== null, "Valor inválido")
    .refine((v) => !v || (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo")
    .optional(),
  contact: z.string().trim().max(120).or(z.literal("")).optional(),
  payment_info: z.string().trim().max(160).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  active: z.boolean(),
});

export type PessoaFormValues = z.infer<typeof pessoaFormSchema>;

export const PESSOA_FORM_PADRAO: PessoaFormValues = {
  name: "",
  kind: "Freelancer",
  role: "",
  default_rate: "",
  contact: "",
  payment_info: "",
  notes: "",
  active: true,
};
