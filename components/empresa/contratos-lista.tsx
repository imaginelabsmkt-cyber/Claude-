"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast";
import { formatarData } from "@/lib/utils";
import type { ContratoCliente } from "@/lib/data/empresa";

/**
 * Contratos assinados dos clientes.
 *
 * Não existe tabela de contratos: o arquivo é um arquivo do cliente
 * (`client_files` marcado como "Contrato"), e o valor e a vigência são
 * a recorrência no financeiro. Esta lista só junta o que está espalhado.
 *
 * Para ANEXAR um contrato, vá à ficha do cliente — é lá que o arquivo
 * pertence, e marcar o tipo como "Contrato" o faz aparecer aqui.
 */
export function ContratosLista({ contratos }: { contratos: ContratoCliente[] }) {
  const supabase = createClient();

  async function baixar(c: ContratoCliente) {
    const { data, error } = await supabase.storage
      .from("client-files")
      .createSignedUrl(c.path, 60, { download: c.name });
    if (error || !data?.signedUrl) {
      toast.erro("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (contratos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
        <p className="text-sm text-gray-600">Nenhum contrato anexado ainda.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
          O contrato assinado é um arquivo do cliente: anexe na ficha dele e marque
          o tipo como <strong>Contrato</strong> — ele passa a aparecer aqui, sem
          deixar de estar lá.
        </p>
        <Link
          href="/clientes"
          className="mt-3 inline-block text-sm font-medium text-area hover:underline"
        >
          Ir para os clientes →
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {contratos.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
          <span className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => baixar(c)}
              className="block truncate text-left text-sm font-medium text-gray-900 hover:text-area hover:underline"
            >
              {c.name}
            </button>
            <span className="block text-xs text-gray-500">
              {c.clienteNome}
              {c.clienteAtivo ? "" : " (inativo)"} · anexado em{" "}
              {formatarData(c.created_at.slice(0, 10))}
            </span>
          </span>
          <Link
            href={`/clientes/${c.client_id}`}
            className="shrink-0 text-xs font-medium text-gray-500 hover:text-area hover:underline"
          >
            ver cliente
          </Link>
        </li>
      ))}
    </ul>
  );
}
