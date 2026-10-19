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
  searchParams: { semana?: string; rsem?: string };
}

function addSemanas(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Segunda-feira (ISO) da semana que contém a data. */
function segundaISO(d: Date): string {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - dow);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Painel do cliente, acesso por link secreto, visão limpa da semana. */
export default async function PortalPage({ params, searchParams }: PageProps) {
  const dados = await carregarPortal(
    params.token,
    searchParams.semana,
    searchParams.rsem,
  );

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

  // Navegação da semana de RESULTADO (independente das postagens). Mantém a
  // semana de postagens (?semana) e só troca ?rsem. Não deixa passar da última
  // semana já fechada (não tem resultado de semana que não acabou).
  const rsemQS = (rsem: string) => {
    const p = new URLSearchParams();
    if (/^\d{4}-\d{2}-\d{2}$/.test(searchParams.semana ?? ""))
      p.set("semana", searchParams.semana!);
    p.set("rsem", rsem);
    return p.toString();
  };
  const ultimaFechadaISO = addSemanas(segundaISO(new Date()), -1);
  const resISO = dados.resultado.weekStart;
  const proximoResISO = addSemanas(resISO, 1);

  return (
    <PortalView
      token={params.token}
      dados={dados}
      hrefSemana={{
        anterior: `/portal/${params.token}?semana=${addSemanas(dados.semanaISO, -1)}`,
        proximo: `/portal/${params.token}?semana=${addSemanas(dados.semanaISO, 1)}`,
        hoje: `/portal/${params.token}`,
      }}
      hrefResultado={{
        anterior: `/portal/${params.token}?${rsemQS(addSemanas(resISO, -1))}`,
        proximo:
          proximoResISO <= ultimaFechadaISO
            ? `/portal/${params.token}?${rsemQS(proximoResISO)}`
            : null,
      }}
    />
  );
}
