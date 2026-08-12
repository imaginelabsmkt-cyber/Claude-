"use client";

import { useEffect } from "react";

/**
 * Dispara a reconciliação com o Google ao carregar o app (uma vez por
 * montagem, fora do render do servidor). O endpoint tem freio de 2 min.
 */
export function GoogleReconciler() {
  useEffect(() => {
    fetch("/api/google/reconcile", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
