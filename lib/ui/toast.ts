/**
 * Toast global simples (sem dependência externa). Um publish/subscribe no
 * cliente: qualquer componente chama `toast.sucesso(...)` / `toast.erro(...)`
 * e o <Toaster/> montado no layout exibe. Singleton no navegador.
 */
export type TipoToast = "sucesso" | "erro";

export interface Toast {
  id: number;
  tipo: TipoToast;
  texto: string;
}

type Ouvinte = (t: Toast) => void;

const ouvintes = new Set<Ouvinte>();
let seq = 0;

function emitir(tipo: TipoToast, texto: string) {
  seq += 1;
  const t: Toast = { id: seq, tipo, texto };
  ouvintes.forEach((o) => o(t));
}

/** Inscreve um ouvinte; retorna a função para cancelar. */
export function assinarToast(fn: Ouvinte): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export const toast = {
  sucesso: (texto: string) => emitir("sucesso", texto),
  erro: (texto: string) => emitir("erro", texto),
};
