"use client";

import { Button } from "@/components/ui/button";

/**
 * Manda o navegador imprimir. A folha de estilo de impressão
 * (`globals.css`) esconde menu e botões, então sai só o relatório.
 */
export function BotaoImprimir() {
  return (
    <Button variante="secundaria" onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </Button>
  );
}
