-- Pedido (09/09/2026, mesmo dia da migration anterior): selo "Concluída"
-- também pra Avaliação de Pares — só que ela não tem calibragem nenhuma
-- (nem autoavaliação), então o critério "auto+gestor+calibragem completos"
-- de avaliacao_completude() não se aplica.
--
-- avaliacao_completude(...).gestor_completo já cobria a maior parte, mas
-- exige as linhas de avaliacoes_tecnica existirem (count(*) > 0) — pares
-- SÓ ganhou lado técnico em 27/08 (migration 20260827030000), então
-- avaliações de pares mais antigas (concluídas quando pares era só
-- cultural, vertical nula) nunca vão ter linha técnica nenhuma e ficariam
-- pra sempre marcadas como incompletas mesmo já estando 'gestor_concluida'.
--
-- Diferente da avaliação comum: pares NUNCA passa pelo "Iniciar Calibragem"
-- em lote (esse botão só mexe em tipo='padrao') — o único jeito de uma
-- pares chegar a 'gestor_concluida' é o avaliador clicar "Concluir" no
-- ModalAvaliacao, que já passa por validarCampos() na hora (exige vertical
-- e nota em todos os critérios ATUAIS da vertical, quando ela pede
-- vertical). Ou seja, pro tipo='pares' o status já É confiável — não tem o
-- problema que motivou criar avaliacao_completude() pra avaliação comum.
-- "Completa" pra pares vira simplesmente status = 'gestor_concluida'.
create or replace function public.get_avaliacoes_por_ciclo(p_ciclo_id uuid)
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
  avaliador_nome text,
  completa boolean
)
language sql
stable
as $func$
  select
    a.id, a.status, a.vertical, a.tipo, a.revelado,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_cultural_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_cultural_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then a.media_cultural_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_tecnica_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then a.media_tecnica_calibragem end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.observacoes_gerais end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then a.observacoes_calibragem end,
    f.id, f.full_name, f.cargo,
    av.id, av.full_name,
    case when a.tipo = 'pares' then a.status = 'gestor_concluida' else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  left join public.funcionarios av on av.id = a.avaliador_id
  cross join lateral public.avaliacao_completude(a.id) comp
  where a.ciclo_id = p_ciclo_id
  order by a.created_at;
$func$;

create or replace function public.get_minhas_avaliacoes(p_funcionario_id uuid)
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
  ciclo_status text,
  completa boolean
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
    c.id, c.nome, c.periodo, c.ano, c.status,
    case when a.tipo = 'pares' then a.status = 'gestor_concluida' else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  left join public.funcionarios av on av.id = a.avaliador_id
  cross join lateral public.avaliacao_completude(a.id) comp
  where a.funcionario_id = p_funcionario_id
  order by a.created_at desc;
$func$;

create or replace function public.get_avaliacoes_para_avaliar(p_avaliador_funcionario_id uuid)
returns table (
  id uuid,
  status text,
  vertical text,
  tipo text,
  revelado boolean,
  observacoes_gerais text,
  funcionario_id uuid,
  funcionario_nome text,
  funcionario_cargo text,
  ciclo_id uuid,
  ciclo_nome text,
  ciclo_periodo smallint,
  ciclo_ano smallint,
  ciclo_status text,
  completa boolean
)
language sql
stable
as $func$
  select
    a.id, a.status, a.vertical, a.tipo, a.revelado,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.observacoes_gerais end,
    f.id, f.full_name, f.cargo,
    c.id, c.nome, c.periodo, c.ano, c.status,
    case when a.tipo = 'pares' then a.status = 'gestor_concluida' else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  cross join lateral public.avaliacao_completude(a.id) comp
  where a.avaliador_id = p_avaliador_funcionario_id
  order by a.created_at desc;
$func$;
