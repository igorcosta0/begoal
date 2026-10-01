-- Ordem dos sinais vitais escolhida arrastando os cards (pedido 01/10/2026),
-- igual a krs.ordem. Uma ordem só por empresa (a página de Sinais Vitais é
-- uma lista única, sem agrupar por objetivo).
--
-- Preenche com a ordem que já aparecia (mais recente primeiro). Sinal vital
-- novo entra com ordem null e aparece no topo.
--
-- RODAR ANTES do push: a página passa a ordenar por esta coluna.

alter table public.sinais_vitais add column if not exists ordem integer;

update public.sinais_vitais sv
set ordem = n.pos
from (
  select id, row_number() over (partition by client_id order by created_at desc) as pos
  from public.sinais_vitais
) n
where n.id = sv.id and sv.ordem is null;

-- Conferência: nenhum sem ordem e nenhuma posição repetida na mesma empresa.
-- select count(*) filter (where ordem is null) as sem_ordem,
--        count(*) - count(distinct (client_id, ordem)) as repetidos
-- from public.sinais_vitais;
