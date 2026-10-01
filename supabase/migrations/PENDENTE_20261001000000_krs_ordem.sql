-- Ordem dos KRs dentro do objetivo (arrastar o card na página de OKRs).
-- Carga inicial = a ordem que a tela já mostrava (mais recente primeiro).
-- KR novo nasce com ordem null e aparece no topo, como antes.
-- Rodar ANTES do deploy do front que ordena por essa coluna.

alter table public.krs
  add column if not exists ordem integer;

comment on column public.krs.ordem is
  'Posição do KR dentro do objetivo (1 = primeiro). Null = ainda não reordenado, vai para o topo.';

update public.krs k
set ordem = o.posicao
from (
  select id, row_number() over (partition by objetivo_id order by created_at desc) as posicao
  from public.krs
) o
where o.id = k.id
  and k.ordem is null;

-- VERIFICAÇÃO (deve voltar 0 linhas):
-- select id from public.krs where ordem is null;

-- DESFAZER:
-- alter table public.krs drop column if exists ordem;
