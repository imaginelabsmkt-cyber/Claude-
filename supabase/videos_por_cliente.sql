-- =============================================================
-- Quantos vídeos cada cliente tem no contrato
--
-- A projeção precisa saber quantos vídeos saem por mês hoje, para
-- somar os dos clientes novos em cima. Na planilha da Vitória isso
-- era uma coluna digitada à mão ("Vídeos no contrato"), com uma
-- observação do lado em quase todas as linhas.
--
-- NÃO É O `monthly_goal` QUE JÁ EXISTE. Aquele é meta de CONTEÚDOS,
-- e os dois não são a mesma coisa: o contrato do Kiku Sushi fala em
-- "até 16 conteúdos (vídeo, foto e carrossel)" sem dizer quantos
-- vídeos; o do Studio Bambu fala em "4 Reels e 1 sessão de fotos".
-- Somar conteúdo com vídeo daria um número que não serve para
-- dimensionar editor nem videomaker, que é para o que ele existe.
--
-- Fica em branco onde o contrato não diz. Em branco quer dizer "não
-- sei", e a tela escreve isso — diferente de zero, que quer dizer
-- "nenhum".
-- =============================================================

alter table public.clients
  add column if not exists monthly_videos integer;

comment on column public.clients.monthly_videos is
  'Vídeos por mês no contrato. Null = o contrato não diz. Diferente de monthly_goal, que é meta de conteúdos.';

-- Os contratos que a Vitória leu no Drive, em 26/11/2026.
-- Só preenche quem ainda está em branco: depois disso quem manda é
-- o que as duas ajustarem na tela.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('Dra. Hemilayne',        6),
      ('Izabela Schipitoski',   5),
      ('Laura Chioquetta',      4),
      ('Malukies Cookies & Co', 4),
      ('Studio Bambu',          4),
      ('Studio Salte',          4)
    ) as t(nome, videos)
  loop
    update public.clients
       set monthly_videos = r.videos
     where lower(btrim(name)) = lower(r.nome)
       and monthly_videos is null;
  end loop;
end $$;

-- Kiku Sushi e Natural Concept ficam em branco de propósito: o
-- contrato do Kiku não separa vídeo de carrossel, e o da Natural
-- Concept está sem quantidade nenhuma. A tela cobra os dois.
