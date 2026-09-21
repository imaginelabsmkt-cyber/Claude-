import { AreaHeader } from "@/components/interno/area-header";
import { LeadForm } from "@/components/comercial/lead-form";

export const dynamic = "force-dynamic";

/** Cadastro de uma nova oportunidade no funil. */
export default function NovaOportunidadePage() {
  return (
    <>
      <AreaHeader titulo="Nova oportunidade" contexto="Funil" />
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <LeadForm />
      </div>
    </>
  );
}
