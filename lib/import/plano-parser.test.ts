import { describe, it, expect } from "vitest";
import { parsePlanoAcao } from "./plano-parser";

// Texto REAL como o pdf.js extrai o plano do Studio Bambu: espaços duplos,
// ligaduras separadas ("per fi l"), dia da semana colado no item, datas
// quebradas em duas linhas ("toda"/"semana", "a partir de"/"13/10") e a legenda
// e o texto corrido que NÃO podem virar item.
const PDF = `
FAVIE   Vocês   fazem   Anúncios   Já   feito   ✓
Cronograma   previsão
Cada   data   mostra   quem   é   responsável   por   aquela   etapa .
30/09
quarta   Aprovação   do   plano   de   ação   Vocês   fazem
Aprovação   da   descrição   do   Google
até   02/10
sexta   Estrutura   de   anúncios   pronta   Já   feito   ✓   FAVIE
Business   e   conta   de   anúncios   criados
Observação :   falta   cadastrar   o   cartão   ou   o   Pix   na   Meta   Vocês   fazem
01/10
a   con fi rmar   Sessão   de   fotos   e   gravação   dos   vídeos   FAVIE   Vocês   fazem
Data   prevista ,   depende   da   disponibilidade .   As   fotos   novas
vão   para   o   feed ,   os   destaques ,   o   Google   e   os   anúncios
05   a   09/10   Auditoria   e   ajuste   do   Google   Em   andamento   FAVIE
06/10
terça   Destaques   e   bio   novos   no   Instagram   FAVIE
13/10
terça   Anúncios   no   ar   e   primeiro   vídeo   Anúncios   FAVIE
14   e   15/10   Segundo   e   terceiro   vídeos ,   fi xados   no   per fi l   FAVIE
a   partir   de
13/10   Atendimento   e   registro   de   cada   contato   Vocês   fazem
toda
semana   Leitura   e   ajuste   dos   anúncios   FAVIE
05/11
quinta   Relatório   do   mês   1   FAVIE
Placa   de   avaliação   do   Google   Vocês   mandam   fazer
`;

describe("parsePlanoAcao — texto real do pdf.js", () => {
  const itens = parsePlanoAcao(PDF, 2026);
  const acha = (prefixo: string) =>
    itens.find((i) => i.titulo.startsWith(prefixo));

  it("ignora a legenda e o texto corrido (lowercase 'anúncios' não é marcador)", () => {
    const titulos = itens.map((i) => i.titulo);
    expect(titulos).not.toContain("FAVIE");
    expect(titulos.some((t) => t.includes("feed"))).toBe(false);
    expect(titulos.some((t) => /^Cada data mostra/.test(t))).toBe(false);
  });

  it("dia da semana colado no item não entra no título", () => {
    const aprov = acha("Aprovação do plano");
    expect(aprov).toBeTruthy();
    expect(aprov?.titulo).toBe("Aprovação do plano de ação");
    expect(aprov?.owner).toBe("Cliente");
    expect(aprov?.dueDate).toBe("2026-09-30");
    expect(aprov?.dateLabel).toContain("quarta");
  });

  it("'Já feito' = Feita e FAVIE, com a data da linha anterior", () => {
    const e = acha("Estrutura de anúncios");
    expect(e?.status).toBe("Feita");
    expect(e?.owner).toBe("FAVIE");
    expect(e?.dueDate).toBe("2026-10-02");
  });

  it("tira 'a confirmar' e o cliente participante (FAVIE executa)", () => {
    const s = acha("Sessão de fotos");
    expect(s?.titulo).toBe("Sessão de fotos e gravação dos vídeos");
    expect(s?.owner).toBe("FAVIE");
    expect(s?.dueDate).toBe("2026-10-01");
  });

  it("faixa de datas inline: início com o mês do fim", () => {
    expect(acha("Auditoria")?.dueDate).toBe("2026-10-05"); // 05 a 09/10
    expect(acha("Auditoria")?.status).toBe("Fazendo");
    expect(acha("Segundo e terceiro")?.dueDate).toBe("2026-10-14"); // 14 e 15/10
  });

  it("remonta ligadura separada: 'per fi l' vira 'perfil'", () => {
    expect(acha("Segundo e terceiro")?.titulo).toContain("perfil");
  });

  it("'Anúncios' do marcador não suja o título", () => {
    const a = acha("Anúncios no ar");
    expect(a?.titulo).toBe("Anúncios no ar e primeiro vídeo");
    expect(a?.owner).toBe("FAVIE");
  });

  it("junta data quebrada 'a partir de' + '13/10'", () => {
    const at = acha("Atendimento e registro");
    expect(at?.owner).toBe("Cliente");
    expect(at?.dueDate).toBe("2026-10-13");
  });

  it("junta 'toda' + 'semana' e fica sem data real", () => {
    const l = acha("Leitura e ajuste");
    expect(l?.dueDate).toBeNull();
    expect(l?.dateLabel?.toLowerCase()).toContain("toda semana");
  });

  it("lê 'Vocês mandam fazer' como item do cliente", () => {
    const p = acha("Placa de avaliação");
    expect(p?.owner).toBe("Cliente");
  });

  it("monta a data com o dia da semana colado ('quinta')", () => {
    const r = acha("Relatório do mês");
    expect(r?.dueDate).toBe("2026-11-05");
  });

  it("captura um conjunto sensato de itens", () => {
    expect(itens.length).toBeGreaterThanOrEqual(10);
  });
});

