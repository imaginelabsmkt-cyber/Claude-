import { describe, it, expect } from "vitest";
import {
  proximaAcao,
  responsavelAtual,
  prazoPrincipal,
  prazoEntrega,
  estaAtrasado,
  entregaEmAlerta,
  motivoPrioridade,
} from "@/lib/rules/contents";
import type { Content } from "@/types";

// Data de referência fixa para tornar os testes determinísticos.
const HOJE = new Date(2026, 6, 14); // 14/07/2026

const VITORIA = { id: "p1", name: "Vitória" };
const FRAN = { id: "p2", name: "Fran" };

/** Cria um conteúdo completo, permitindo sobrescrever campos. */
function makeContent(over: Partial<Content> = {}): Content {
  return {
    id: "c1",
    client_id: "cli1",
    title: "Conteúdo teste",
    description: null,
    format: "Reel",
    content_pillar: null,
    objective: null,
    status: "Planejamento",
    priority: "Média",
    reference_month: "2026-07",
    planned_week: 2,
    planned_date: null,
    actual_post_date: null,
    requires_recording: false,
    recording_date: null,
    recording_time: null,
    recording_location: null,
    participants: [],
    outfit: null,
    required_materials: [],
    planner_id: null,
    recorder_id: null,
    editor_id: null,
    publisher_id: null,
    script_deadline: null,
    recording_deadline: null,
    editing_deadline: null,
    reference_url: null,
    script_url: null,
    raw_files_url: null,
    edited_file_url: null,
    published_url: null,
    notes: null,
    script: null,
    caption: null,
    revision_count: 0,
    editing_queue_position: null,
    is_fixed_date: false,
    is_campaign: false,
    cover_source_id: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...over,
  };
}

describe("proximaAcao", () => {
  it("mapeia cada status para a ação correta", () => {
    expect(proximaAcao("Planejamento")).toBe("Criar planejamento");
    expect(proximaAcao("Roteiro pronto")).toBe("Agendar gravação");
    expect(proximaAcao("Aguardando gravação")).toBe("Gravar");
    expect(proximaAcao("Gravado")).toBe("Adicionar à fila de edição");
    expect(proximaAcao("Fila de edição")).toBe("Editar");
    expect(proximaAcao("Em edição")).toBe("Finalizar edição");
    expect(proximaAcao("Revisão interna")).toBe("Revisar");
    expect(proximaAcao("Aprovação do cliente")).toBe("Aguardar cliente");
    expect(proximaAcao("Ajustes")).toBe("Realizar ajustes");
    expect(proximaAcao("Aprovado")).toBe("Agendar publicação");
    expect(proximaAcao("Agendado")).toBe("Publicar");
    expect(proximaAcao("Publicado")).toBe("Finalizado");
    expect(proximaAcao("Pausado")).toBe("Aguardar retomada");
    expect(proximaAcao("Cancelado")).toBe("Nenhuma ação");
  });
});

describe("responsavelAtual", () => {
  const ctx = { planner: VITORIA, producer: FRAN };

  it("planejamento e roteiro -> planner (Vitória)", () => {
    expect(responsavelAtual(makeContent({ status: "Planejamento" }), ctx)).toBe(
      "Vitória",
    );
    expect(
      responsavelAtual(makeContent({ status: "Roteiro pronto" }), ctx),
    ).toBe("Vitória");
  });

  it("gravação e edição -> producer (Fran)", () => {
    for (const status of [
      "Aguardando gravação",
      "Gravado",
      "Fila de edição",
      "Em edição",
      "Ajustes",
    ] as const) {
      expect(responsavelAtual(makeContent({ status }), ctx)).toBe("Fran");
    }
  });

  it("revisão interna -> Fran e Vitória", () => {
    expect(
      responsavelAtual(makeContent({ status: "Revisão interna" }), ctx),
    ).toBe("Fran e Vitória");
  });

  it("arte (Carrossel/Post estático) -> sempre Vitória na criação", () => {
    for (const format of ["Carrossel", "Post estático"] as const) {
      for (const status of [
        "Planejamento",
        "Fila de edição",
        "Em edição",
        "Ajustes",
        "Revisão interna",
        "Aprovação do cliente",
      ] as const) {
        expect(responsavelAtual(makeContent({ format, status }), ctx)).toBe(
          "Vitória",
        );
      }
    }
  });

  it("aprovação do cliente -> Vitória", () => {
    expect(
      responsavelAtual(makeContent({ status: "Aprovação do cliente" }), ctx),
    ).toBe("Vitória");
  });

  it("publicação -> responsável cadastrado (fallback producer)", () => {
    expect(
      responsavelAtual(makeContent({ status: "Agendado" }), {
        ...ctx,
        publisherName: "Fran",
      }),
    ).toBe("Fran");
    // sem publisher cadastrado, cai para o producer
    expect(responsavelAtual(makeContent({ status: "Publicado" }), ctx)).toBe(
      "Fran",
    );
  });

  it("pausado/cancelado -> sem responsável", () => {
    expect(responsavelAtual(makeContent({ status: "Pausado" }), ctx)).toBe("—");
    expect(responsavelAtual(makeContent({ status: "Cancelado" }), ctx)).toBe(
      "—",
    );
  });
});

