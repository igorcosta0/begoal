-- Painel de Calibragem (pedido ago/2026): hoje o administrador só calibra
-- abrindo o ModalAvaliacao pessoa por pessoa. O pedido é um painel único, com
-- o ciclo inteiro numa tabela — Auto / Avaliador / Média de Pares / Calibragem
-- lado a lado por pilar cultural (e Auto / Avaliador / Calibragem por
-- critério técnico, sem coluna de pares — Avaliação de Pares é só cultural,
-- ver migration 20260812_avaliacao_pares).
--
-- Estas duas funções alimentam esse painel. Seguem o MESMO padrão de máscara
-- de coluna das funções já existentes (get_avaliacao_cultural/tecnica,
-- migration 20260821_avaliacao_mascara_notas + 20260825_avaliacao_calibragem_
-- admin_only): não são SECURITY DEFINER, então RLS de avaliacoes/avaliacoes_
-- cultural/avaliacoes_tecnica (pode_acessar_avaliacao) continua valendo por
-- trás pra decidir quem VÊ a linha; aqui só mascaramos as COLUNAS de nota por
-- cima disso com pode_ver_lado_calibragem — a mesma função que já trava a
-- aba "Calibragem" dentro do ModalAvaliacao pra só administrador de verdade.
-- Não criamos NENHUMA função nova de acesso, nem tocamos em
-- pode_ver_lado_auto/pode_ver_lado_gestor — quem não é admin continua sem ver
-- nota de ninguém aqui, ponto.
--
-- Média de pares é calculada na hora da leitura (subquery lateral), não
-- guardada em coluna: evita ficar desatualizada se uma avaliação de pares for
-- editada depois de o admin já ter aberto o painel.

create or replace function public.get_calibragem_ciclo_cultural(p_ciclo_id uuid)
returns table (
  avaliacao_id uuid,
  funcionario_id uuid,
  funcionario_nome text,
  funcionario_cargo text,
  vertical text,
  status text,
  pilar smallint,
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
    a.funcionario_id,
    f.full_name,
    f.cargo,
    a.vertical,
    a.status,
    ac.pilar,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_auto end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_gestor end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then pares.media end,
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_calibragem end
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  join public.avaliacoes_cultural ac on ac.avaliacao_id = a.id
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
  where a.ciclo_id = p_ciclo_id
    and a.tipo = 'padrao'
    and a.status in ('calibragem', 'finalizada')
  order by f.full_name, ac.pilar;
$func$;

create or replace function public.get_calibragem_ciclo_tecnica(p_ciclo_id uuid)
returns table (
  avaliacao_id uuid,
  criterio_key text,
  nota_auto smallint,
  nota_avaliador smallint,
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
    case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_calibragem end
  from public.avaliacoes a
  join public.avaliacoes_tecnica t on t.avaliacao_id = a.id
  where a.ciclo_id = p_ciclo_id
    and a.tipo = 'padrao'
    and a.status in ('calibragem', 'finalizada');
$func$;
