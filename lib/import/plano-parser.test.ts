import { describe, it, expect } from "vitest";
import { parsePlanoAcao } from "./plano-parser";

// Trecho real do cronograma do plano do Studio Bambu (como sai do PDF: data e
// dia da semana em linhas separadas, item terminando no responsável).
const CRONOGRAMA = `
Cronograma previsão
Cada data mostra quem é responsável por aquela etapa.
30/09
quarta
Aprovação do plano de ação Vocês fazem
Aprovação da descrição do Google
até 02/10
sexta
Estrutura de anúncios pronta Já feito ✓ FAVIE
Business e conta de anúncios criados
Observação: falta cadastrar o cartão ou o Pix na Meta Vocês fazem
01/10
a confirmar
Sessão de fotos e gravação dos vídeos FAVIE Vocês fazem
05 a 09/10 Auditoria e ajuste do Google Em andamento FAVIE
06/10
terça
Destaques e bio novos no Instagram FAVIE
13/10
terça
Anúncios no ar e primeiro vídeo Anúncios FAVIE
14 e 15/10 Segundo e terceiro vídeos, fixados no perfil FAVIE
a partir de 13/10 Atendimento e registro de cada contato Vocês fazem
toda semana Leitura e ajuste dos anúncios FAVIE
05/11
quinta
Relatório do mês 1 FAVIE
`;

describe("parsePlanoAcao", () => {
  const itens = parsePlanoAcao(CRONOGRAMA, 2026);

  it("só emite linhas com marcador de responsável (ignora texto corrido)", () => {
    const titulos = itens.map((i) => i.titulo);
    // Linhas de explicação não viram item.
    expect(titulos).not.toContain("Cada data mostra quem é responsável por aquela etapa");
    // Linhas-item sem marcador também não entram (a pessoa adiciona na prévia).
    expect(titulos).not.toContain("Aprovação da descrição do Google");
    expect(titulos.length).toBeGreaterThanOrEqual(10);
  });

  it("detecta owner Cliente quando é 'Vocês fazem'", () => {
    const aprov = itens.find((i) => i.titulo.startsWith("Aprovação do plano"));
    expect(aprov?.owner).toBe("Cliente");
  });

  it("FAVIE executa quando os dois participam (FAVIE + Vocês fazem)", () => {
    const sessao = itens.find((i) => i.titulo.startsWith("Sessão de fotos"));
    expect(sessao?.owner).toBe("FAVIE");
    expect(sessao?.titulo).toBe("Sessão de fotos e gravação dos vídeos");
  });

  it("lê status 'Já feito' e 'Em andamento'", () => {
    const estrutura = itens.find((i) => i.titulo.startsWith("Estrutura de anúncios"));
    expect(estrutura?.status).toBe("Feita");
    expect(estrutura?.owner).toBe("FAVIE");
    const auditoria = itens.find((i) => i.titulo.startsWith("Auditoria"));
    expect(auditoria?.status).toBe("Fazendo");
  });

  it("não deixa 'Anúncios' do marcador sujar o título", () => {
    const anuncio = itens.find((i) => i.titulo.startsWith("Anúncios no ar"));
    expect(anuncio?.titulo).toBe("Anúncios no ar e primeiro vídeo");
    expect(anuncio?.owner).toBe("FAVIE");
  });

  it("monta a data de início a partir do rótulo (data + dia da semana)", () => {
    const relatorio = itens.find((i) => i.titulo.startsWith("Relatório do mês"));
    expect(relatorio?.dueDate).toBe("2026-11-05");
    expect(relatorio?.dateLabel).toContain("05/11");
    expect(relatorio?.dateLabel).toContain("quinta");
  });

  it("faixa de datas usa o dia de início com o mês do fim", () => {
    const auditoria = itens.find((i) => i.titulo.startsWith("Auditoria"));
    expect(auditoria?.dueDate).toBe("2026-10-05"); // "05 a 09/10"
    const videos = itens.find((i) => i.titulo.startsWith("Segundo e terceiro"));
    expect(videos?.dueDate).toBe("2026-10-14"); // "14 e 15/10"
  });

  it("'toda semana' fica sem data real, mas guarda o rótulo", () => {
    const leitura = itens.find((i) => i.titulo.startsWith("Leitura e ajuste"));
    expect(leitura?.dueDate).toBeNull();
    expect(leitura?.dateLabel?.toLowerCase()).toContain("toda semana");
  });

  it("'a partir de 13/10' vira item do cliente com data", () => {
    const atend = itens.find((i) => i.titulo.startsWith("Atendimento e registro"));
    expect(atend?.owner).toBe("Cliente");
    expect(atend?.dueDate).toBe("2026-10-13");
  });

  it("lê a etapa quando há cabeçalho de etapa", () => {
    const comEtapas = parsePlanoAcao(
      `Produzir\n06/10\nDestaques e bio novos no Instagram FAVIE`,
      2026,
    );
    expect(comEtapas[0]?.stage).toBe("Produzir");
  });
});
