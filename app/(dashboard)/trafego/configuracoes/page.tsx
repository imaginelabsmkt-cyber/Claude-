import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/traffic/settings-form";
import { obterSettings } from "@/lib/data/traffic";

export const dynamic = "force-dynamic";

/** Configurações do módulo de cobrança de tráfego. */
export default async function TrafegoConfigPage() {
  const settings = await obterSettings();

  return (
    <>
      <PageHeader
        titulo="Configurações de tráfego"
        descricao="Regras de lembrete e modelos das mensagens de WhatsApp"
        acao={
          <Link href="/trafego">
            <Button variante="secundaria">Voltar</Button>
          </Link>
        }
      />
      <SettingsForm settings={settings} />
    </>
  );
}
