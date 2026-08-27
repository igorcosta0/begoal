-- Pedido (ago/2026): Avaliação de Pares ganhou lado técnico (commit
-- anterior, ModalAvaliacao.tsx) — agora o Painel de Calibragem precisa
-- mostrar a "Média Pares" técnica também, do mesmo jeito que já mostra pra
-- cultural (get_calibragem_ciclo_cultural, migration 20260826000000).
--
-- Duas peças:
--
-- 1) get_vertical_padrao: dado um ciclo + funcionário, devolve a vertical da
--    avaliação COMUM (tipo='padrao') dessa pessoa. Usada só pelo front-end
--    (ModalAvaliacao.tsx) pra TRAVAR a vertical que o par usa ao avaliar
--    alguém tecnicamente — sem isso o par poderia escolher uma vertical
--    diferente da real, e os criterio_key nunca bateriam entre a nota do par
--    e a nota do gestor, quebrando a média abaixo. security definer de
--    propósito: quem avalia em pares muitas vezes não tem RLS pra ler a
--    linha 'padrao' inteira de quem ele avalia (não é gestor nem admin
--    dela) — só precisa saber a vertical, nada sensível.
--
-- 2) get_calibragem_ciclo_tecnica ganha a coluna media_pares, mesmo padrão
--    do cultural (lateral join calculado na leitura, não guardado em
--    coluna) — só que casando por criterio_key em vez de pilar, já que
--    critério é vertical-específico. Precisa DROP antes do CREATE OR REPLACE
--    porque muda a lista de colunas do retorno (Postgres não deixa trocar
--    isso com replace direto).

create or replace function public.get_vertical_padrao(p_ciclo_id uuid, p_funcionario_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vertical
  from public.avaliacoes
  where ciclo_id = p_ciclo_id
    and funcionario_id = p_funcionario_id
    and tipo = 'padrao'
  limit 1;
$$;

drop function if exists public.get_calibragem_ciclo_tecnica(uuid);

create function public.get_calibragem_ciclo_tecnica(p_ciclo_id uuid)
returns table (
  avaliacao_id uuid,
  criterio_key text,
  nota_auto smallint,
  nota_avaliador smallint,
  media_pares numeric,
  nota_calibragem smallint
)
language sql
stable
as $func$
  select
    a.id,
    t.criterio_key,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_auto end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_calibragem end
  from public.avaliacoes a
  join public.avaliacoes_tecnica t on t.avaliacao_id = a.id
  left join lateral (
    select avg(pt.nota_gestor)::numeric(3,1) as media
    from public.avaliacoes p
    join public.avaliacoes_tecnica pt on pt.avaliacao_id = p.id
    where p.ciclo_id = a.ciclo_id
      and p.tipo = 'pares'
      and p.funcionario_id = a.funcionario_id
      and pt.criterio_key = t.criterio_key
      and pt.nota_gestor is not null
  ) pares on true
  where a.ciclo_id = p_ciclo_id
    and a.tipo = 'padrao'
    and a.status in ('calibragem', 'finalizada');
$func$;