describe("prazoPrincipal", () => {
  it("usa o prazo do roteiro no planejamento", () => {
    const c = makeContent({
      status: "Roteiro pronto",
      script_deadline: "2026-07-20",
      planned_date: "2026-07-30",
    });
    expect(prazoPrincipal(c)).toBe("2026-07-20");
  });

  it("usa o prazo de gravação na fase de gravação", () => {
    const c = makeContent({
      status: "Aguardando gravação",
      recording_deadline: "2026-07-18",
    });
    expect(prazoPrincipal(c)).toBe("2026-07-18");
  });

  it("usa o prazo de edição na fase de edição", () => {
    const c = makeContent({
      status: "Em edição",
      editing_deadline: "2026-07-22",
    });
    expect(prazoPrincipal(c)).toBe("2026-07-22");
  });

  it("cai para a data prevista quando não há prazo específico", () => {
    const c = makeContent({
      status: "Aguardando gravação",
      recording_deadline: null,
      planned_date: "2026-07-25",
    });
    expect(prazoPrincipal(c)).toBe("2026-07-25");
  });

  it("na publicação usa a data prevista", () => {
    const c = makeContent({ status: "Agendado", planned_date: "2026-07-28" });
    expect(prazoPrincipal(c)).toBe("2026-07-28");
  });
});

describe("prazoEntrega", () => {
  it("é sempre 48h (2 dias) antes da postagem", () => {
    expect(prazoEntrega({ planned_date: "2026-07-17" })).toBe("2026-07-15");
  });

  it("vira o mês corretamente", () => {
    expect(prazoEntrega({ planned_date: "2026-08-01" })).toBe("2026-07-30");
  });

  it("null quando não há data de postagem", () => {
    expect(prazoEntrega({ planned_date: null })).toBeNull();
  });
});

describe("entregaEmAlerta", () => {
  it("dentro da janela de 48h e não pronto -> alerta (não é atraso)", () => {
    // Posta 15/07, hoje 14/07: entrega (13/07) já venceu, mas a postagem
    // ainda não chegou.
    const c = makeContent({ status: "Em edição", planned_date: "2026-07-15" });
    expect(entregaEmAlerta(c, HOJE)).toBe(true);
    expect(estaAtrasado(c, HOJE)).toBe(false);
  });

  it("postagem ainda longe -> sem alerta", () => {
    const c = makeContent({ status: "Em edição", planned_date: "2026-07-20" });
    expect(entregaEmAlerta(c, HOJE)).toBe(false);
  });

  it("postagem já passou é atraso, não alerta de entrega", () => {
    const c = makeContent({ status: "Em edição", planned_date: "2026-07-10" });
    expect(entregaEmAlerta(c, HOJE)).toBe(false);
    expect(estaAtrasado(c, HOJE)).toBe(true);
  });

  it("já aprovado não gera alerta", () => {
    const c = makeContent({ status: "Aprovado", planned_date: "2026-07-15" });
    expect(entregaEmAlerta(c, HOJE)).toBe(false);
  });

  it("motivoPrioridade vira 'Entregar' na janela de 48h", () => {
    const c = makeContent({
      status: "Em edição",
      priority: "Baixa",
      planned_date: "2026-07-15",
    });
    expect(motivoPrioridade(c, HOJE)).toBe("Entregar");
  });
});

