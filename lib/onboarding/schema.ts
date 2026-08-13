/**
 * Estrutura do ONBOARD / DNA do cliente.
 *
 * Definido em código (não no banco) para poder evoluir sem migração: os
 * valores ficam num JSONB (client_onboarding.data) chaveados por `id`.
 * Quando a Fran mandar o formulário oficial, é só ajustar as seções/campos
 * aqui — nada muda no banco.
 */

export interface CampoOnboarding {
  id: string;
  rotulo: string;
  /** Dica exibida como placeholder. */
  dica?: string;
  /** Campo curto (uma linha) em vez de área de texto. */
  curto?: boolean;
}

export interface SecaoOnboarding {
  id: string;
  titulo: string;
  descricao?: string;
  /** Ícone (mesmo conjunto de components/ui/icon). */
  icone: string;
  campos: CampoOnboarding[];
}

export const ONBOARDING_SECOES: SecaoOnboarding[] = [
  {
    id: "principais",
    titulo: "Informações principais",
    descricao: "Quem é o cliente e os dados essenciais.",
    icone: "clipboard",
    campos: [
      { id: "marca", rotulo: "Marca / nome", curto: true },
      { id: "segmento", rotulo: "Nicho / segmento", curto: true },
      { id: "responsavel_cliente", rotulo: "Contato principal", curto: true },
      { id: "instagram", rotulo: "Instagram (@)", curto: true },
      { id: "cidade", rotulo: "Cidade / região", curto: true },
      { id: "inicio", rotulo: "Cliente desde", curto: true },
      { id: "sobre", rotulo: "Sobre o cliente", dica: "Resumo do negócio, serviços, diferenciais." },
    ],
  },
  {
    id: "publico",
    titulo: "Público-alvo",
    descricao: "Para quem a gente fala.",
    icone: "users",
    campos: [
      { id: "publico", rotulo: "Quem é o público" },
      { id: "dores", rotulo: "Dores e objeções" },
      { id: "desejos", rotulo: "Desejos e sonhos" },
    ],
  },
  {
    id: "dna",
    titulo: "DNA do conteúdo",
    descricao: "A cara do conteúdo deste cliente.",
    icone: "sparkles",
    campos: [
      { id: "tom", rotulo: "Tom de voz", dica: "Ex.: acolhedor, técnico, divertido…" },
      { id: "estilo", rotulo: "Estilo visual", dica: "Cores, referências estéticas, edição." },
      { id: "pilares", rotulo: "Pilares de conteúdo", dica: "Os temas que se repetem." },
      { id: "fazer", rotulo: "O que sempre fazer" },
      { id: "evitar", rotulo: "O que evitar" },
    ],
  },
  {
    id: "objetivos",
    titulo: "Objetivos e direção",
    descricao: "Onde a gente precisa chegar com este cliente.",
    icone: "target",
    campos: [
      { id: "objetivo", rotulo: "Objetivo principal" },
      { id: "metas", rotulo: "Metas", dica: "Seguidores, leads, vendas, autoridade…" },
      { id: "norte", rotulo: "Onde queremos chegar", dica: "A visão de médio/longo prazo." },
    ],
  },
  {
    id: "referencias",
    titulo: "Referências e observações",
    icone: "eye",
    campos: [
      { id: "referencias", rotulo: "Perfis de referência" },
      { id: "concorrentes", rotulo: "Concorrentes" },
      { id: "observacoes", rotulo: "Outras observações" },
    ],
  },
];
