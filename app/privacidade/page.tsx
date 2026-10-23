import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade · favie",
  description:
    "Como o favie coleta, usa e protege os dados, incluindo os dados acessados pelas APIs do Google (Agenda, Tarefas, Planilhas e Drive).",
  robots: { index: true, follow: true },
};

const ATUALIZADO = "23 de outubro de 2026";

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-[#3a1020]">{titulo}</h2>
      <div className="mt-2 space-y-2 leading-relaxed text-[#55414a]">
        {children}
      </div>
    </section>
  );
}

/**
 * Política de privacidade pública (sem login). Exigida pela tela de permissão
 * OAuth do Google. Descreve com honestidade o uso dos dados do Google.
 */
export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#fff7ea] px-6 py-16 text-[#3a1020]">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#7b2340]">
          favie
        </p>
        <h1 className="mt-2 text-3xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-[#8a7680]">
          Última atualização: {ATUALIZADO}
        </p>

        <Secao titulo="Quem somos">
          <p>
            O favie é um sistema interno da agência favie usado pela equipe para
            planejar, produzir e acompanhar o conteúdo de social media dos
            clientes da agência. O acesso é restrito à equipe (por login) e aos
            clientes (por link privado do próprio painel).
          </p>
        </Secao>

        <Secao titulo="Quais dados coletamos">
          <p>Para funcionar, o sistema guarda:</p>
          <ul className="space-y-1">
            <li>
              • Dados da equipe: nome, e-mail e função, usados para login e para
              atribuir responsáveis.
            </li>
            <li>
              • Dados de produção: planejamentos, conteúdos, datas, roteiros e
              status de cada cliente da agência.
            </li>
            <li>
              • Resultados: números de tráfego pago e o retorno que o cliente
              informa no painel dele.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Dados acessados pelas APIs do Google">
          <p>
            Quando um membro da equipe conecta a conta Google da agência, o
            sistema usa as APIs do Google apenas para espelhar o trabalho feito
            dentro do favie, sempre de mão única (do sistema para o Google):
          </p>
          <ul className="space-y-1">
            <li>
              • <strong>Google Agenda:</strong> criar e atualizar os eventos de
              gravação e de postagem gerados pelo sistema.
            </li>
            <li>
              • <strong>Google Tarefas:</strong> criar e atualizar as tarefas de
              edição geradas pelo sistema.
            </li>
            <li>
              • <strong>Google Planilhas:</strong> criar e preencher a planilha
              de resultados de cada cliente.
            </li>
            <li>
              • <strong>Google Drive:</strong> gerar o link de compartilhamento
              apenas da planilha criada pelo próprio sistema (escopo
              drive.file, limitado aos arquivos que o app cria).
            </li>
          </ul>
          <p>
            O sistema não lê, não altera e não apaga outros eventos, tarefas,
            planilhas ou arquivos que você já tenha no Google. A leitura se
            limita a localizar os itens que o próprio sistema criou, para
            atualizá-los em vez de duplicar.
          </p>
        </Secao>

        <Secao titulo="Como usamos os dados">
          <p>
            Os dados são usados só para operar o sistema: organizar a produção,
            manter a agenda e as tarefas da equipe em dia e mostrar os
            resultados aos clientes. Não usamos esses dados para publicidade.
          </p>
        </Secao>

        <Secao titulo="Compartilhamento">
          <p>
            Não vendemos nem compartilhamos os dados com terceiros. Cada cliente
            enxerga apenas o próprio painel. Usamos provedores de infraestrutura
            (hospedagem e banco de dados) apenas para rodar o sistema.
          </p>
          <p>
            O uso das informações recebidas das APIs do Google segue a{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#7b2340] hover:underline"
            >
              Política de Dados de Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado (Limited Use).
          </p>
        </Secao>

        <Secao titulo="Retenção e exclusão">
          <p>
            Os dados ficam guardados enquanto o sistema estiver em uso pela
            agência. A qualquer momento é possível desconectar a conta Google
            nas Configurações, o que interrompe a sincronização. Para solicitar
            a exclusão de dados, fale pelo e-mail abaixo.
          </p>
        </Secao>

        <Secao titulo="Contato">
          <p>
            Dúvidas sobre esta política ou sobre seus dados:{" "}
            <a
              href="mailto:imaginelabs.mkt@gmail.com"
              className="font-medium text-[#7b2340] hover:underline"
            >
              imaginelabs.mkt@gmail.com
            </a>
          </p>
        </Secao>

        <p className="mt-12 text-sm">
          <Link href="/sobre" className="font-medium text-[#7b2340] hover:underline">
            ← Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