describe("estaAtrasado", () => {
  it("data prevista passada e não publicado -> atrasado", () => {
    const c = makeContent({ status: "Em edição", planned_date: "2026-07-10" });
    expect(estaAtrasado(c, HOJE)).toBe(true);
  });

  it("publicado nunca está atrasado", () => {
    const c = makeContent({ status: "Publicado", planned_date: "2026-07-10" });
    expect(estaAtrasado(c, HOJE)).toBe(false);
  });

  it("prazo de gravação passado e ainda não gravado -> atrasado", () => {
    const c = makeContent({
      status: "Aguardando gravação",
      recording_deadline: "2026-07-12",
    });
    expect(estaAtrasado(c, HOJE)).toBe(true);
  });

  it("prazo de gravação passado mas já gravado -> não atrasado", () => {
    const c = makeContent({
      status: "Em edição",
      recording_deadline: "2026-07-12",
    });
    expect(estaAtrasado(c, HOJE)).toBe(false);
  });

  it("prazo de edição passado e ainda não aprovado -> atrasado", () => {
    const c = makeContent({
      status: "Em edição",
      editing_deadline: "2026-07-12",
    });
    expect(estaAtrasado(c, HOJE)).toBe(true);
  });

  it("prazo de edição passado mas já aprovado -> não atrasado", () => {
    const c = makeContent({
      status: "Aprovado",
      editing_deadline: "2026-07-12",
    });
    expect(estaAtrasado(c, HOJE)).toBe(false);
  });

  it("data fixa próxima e não pronto -> atrasado", () => {
    const c = makeContent({
      status: "Em edição",
      is_fixed_date: true,
      planned_date: "2026-07-16", // daqui a 2 dias
    });
    expect(estaAtrasado(c, HOJE)).toBe(true);
  });

  it("data fixa próxima mas já pronto (aprovado) -> não atrasado", () => {
    const c = makeContent({
      status: "Aprovado",
      is_fixed_date: true,
      planned_date: "2026-07-16",
    });
    expect(estaAtrasado(c, HOJE)).toBe(false);
  });

  it("pausado e cancelado nunca estão atrasados", () => {
    const base = { planned_date: "2026-07-01" } as const;
    expect(estaAtrasado(makeContent({ status: "Pausado", ...base }), HOJE)).toBe(
      false,
    );
    expect(
      estaAtrasado(makeContent({ status: "Cancelado", ...base }), HOJE),
    ).toBe(false);
  });

  it("sem datas relevantes -> não atrasado", () => {
    expect(estaAtrasado(makeContent({ status: "Planejamento" }), HOJE)).toBe(
      false,
    );
  });
});

describe("motivoPrioridade", () => {
  it("atrasado tem prioridade máxima no motivo", () => {
    const c = makeContent({
      status: "Em edição",
      planned_date: "2026-07-10",
      is_campaign: true,
    });
    expect(motivoPrioridade(c, HOJE)).toBe("Atrasado");
  });

  it("data fixa vem antes de campanha e prioridade", () => {
    const c = makeContent({
      status: "Planejamento",
      is_fixed_date: true,
      is_campaign: true,
      priority: "Urgente",
    });
    expect(motivoPrioridade(c, HOJE)).toBe("Data fixa");
  });

  it("campanha vem antes de prioridade urgente", () => {
    const c = makeContent({ status: "Planejamento", is_campaign: true });
    expect(motivoPrioridade(c, HOJE)).toBe("Campanha");
  });

  it("urgente e alta", () => {
    expect(
      motivoPrioridade(makeContent({ priority: "Urgente" }), HOJE),
    ).toBe("Urgente");
    expect(motivoPrioridade(makeContent({ priority: "Alta" }), HOJE)).toBe(
      "Prioridade alta",
    );
  });

  it("postagem próxima quando a data prevista está dentro da janela", () => {
    // 17/07 posta em 3 dias; entrega (48h antes) = 15/07, ainda no futuro,
    // então não está atrasado — só "postagem próxima".
    const c = makeContent({
      status: "Planejamento",
      priority: "Baixa",
      planned_date: "2026-07-17",
    });
    expect(motivoPrioridade(c, HOJE)).toBe("Postagem próxima");
  });

  it("rotina quando não há fatores de urgência", () => {
    const c = makeContent({ status: "Planejamento", priority: "Baixa" });
    expect(motivoPrioridade(c, HOJE)).toBe("Rotina");
  });
});
