import type { ReactNode } from "react";

interface SecaoProps {
  /** O que esta parte da tela é, em palavras que a Fran usa. */
  titulo: string;
  /**
   * Uma linha dizendo o que ela responde. Não é enfeite: é o que faz a
   * pessoa entender o bloco sem perguntar para ninguém.
   */
  explicacao?: string;
  /** Canto direito: um link para a tela que detalha o bloco. */
  acao?: ReactNode;
  children: ReactNode;
}

/**
 * Um bloco nomeado da tela.
 *
 * Toda parte do sistema tem um título e uma frase de explicação, sempre
 * no mesmo lugar e no mesmo tamanho. É o que responde "o que é isso?"
 * antes de a pessoa precisar clicar para descobrir.
 */
export function Secao({ titulo, explicacao, acao, children }: SecaoProps) {
  return (
    <section className="mb-7">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
          {explicacao ? (
            <p className="mt-0.5 text-[13px] leading-snug text-gray-500">
              {explicacao}
            </p>
          ) : null}
        </div>
        {acao ? <div className="shrink-0 text-sm">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
