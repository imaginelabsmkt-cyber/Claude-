"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Link de "voltar" que retorna para a aba de onde a pessoa veio (Gravações,
 * Postagens, Fila de edição, Cliente…), e não sempre para Conteúdos.
 *
 * Usa o histórico do navegador: se há uma página anterior DENTRO do sistema,
 * volta pra ela (mantendo filtros/rolagem daquela aba). Se a ficha foi aberta
 * direto (link novo, aba nova, recarregou), cai no destino padrão (`fallback`).
 */
export function VoltarLink({
  fallback,
  fallbackLabel,
  className,
}: {
  fallback: string;
  fallbackLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [podeVoltar, setPodeVoltar] = useState(false);

  useEffect(() => {
    // idx do histórico do Next (>0 = existe página interna anterior). Se não
    // houver idx, usa o tamanho do histórico como aproximação.
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    setPodeVoltar(
      typeof idx === "number" ? idx > 0 : window.history.length > 1,
    );
  }, []);

  const classe =
    className ??
    "mb-4 inline-block text-sm text-brand-700 hover:underline";

  if (podeVoltar) {
    return (
      <button type="button" onClick={() => router.back()} className={classe}>
        ← Voltar
      </button>
    );
  }
  return (
    <Link href={fallback} className={classe}>
      ← {fallbackLabel}
    </Link>
  );
}
