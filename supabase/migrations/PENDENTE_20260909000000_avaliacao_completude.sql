-- Pedido (09/09/2026): mostrar um selo de "Concluída" nas avaliações comuns
-- onde as TRÊS etapas — autoavaliação, avaliação do gestor e calibragem —
-- já têm nota em TODOS os pilares culturais e critérios técnicos. Hoje o
-- único sinal que existe é a coluna `status`, e ela não serve mais pra isso
-- desde duas mudanças anteriores: "Iniciar Calibragem" (27/08) avança todo
-- mundo pro status 'calibragem' em lote, sem checar se auto/gestor foi
-- preenchido; e a calibragem restrita (02/09+) fez surgir gente calibrando
-- só os próprios liderados, que às vezes ainda nem preencheu a própria
-- etapa (ver incidentes do Finato, 08-09/09/2026, registrados no log da
-- sessão). Então uma avaliação pode estar com status 'calibragem' ou até
-- 'finalizada' sem nenhuma nota real em algum dos três lados.
--
-- avaliacao_completude(p_avaliacao_id) confere isso de verdade, olhando os
-- campos granulares (não a média — media_cultural_gestor, por exemplo, fica
-- não-nula mesmo com só 1 de 4 pilares preenchidos, porque calcMedia no
-- front ignora null). SECURITY DEFINER e sem NENHUMA máscara de permissão:
-- ela só devolve TRUE/FALSE dizendo se o campo está preenchido, nunca o
-- valor da nota — não fere a regra de "cada um só vê a nota que deu"
-- (avaliacao_bloqueio_total_notas), que é sobre o VALOR da nota, não sobre
-- saber se uma etapa já foi concluída (isso já é público pra quem acessa a
-- linha, é basicamente o que `status` já tentava comunicar).
--
-- Cultural sempre tem exatamente 4 linhas (pilares 1-4) a partir do primeiro
-- salvamento de QUALQUER lado; técnica tem 1 linha por critério da vertical
-- escolhida, também criada desde o primeiro salvamento (upsertAvaliacaoTecnica
-- roda pra todo criterio da vertical em ModalAvaliacao.tsx/persistirCampos,
-- preenchendo com null quem ainda não opinou) — por isso basta contar as
-- linhas que já existem, sem precisar saber quantos critérios cada vertical
-- tem (isso só existe em VERTICAIS_CTZ, no front-end).
create or replace function public.avaliacao_completude(p_avaliacao_id uuid)
returns table (auto_completo boolean, gestor_completo boolean, calibragem_completo boolean)
language sql
stable
security definer
set search_path = public
as $func$
  select
    cult.auto_ok and tec.auto_ok,
    cult.gestor_ok and tec.gestor_ok,
    cult.calib_ok and tec.calib_ok
  from (
    select
      count(*) = 4 and count(*) filter (where nota_auto is not null) = 4 as auto_ok,
      count(*) = 4 and count(*) filter (where nota_gestor is not null) = 4 as gestor_ok,
      count(*) = 4 and count(*) filter (where nota_calibragem is not null) = 4 as calib_ok
    from public.avaliacoes_cultural
    where avaliacao_id = p_avaliacao_id
  ) cult
  cross join (
    select
      count(*) > 0 and count(*) filter (where nota_auto is not null) = count(*) as auto_ok,
      count(*) > 0 and count(*) filter (where nota_gestor is not null) = count(*) as gestor_ok,
      count(*) > 0 and count(*) filter (where nota_calibragem is not null) = count(*) as calib_ok
    from public.avaliacoes_tecnica
    where avaliacao_id = p_avaliacao_id
  ) tec;
$func$;

-- get_calibragem_pendente (referenciada por src/lib/queries/avaliacao.ts
-- desde 28/08, mas a função em si nunca chegou a ser commitada — se perdeu
-- no incidente da pasta supabase/migrations apagada local, ver Log de
-- Sessões 31/08/01-09). Reconstruída agora a partir do contrato já descrito
-- no comentário do lado JS: roda inteiro no banco (SECURITY DEFINER), não
-- devolve nenhuma nota, e só responde diferente de `false` pra quem tem
-- pode_ver_lado_calibragem (ciclo inteiro) — mesmo escopo de quem já vê o
-- botão "Finalizar Calibragem" no front-end.
create or replace function public.get_calibragem_pendente(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    public.pode_ver_lado_calibragem(p_ciclo_id)
    and exists (
      select 1
      from public.avaliacoes a
      cross join lateral public.avaliacao_completude(a.id) comp
      where a.ciclo_id = p_ciclo_id
        and a.tipo = 'padrao'
        and a.status = 'calibragem'
        and not comp.calibragem_completo
    );
$func$;

-- As três funções abaixo (get_avaliacoes_por_ciclo, get_minhas_avaliacoes,
-- get_avaliacoes_para_avaliar) ganham a coluna `completa` — drop + create
-- porque muda a lista de colunas do retorno (mesmo motivo de sempre). Regra
-- única, igual nas três: pares não tem autoavaliação nem calibragem, então
-- "completa" pra ela é só o lado gestor; avaliação comum exige os três.
drop function if exists public.get_avaliacoes_por_ciclo(uuid);
drop function if exists public.get_minhas_avaliacoes(uuid);
drop function if exists public.get_avaliacoes_para_avaliar(uuid);

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
    case when a.tipo = 'pares' then comp.gestor_completo else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  left join public.funcionarios av on av.id = a.avaliador_id
  cross join lateral public.avaliacao_completude(a.id) comp
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
    case when a.tipo = 'pares' then comp.gestor_completo else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  left join public.funcionarios av on av.id = a.avaliador_id
  cross join lateral public.avaliacao_completude(a.id) comp
  where a.funcionario_id = p_funcionario_id
  order by a.created_at desc;
$func$;

create function public.get_avaliacoes_para_avaliar(p_avaliador_funcionario_id uuid)
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
    case when a.tipo = 'pares' then comp.gestor_completo else (comp.auto_completo and comp.gestor_completo and comp.calibragem_completo) end
  from public.avaliacoes a
  join public.funcionarios f on f.id = a.funcionario_id
  join public.ciclos_avaliacao c on c.id = a.ciclo_id
  cross join lateral public.avaliacao_completude(a.id) comp
  where a.avaliador_id = p_avaliador_funcionario_id
  order by a.created_at desc;
$func$;
