-- Pedido (ago/2026): calibragem vira uma etapa exclusiva do administrador —
-- inclusive a NOTA de calibragem, que agora não é mais mascarada pela mesma
-- regra do "lado gestor" (pode_ver_lado_gestor, que também libera pro
-- avaliador designado e pro gestor no organograma). Nota de calibragem
-- passa a ser visível SÓ pra quem tem e_admin_do_ciclo — nem o avaliador
-- original que preencheu a nota do gestor enxerga mais.
--
-- nota_gestor / media_*_gestor continuam na regra antiga
-- (pode_ver_lado_gestor) — só nota_calibragem / media_*_calibragem migram
-- pra essa função nova.

create or replace function public.pode_ver_lado_calibragem(p_ciclo_id uuid)
returns boolean
language sql
stable
as $func$
  select public.e_admin_do_ciclo(p_ciclo_id);
$func$;

create or replace function public.get_avaliacao_cultural(p_avaliacao_id uuid)
returns table (
  id uuid,
  pilar smallint,
  nota_auto smallint,
  nota_gestor smallint,
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
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then ac.observacoes end
  from public.avaliacoes_cultural ac
  join public.avaliacoes a on a.id = ac.avaliacao_id
  where ac.avaliacao_id = p_avaliacao_id;
$func$;

create or replace function public.get_avaliacao_tecnica(p_avaliacao_id uuid)
returns table (
  id uuid,
  criterio_key text,
  nota_auto smallint,
  nota_gestor smallint,
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
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then t.observacoes end
  from public.avaliacoes_tecnica t
  join public.avaliacoes a on a.id = t.avaliacao_id
  where t.avaliacao_id = p_avaliacao_id;
$func$;

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
    f.id, f.full_name, f.cargo,
    av.id, av.full_name
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  left join public.funcionarios av on av.id = a.avaliador_id
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
