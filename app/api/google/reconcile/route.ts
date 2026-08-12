import { NextResponse } from "next/server";
import { reconciliarTarefasGoogle } from "@/lib/google/reconcile";

/**
 * Reconciliação Google -> sistema, disparada pelo cliente ao abrir o app
 * (fora do render, para não bloquear a página nem correr com prefetch).
 * A sessão é exigida pelo middleware; o reconcile tem freio interno de 2 min.
 */
export async function POST() {
  await reconciliarTarefasGoogle();
  return NextResponse.json({ ok: true });
}
