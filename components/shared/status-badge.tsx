import { Badge } from "@/components/ui/badge";
import {
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS_CONTEUDO,
  type Prioridade,
  type StatusConteudo,
} from "@/types";

const TOM_STATUS: Record<
  StatusConteudo,
  "cinza" | "azul" | "verde" | "amarelo" | "vermelho" | "roxo"
> = {
  ideia: "cinza",
  roteiro: "azul",
  aprovado: "roxo",
  gravacao: "amarelo",
  edicao: "amarelo",
  revisao: "azul",
  agendado: "roxo",
  publicado: "verde",
};

const TOM_PRIORIDADE: Record<
  Prioridade,
  "cinza" | "azul" | "amarelo" | "vermelho"
> = {
  baixa: "cinza",
  media: "azul",
  alta: "amarelo",
  urgente: "vermelho",
};

/** Badge de status do conteúdo com rótulo em pt-BR. */
export function StatusConteudoBadge({ status }: { status: StatusConteudo }) {
  return <Badge tom={TOM_STATUS[status]}>{ROTULOS_STATUS_CONTEUDO[status]}</Badge>;
}

/** Badge de prioridade com rótulo em pt-BR. */
export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  return (
    <Badge tom={TOM_PRIORIDADE[prioridade]}>
      {ROTULOS_PRIORIDADE[prioridade]}
    </Badge>
  );
}
