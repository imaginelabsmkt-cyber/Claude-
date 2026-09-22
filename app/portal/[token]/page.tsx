import type { Metadata } from "next";
import { carregarPortal } from "@/lib/data/portal";
import { PortalView } from "@/components/portal/portal-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu painel · favie",
  robots: { index: false, follow: false }, // link secreto, fora de buscadores
};

interface PageProps {
  params: { token: string };
  searchParams: { semana?: string };
}

function addSemanas(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Painel do cliente, acesso por link secreto, visão limpa da semana. */
export default async function PortalPage({ params, searchParams }: PageProps) {
  const dados = await carregarPortal(params.token, searchParams.semana);

  if (!dados) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff7ea] px-6 text-center">
        <div>
          <p className="text-2xl font-bold text-brand-800">Link indisponível</p>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            Este link não está mais ativo ou está incorreto. Fale com a sua
            equipe da favie para receber o link atualizado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PortalView
      token={params.token}
      dados={dados}
      hrefSemana={{
        anterior: `/portal/${params.token}?semana=${addSemanas(dados.semanaISO, -1)}`,
        proximo: `/portal/${params.token}?semana=${addSemanas(dados.semanaISO, 1)}`,
        hoje: `/portal/${params.token}`,
      }}
    />
  );
}
