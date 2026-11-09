import { z } from "zod";
import { paraNumero } from "@/lib/financeiro/valores";

const data = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida (use o calendário)");

const dataOpcional = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
  .or(z.literal(""))
  .optional();

/** Schema do contrato de cliente. */
export const contratoFormSchema = z
  .object({
    client_id: z.string().uuid("Escolha o cliente"),
    status: z.enum(["Ativo", "Pausado", "Encerrado"]),
    monthly_amount: z
      .string()
      .trim()
      .min(1, "Informe a mensalidade")
      .refine((v) => paraNumero(v) !== null, "Valor inválido")
      .refine((v) => (paraNumero(v) ?? -1) >= 0, "O valor não pode ser negativo"),
    scope: z.string().trim().max(2000).or(z.literal("")).optional(),
    start_date: data,
    end_date: dataOpcional,
    readjust_index: z.string().trim().max(20).or(z.literal("")).optional(),
    last_readjust: dataOpcional,
    signed_at: dataOpcional,
    notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: "O fim não pode ser antes do início",
    path: ["end_date"],
  });

export type ContratoFormValues = z.infer<typeof contratoFormSchema>;

export const CONTRATO_FORM_PADRAO: Omit<ContratoFormValues, "client_id"> = {
  status: "Ativo",
  monthly_amount: "",
  scope: "",
  start_date: "",
  end_date: "",
  readjust_index: "",
  last_readjust: "",
  signed_at: "",
  notes: "",
};

/** Índices que a agência costuma usar. O campo aceita qualquer texto. */
export const INDICES_DE_REAJUSTE = ["IPCA", "IGP-M", "INPC"];
