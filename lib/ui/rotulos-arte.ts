/**
 * Rótulos em linguagem de ARTE (para conteúdos Carrossel / Post estático).
 * Os STATUS no banco são os mesmos do vídeo ("Fila de edição", "Em edição",
 * etc.), mas para arte a Vitória CRIA a arte — não "edita vídeo". Então só o
 * texto exibido muda; o valor/estado continua o mesmo.
 */

const STATUS_ARTE: Record<string, string> = {
  // Em arte não há "roteiro" — o texto é a copy/legenda para o layout.
  "Roteiro pronto": "Copy pronta",
  "Fila de edição": "Fila de criação",
  "Em edição": "Em criação",
};

const ACAO_ARTE: Record<string, string> = {
  "Agendar gravação": "Preparar arte",
  Gravar: "Produzir foto",
  "Adicionar à fila de edição": "Enviar para criação",
  Editar: "Criar arte",
  "Finalizar edição": "Finalizar arte",
};

/** Rótulo de um status para exibição (troca só quando for arte). */
export function rotuloStatus(status: string, arte: boolean): string {
  return arte ? (STATUS_ARTE[status] ?? status) : status;
}

/** Rótulo de uma "próxima ação" para exibição (troca só quando for arte). */
export function rotuloAcao(acao: string, arte: boolean): string {
  return arte ? (ACAO_ARTE[acao] ?? acao) : acao;
}
