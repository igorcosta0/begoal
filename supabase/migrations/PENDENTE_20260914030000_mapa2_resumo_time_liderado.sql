-- Pedido (14/09/2026): Mapa 2 ganha um resumo do time do líder — SEM nunca
-- citar o tipo de ninguém, individual ou combinação que dê pra adivinhar
-- quem é quem. Agrega os liderados diretos nos 3 CENTROS do Eneagrama (o
-- mesmo agrupamento já usado em TIPOS_ENEAGRAMA[n].centro no front-end:
-- Instintivo = tipos 8/9/1, Emocional = tipos 2/3/4, Racional = tipos 5/6/7)
-- — nunca no tipo exato (1-9), que seria granular demais e arriscaria dar
-- pra inferir quem é quem num time pequeno. Devolve só 5 números (uma linha
-- só, sem quebra por pessoa) — o texto qualitativo ("mais técnico", "mais
-- sentimental" etc.) é montado no front-end a partir desses números, sem
-- chamada de IA nova.
create or replace function public.resumo_time_liderado()
returns table(instintivo int, emocional int, racional int, total_liderados int, total_mapeados int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where fe.tipo in (8, 9, 1))::int as instintivo,
    count(*) filter (where fe.tipo in (2, 3, 4))::int as emocional,
    count(*) filter (where fe.tipo in (5, 6, 7))::int as racional,
    count(alvo.id)::int as total_liderados,
    count(fe.tipo)::int as total_mapeados
  from public.funcionarios alvo
  join public.funcionarios gestor on gestor.id = alvo.gestor_id
  left join public.funcionarios_eneagrama fe on fe.funcionario_id = alvo.id
  where gestor.user_id = auth.uid();
$$;
