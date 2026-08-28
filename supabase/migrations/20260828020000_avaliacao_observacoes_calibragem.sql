-- Pedido (28/08/2026): caixa de texto pra observações de calibragem no
-- painel individual (ModalAvaliacao) — hoje só existe nota numérica de
-- calibragem por pilar/critério (nota_calibragem) e um "Feedback geral" que
-- é do avaliador (observacoes_gerais, mascarado por pode_ver_lado_gestor).
-- Não tinha onde quem calibra deixar um comentário sobre a calibragem em si.
--
-- Campo novo é a nível de avaliação inteira (não por pilar/critério), igual
-- observacoes_gerais e media_*_calibragem — por isso mora em `avaliacoes`,
-- não em avaliacoes_cultural/tecnica. Mascarado por pode_ver_lado_calibragem,
-- mesma regra de nota_calibragem/media_*_calibragem (migration
-- 20260825_avaliacao_calibragem_admin_only + 20260828000000/010000: hoje
-- isso é e_admin_do_ciclo nas empresas comuns, e a lista fixa
-- Igor/Filippe Réus/Priscila/Felipe Marques na CTZ). RLS de avaliacoes
-- (avaliacoes_update) já cobre a escrita — pode_ver_lado_calibragem já está
-- no OR da policy desde a migration 20260827000000_calibragem_ctz_restrita,
-- não precisa mudar.

alter table public.avaliacoes
  add column if not exists observacoes_calibragem text;

-- Precisa DROP antes do CREATE porque muda a lista de colunas do retorno
-- (mesmo motivo da migration 20260827040000_avaliacao_media_pares_individual).
drop function if exists public.get_avaliacoes_por_ciclo(uuid);
drop function if exists public.get_minhas_avaliacoes(uuid);

create function public.get_avaliacoes_por_ciclo(p_ciclo_id uuid)
returns table (
  id uuid,
  status text,
  vertical text,
  tipo text,
  revelado boolean,
  media_cultural_auto numeric,
  media_cultural_gestor numeric,
  media_cultural_calibragem numeric,
  media_tecnica_auto numeric,
  media_tecnica_gestor numeric,
  media_tecnica_calibragem numeric,
  observacoes_gerais text,
  observacoes_calibragem text,
  funcionario_id uuid,
  funcionario_nome text,
  funcionario_cargo text,
  avaliador_id uuid,
  avaliador_nome text
)
language sql
stable
as $func$
  select
    a.id, a.status, a.vertical, a.tipo, a.revelado,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_cultural_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_cultural_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.media_cultural_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_tecnica_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.media_tecnica_calibragem end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.observacoes_gerais end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.observacoes_calibragem end,
    f.id, f.full_name, f.cargo,
    av.id, av.full_name
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  left join public.funcionarios av on av.id = a.avaliador_id
  where a.ciclo_id = p_ciclo_id
  order by a.created_at;
$func$;

create function public.get_minhas_avaliacoes(p_funcionario_id uuid)
returns table (
  id uuid,
  status text,
  vertical text,
  tipo text,
  revelado boolean,
  observacoes_gerais text,
  observacoes_calibragem text,
  media_cultural_auto numeric,
  media_cultural_gestor numeric,
  media_cultural_calibragem numeric,
  media_tecnica_auto numeric,
  media_tecnica_gestor numeric,
  media_tecnica_calibragem numeric,
  avaliador_id uuid,
  avaliador_nome text,
  ciclo_id uuid,
  ciclo_nome text,
  ciclo_periodo smallint,
  ciclo_ano smallint,
  ciclo_status text
)
language sql
stable
as $func$
  select
    a.id, a.status, a.vertical, a.tipo, a.revelado,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.observacoes_gerais end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.observacoes_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_cultural_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_cultural_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.media_cultural_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_tecnica_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then a.media_tecnica_calibragem end,
    av.id, av.full_name,
    c.id, c.nome, c.periodo, c.ano, c.status
  from public.avaliacoes a
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  left join public.funcionarios av on av.id = a.avaliador_id
  where a.funcionario_id = p_funcionario_id
  order by a.created_at desc;
$func$;
