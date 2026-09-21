import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, displayName } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Porta de entrada. A Favie tem dois sistemas que não se misturam:
 *  - Demandas: a produção de conteúdo dos clientes.
 *  - Interno: a administração da empresa.
 *
 * Um login só, um banco só — mas cada lado com seu menu e sua cara.
 */
export default async function PortaPage() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");

  const portas = [
    {
      href: "/dashboard",
      nome: "Demandas",
      descricao: "Planejamento, conteúdos, gravações, edição e postagens dos clientes.",
      itens: ["Planejamentos", "Conteúdos", "Gravações", "Artes", "Postagens"],
      classe: "border-brand-600 bg-brand-50 text-brand-700",
    },
    {
      href: "/interno",
      nome: "Interno",
      descricao: "A administração da empresa: dinheiro, pessoas, obrigações e contratos.",
      itens: ["Comercial", "Financeiro", "Pessoas", "Contábil", "Administrativo"],
      classe: "border-gray-800 bg-gray-100 text-gray-800",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12">
      <div className="mb-10">
        <span className="block text-3xl font-bold lowercase leading-none tracking-tight text-brand-600">
          favie
        </span>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Olá, {displayName(ctx)}. Onde você quer entrar?
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {portas.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${p.classe.split(" ")[0]}`}
          >
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${p.classe.split(" ").slice(1).join(" ")}`}
            >
              {p.nome}
            </span>
            <p className="mt-3 text-sm text-gray-600">{p.descricao}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {p.itens.map((i) => (
                <li
                  key={i}
                  className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  {i}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Os dois sistemas compartilham o cadastro de clientes — o resto é separado.
      </p>
    </main>
  );
}
