import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "favie · Gestão de conteúdo para social media",
  description:
    "O favie é o sistema interno da agência favie para planejar, produzir e acompanhar o conteúdo de social media dos clientes, com integração ao Google Agenda, Tarefas, Planilhas e Drive.",
  robots: { index: true, follow: true },
};

/**
 * Página pública (sem login) que explica o que é o favie e para que serve.
 * Serve de "página inicial" do app na tela de permissão OAuth do Google.
 */
export default function SobrePage() {
  return (
    <main className="min-h-screen bg-[#fff7ea] px-6 py-16 text-[#3a1020]">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#7b2340]">
          favie
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Gestão de produção de conteúdo para social media
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#55414a]">
          O favie é o sistema interno da agência <strong>favie</strong> para
          planejar, produzir e acompanhar o conteúdo de social media dos seus
          clientes: do planejamento mensal à gravação, edição, aprovação,
          postagem e aos resultados de tráfego pago.
        </p>

        <h2 className="mt-10 text-xl font-bold">O que o sistema faz</h2>
        <ul className="mt-3 space-y-2 text-[#55414a]">
          <li>• Organiza o planejamento de conteúdo de cada cliente por mês.</li>
          <li>
            • Acompanha cada etapa: roteiro, gravação, edição, aprovação e
            postagem.
          </li>
          <li>
            • Dá a cada cliente um painel próprio (por link privado) com os
            conteúdos e os resultados.
          </li>
          <li>
            • Registra os resultados de tráfego pago e o retorno informado pelo
            cliente.
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">Integração com o Google</h2>
        <p className="mt-3 text-[#55414a]">
          Com a autorização da conta da agência, o favie sincroniza o trabalho
          com o Google (sempre de mão única, do sistema para o Google):
        </p>
        <ul className="mt-3 space-y-2 text-[#55414a]">
          <li>
            • <strong>Agenda:</strong> cria eventos de gravação e de postagem.
          </li>
          <li>
            • <strong>Tarefas:</strong> cria as tarefas de edição com o
            quadradinho de concluir.
          </li>
          <li>
            • <strong>Planilhas e Drive:</strong> cria e preenche uma planilha
            de resultados por cliente e gera o link para o cliente acompanhar.
          </li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[#7b2340] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Entrar no sistema
          </Link>
          <Link
            href="/privacidade"
            className="rounded-lg border border-[#7b2340]/30 px-5 py-2.5 text-sm font-semibold text-[#7b2340] hover:bg-[#7b2340]/5"
          >
            Política de privacidade
          </Link>
        </div>

        <p className="mt-12 text-sm text-[#8a7680]">
          Uso interno da agência favie. Contato:{" "}
          <a
            href="mailto:imaginelabs.mkt@gmail.com"
            className="font-medium text-[#7b2340] hover:underline"
          >
            imaginelabs.mkt@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
