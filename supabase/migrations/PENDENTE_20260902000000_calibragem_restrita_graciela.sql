-- Pedido (02/09/2026): Graciela Borges Hoepers (Líder de Urbanismo, CTZ,
-- user_id 203e4429-b9c7-451f-bc00-cc42f6e713f4) precisa fazer a calibragem
-- do(s) liderado(s) dela neste ciclo (Angelica Scarpari Machado e Fabiana
-- Carolina de Olivera, funcionarios.gestor_id = Graciela).
--
-- Diferença importante em relação aos calibradores existentes (Igor,
-- Filippe Réus, Priscila Santos, Felipe Marques Santos — migrations
-- 20260827000000/20260827010000/20260827020000/20260828000000): aqueles
-- quatro enxergam/calibram o CICLO INTEIRO da CTZ (pode_ver_lado_calibragem
-- é um booleano por ciclo, sem noção de funcionário). O pedido explícito
-- desta vez é o oposto: Graciela só pode ver a autoavaliação e calibrar
-- quem ELA lidera de verdade no organograma — não o resto da empresa. Por
-- isso não entra na lista fixa de pode_ver_lado_calibragem; ganha uma
-- função nova, escopada por funcionário.
--
-- e_calibrador_restrito(p_funcionario_id) reaproveita e_gestor_do_funcionario
-- (mesma checagem de organograma — funcionarios.gestor_id — que já rege
-- quem pode preencher a nota de GESTOR de um liderado, migration
-- 20260807000000_avaliacao_escopo_gestor) e soma uma lista fixa de
-- "calibradores restritos" (só Graciela por enquanto, mesmo padrão de lista
-- fixa por e-mail/user_id já usado em pode_ver_lado_calibragem). Sem gate de
-- status, mesmo tratamento incondicional de "auditor do próprio liderado"
-- que pode_ver_lado_gestor já dá pra qualquer gestor via e_gestor_do_funcionario.
--
-- Acesso de LINHA (pode_acessar_avaliacao / avaliacoes_select / avaliacoes_
-- update, e por tabela avaliacoes_cultural/tecnica que reusam
-- pode_acessar_avaliacao) já cobre isso: e_gestor_do_funcionario(funcionario_id)
-- já está no OR dessas policies desde 20260807000000 — Graciela já consegue
-- abrir e gravar nota nas avaliações dos próprios liderados (é como ela já
-- preenche a nota de gestor hoje). O que falta é só a MÁSCARA de leitura:
-- nota_auto (pode_ver_lado_auto) e nota_calibragem/media_*_calibragem/
-- observacoes_calibragem (hoje só pode_ver_lado_calibragem, por ciclo
-- inteiro) — esta migration soma e_calibrador_restrito(funcionario_id) nas
-- duas, só nas funções que expõem essas colunas por avaliação/funcionário
-- (get_avaliacao_cultural/tecnica, get_avaliacoes_por_ciclo). Não mexe em
-- get_calibragem_ciclo_cultural/tecnica (Painel de Calibragem em lote,
-- migration 20260826000000) de propósito — esse painel continua mascarado
-- só por pode_ver_lado_calibragem (ciclo inteiro), então mesmo que alguém
-- chame a função direto, Graciela não vê nada ali; o botão que abre esse
-- painel já é exclusivo de souGestorDaCalibragem no front-end e continua
-- sendo. Também não mexe em get_minhas_avaliacoes: ali p_funcionario_id é
-- sempre o do próprio usuário logado, e ninguém é gestor de si mesmo, então
-- e_calibrador_restrito(a.funcionario_id) ali nunca faria diferença.
--
-- Front-end: nova prop souCalibradorRestrito em ModalAvaliacao (avaliacao/
-- page.tsx + ModalAvaliacao.tsx) soma nessa mesma checagem pra abrir a aba
-- Calibragem/mostrar a nota auto — mas SEM entrar na lista de
-- souGestorDaCalibragem, então Graciela não ganha "Iniciar/Finalizar
-- Calibragem" em lote nem o Painel de Calibragem do ciclo inteiro, só a
-- calibragem individual de quem ela lidera (a RLS acima garante isso mesmo
-- que o front-end erre).

create or replace function public.e_calibrador_restrito(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    auth.uid() in (
      '203e4429-b9c7-451f-bc00-cc42f6e713f4' -- Graciela Borges Hoepers
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;

-- pode_ver_lado_auto ganha o novo OR — nota_auto/observacoes fica visível
-- pro calibrador restrito, só do(s) funcionário(s) que ele lidera.
create or replace function public.pode_ver_lado_auto(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_status text)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_avaliado(p_funcionario_id)
    or public.pode_ver_lado_calibragem(p_ciclo_id)
    or public.e_calibrador_restrito(p_funcionario_id);
$func$;

-- get_avaliacao_cultural / get_avaliacao_tecnica (assinatura igual à da
-- migration 20260827040000_avaliacao_media_pares_individual — só troca o
-- corpo, sem precisar de DROP): nota_calibragem e media_pares passam a
-- aparecer também pro calibrador restrito do funcionário avaliado.
create or replace function public.get_avaliacao_cultural(p_avaliacao_id uuid)
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
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then ac.nota_calibragem end,
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

create or replace function public.get_avaliacao_tecnica(p_avaliacao_id uuid)
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
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id) then t.nota_calibragem end,
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

-- get_avaliacoes_por_ciclo (assinatura igual à da migration
-- 20260828020000_avaliacao_observacoes_calibragem — só troca o corpo):
-- media_*_calibragem e observacoes_calibragem também liberadas pro
-- calibrador restrito do funcionário da linha.
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
  avaliador_nome text
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
    av.id, av.full_name
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  left join public.funcionarios av on av.id = a.avaliador_id
  where a.ciclo_id = p_ciclo_id
  order by a.created_at;
$func$;
