-- Pedido (ago/2026): "as avaliações só devem aparecer para quem preencheu" —
-- autoavaliação só pro próprio colaborador (e pro avaliador só a partir da
-- Calibragem), nota do avaliador só pra ele (e pro colaborador só depois de
-- "revelar"). Essa regra sempre existiu, mas só na TELA (ModalAvaliacao:
-- gestorVeAuto / colaboradorVeGestor) — a policy de SELECT
-- (avaliacoes_select / avaliacoes_cultural_all / avaliacoes_tecnica_all) já
-- barra quem não é admin/avaliado/gestor/avaliador designado da LINHA, mas
-- devolve a linha INTEIRA (todas as colunas) pra quem tem acesso a ela,
-- sem olhar status/revelado. Ou seja: o próprio avaliado sempre conseguia
-- ler a nota do gestor antes da revelação (e o avaliador a autoavaliação
-- antes da calibragem) direto da resposta de rede da consulta — só a tela
-- escondia visualmente. Esta migration fecha essa lacuna com um mascaramento
-- de COLUNA por cima da RLS de LINHA que já existia (que continua valendo).
--
-- Como RLS do Postgres não mascara coluna (só linha), a leitura passa a ser
-- feita por funções (get_avaliacao_cultural, get_avaliacao_tecnica,
-- get_avaliacoes_por_ciclo, get_minhas_avaliacoes,
-- get_avaliacoes_para_avaliar) que devolvem NULL nos campos que o lado
-- errado ainda não pode ver, em vez de select direto na tabela. Escrita
-- continua indo direto pra tabela (upsertAvaliacaoCultural/Tecnica,
-- updateAvaliacao) — o que muda lá é só o app parar de reenviar os campos
-- que acabou de ler mascarados como null (senão apagaria a nota do outro
-- lado sem querer); ver commit do front-end.

-- Drift de schema: a coluna "revelado" nunca teve migration própria (foi
-- criada direto no dashboard do Supabase em algum momento) — adicionando
-- aqui de forma idempotente só pra documentar/blindar ambientes novos.
alter table public.avaliacoes
  add column if not exists revelado boolean not null default false;

-- ── Funções de máscara ───────────────────────────────────────────────────────

-- Lado "auto" (autoavaliação do colaborador): sempre visível pro admin e
-- pro próprio avaliado; pro avaliador (designado ou gestor no organograma)
-- só a partir da Calibragem — espelha gestorVeAuto no ModalAvaliacao.
create or replace function public.pode_ver_lado_auto(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_status text)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_avaliado(p_funcionario_id)
    or (
      (public.e_gestor_do_funcionario(p_funcionario_id) or public.e_avaliador_designado(p_avaliador_id))
      and p_status in ('calibragem', 'finalizada')
    );
$func$;

-- Lado "gestor" (nota do gestor/calibragem, observações gerais): sempre
-- visível pro admin e pra quem preencheu (avaliador designado ou gestor no
-- organograma); pro avaliado só depois de "revelado" — espelha
-- colaboradorVeGestor no ModalAvaliacao.
create or replace function public.pode_ver_lado_gestor(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_revelado boolean)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_gestor_do_funcionario(p_funcionario_id)
    or public.e_avaliador_designado(p_avaliador_id)
    or (public.e_avaliado(p_funcionario_id) and coalesce(p_revelado, false));
$func$;

-- ── Leitura mascarada por avaliação (usadas dentro do ModalAvaliacao) ───────
-- RLS de avaliacoes_cultural/avaliacoes_tecnica (pode_acessar_avaliacao)
-- continua valendo por trás — essas funções não têm SECURITY DEFINER, então
-- rodam com o RLS de quem chamou; só acrescentam o mascaramento de coluna.

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
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then ac.nota_calibragem end,
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
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then t.nota_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then t.observacoes end
  from public.avaliacoes_tecnica t
  join public.avaliacoes a on a.id = t.avaliacao_id
  where t.avaliacao_id = p_avaliacao_id;
$func$;

-- ── Leitura mascarada em lista (usadas nas telas de Avaliação) ──────────────
-- Substituem os selects diretos em avaliacao/page.tsx via
-- src/lib/queries/avaliacao.ts. RLS de avaliacoes (avaliacoes_select)
-- continua valendo por trás — quem não tem acesso à LINHA nem aparece aqui;
-- essas funções só mascaram COLUNA pra quem já tem acesso à linha.

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
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_cultural_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_tecnica_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_gestor end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_calibragem end,
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
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_cultural_calibragem end,
    case when public.pode_ver_lado_auto(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.status) then a.media_tecnica_auto end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_gestor end,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.media_tecnica_calibragem end,
    av.id, av.full_name,
    c.id, c.nome, c.periodo, c.ano, c.status
  from public.avaliacoes a
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  left join public.funcionarios av on av.id = a.avaliador_id
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
  ciclo_status text
)
language sql
stable
as $func$
  select
    a.id, a.status, a.vertical, a.tipo, a.revelado,
    case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then a.observacoes_gerais end,
    f.id, f.full_name, f.cargo,
    c.id, c.nome, c.periodo, c.ano, c.status
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  where a.avaliador_id = p_avaliador_funcionario_id
  order by a.created_at desc;
$func$;
