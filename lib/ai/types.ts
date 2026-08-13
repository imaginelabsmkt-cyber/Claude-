/** Análise "mastigada" de um relatório, produzida pela IA. */
export interface RelatorioAnalise {
  periodo?: string;
  resumo?: string;
  indicadores?: { rotulo: string; valor: string; variacao?: string }[];
  positivos?: string[];
  negativos?: string[];
  recomendacoes?: string[];
}
