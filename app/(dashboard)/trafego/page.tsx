import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { WeekPanel } from "@/components/traffic/week-panel";
import {
  listarCobrancasDaSemana,
  listarSemanas,
} from "@/lib/data/traffic";
import { resumoSemana, segundaDaSemana } from "@/lib/rules/traffic";
import { provedorAtual } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { semana?: string };
}

/** Painel semanal de cobranças de tráfego. */
export default async function TrafegoPage({ searchParams }: PageProps) {
  const semana = searchParams.semana ?? segundaDaSemana();
  const [charges, semanas] = await Promise.all([
    listarCobrancasDaSemana(semana),
    listarSemanas(),
  ]);
  const resumo = resumoSemana(charges);
  const simulacao = provedorAtual() === "simulacao";

  return (
    <>
      <PageHeader
        titulo="Tráfego"
        descricao="Cobranças de tráfego da semana e envio pelo WhatsApp"
        acao={
          <Link href="/trafego/configuracoes">
            <Button variante="secundaria">Configurações</Button>
          </Link>
        }
      />

      <WeekPanel
        semana={semana}
        semanas={semanas}
        charges={charges}
        resumo={resumo}
        simulacao={simulacao}
      />
    </>
  );
}