// Seção "O que precisamos de vocês" (página 1): itens do cliente SEM marcador,
// quebrados em várias linhas e em colunas achatadas pelo pdf.js.
const PRECISAMOS = `
O   que   precisamos   de   vocês
Com   esses   itens   em   dia ,   a   previsão   é   fazer   as   fotos   em   01/10
Até   30/09   Até   02/10   No   dia   da   sessão
Aprovar   o   plano
Aprovar   a   descrição   do
Google   ( opção   A   ou   B )
Con fi rmar   se   01/10
funciona   para   as   fotos   e
os   vídeos ,   ou   indicar
outros   dias   e   turnos ,   e   os
alunos   modelos
Cadastrar   a   forma   de
pagamento   dos   anúncios
na   Meta :   cartão   ou   Pix
Business   e   conta   de
anúncios
já   feito
✓
Alunos   modelos   no   estúdio
Autorização   de   imagem
assinada   por   cada   aluno
Estúdio   organizado ,   com
boa   luz
Cronograma   previsão
30/09
quarta   Aprovação   do   plano   de   ação   Vocês   fazem
`;

describe("parsePlanoAcao — seção 'O que precisamos de vocês'", () => {
  const itens = parsePlanoAcao(PRECISAMOS, 2026);
  const acha = (p: string) => itens.find((i) => i.titulo.startsWith(p));

  it("todos os itens da seção são do cliente", () => {
    const naSecao = itens.filter((i) => !i.titulo.startsWith("Aprovação do plano"));
    expect(naSecao.every((i) => i.owner === "Cliente")).toBe(true);
  });

  it("junta item quebrado em várias linhas num só", () => {
    const c = acha("Confirmar se 01/10");
    expect(c?.titulo).toBe(
      "Confirmar se 01/10 funciona para as fotos e os vídeos, ou indicar outros dias e turnos, e os alunos modelos",
    );
  });

  it("junta continuação com aspas/parênteses", () => {
    expect(acha("Aprovar a descrição")?.titulo).toBe(
      "Aprovar a descrição do Google (opção A ou B)",
    );
  });

  it("'já feito ✓' marca o item como Feita", () => {
    expect(acha("Business e conta")?.status).toBe("Feita");
  });

  it("não deixa a intro nem a linha de colunas virarem item", () => {
    expect(acha("Com esses itens")).toBeUndefined();
    expect(acha("Até 30/09")).toBeUndefined();
  });

  it("encerra a seção no 'Cronograma' e volta ao modo normal", () => {
    const cron = acha("Aprovação do plano de ação");
    expect(cron?.dueDate).toBe("2026-09-30");
  });
});

describe("parsePlanoAcao — junta itens repetidos (dedup)", () => {
  it("funde 'Aprovar o plano' com 'Aprovação do plano de ação' (fica o datado)", () => {
    const texto = `
O   que   precisamos   de   vocês
Aprovar   o   plano
Cronograma   previsão
30/09
quarta   Aprovação   do   plano   de   ação   Vocês   fazem
`;
    const itens = parsePlanoAcao(texto, 2026);
    const plano = itens.filter((i) => /plano/i.test(i.titulo));
    expect(plano.length).toBe(1);
    expect(plano[0].titulo).toBe("Aprovação do plano de ação");
    expect(plano[0].dueDate).toBe("2026-09-30");
  });

  it("NÃO funde itens só parecidos de leve (carrosséis diferentes)", () => {
    const texto = `
07/10   Carrossel   "Vem conhecer o Studio Bambu"   FAVIE
09/10   Carrossel   "Como começar no Studio Bambu"   FAVIE
`;
    const itens = parsePlanoAcao(texto, 2026);
    expect(itens.length).toBe(2);
  });
});
