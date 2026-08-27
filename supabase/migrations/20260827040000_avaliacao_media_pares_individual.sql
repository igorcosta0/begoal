-- Pedido (ago/2026): a calibragem já podia ser feita tanto no Painel de
-- Calibragem (ciclo inteiro numa tela) quanto direto na avaliação de uma
-- pessoa (aba Calibragem do ModalAvaliacao) — mas só o Painel mostrava a
-- "Média Pares" ao lado (migrations 20260826000000_calibragem_painel e
-- 20260827030000_calibragem_media_pares_tecnica). No ModalAvaliacao, quem
-- calibra não tinha esse contexto sem abrir o Painel também.
--
-- Mesmo padrão de sempre: media_pares calculada na leitura (lateral join),
-- não guardada em coluna, mascarada por pode_ver_lado_calibragem — só quem
-- pode ver/editar calibragem enxerga isso, igual a nota_calibragem já era.
-- Precisa DROP antes do CREATE porque muda a lista de colunas do retorno.

drop function if exists public.get_avaliacao_cultural(uuid);

create function public.get_avaliacao_cultural(p_avaliacao_id uuid)
returns table (
  id uuid,
  pilar smallint,
  nota_auto smallint,
  nota_gestor smallint,
  media_pares numeric,
  nota_calibragem smallint,
  observacoes text
)
language sql
stable
as $func$
  select
    ac.id,
    ac.pilar,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then ac.nota_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then ac.nota_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then ac.observacoes end
  from public.avaliacoes_cultural ac
  join public.avaliacoes a on a.id = ac.avaliacao_id
  left join lateral (
    select avg(pc.nota_gestor)::numeric(3,1) as media
    from public.avaliacoes p
    join public.avaliacoes_cultural pc on pc.avaliacao_id = p.id
    where p.ciclo_id = a.ciclo_id
      and p.tipo = 'pares'
      and p.funcionario_id = a.funcionario_id
      and pc.pilar = ac.pilar
      and pc.nota_gestor is not null
  ) pares on true
  where ac.avaliacao_id = p_avaliacao_id;
$func$;

drop function if exists public.get_avaliacao_tecnica(uuid);

create function public.get_avaliacao_tecnica(p_avaliacao_id uuid)
returns table (
  id uuid,
  criterio_key text,
  nota_auto smallint,
  nota_gestor smallint,
  media_pares numeric,
  nota_calibragem smallint,
  observacoes text
)
language sql
stable
as $func$
  select
    t.id,
    t.criterio_key,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then t.nota_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then t.nota_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then t.observacoes end
  from public.avaliacoes_tecnica t
  join public.avaliacoes a on a.id = t.avaliacao_id
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
  where t.avaliacao_id = p_avaliacao_id;
$func$;
