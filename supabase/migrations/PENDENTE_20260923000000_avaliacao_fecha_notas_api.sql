-- Pente fino 23/09/2026, achado C1: as notas de avaliação ficavam abertas pela
-- API pra quem tinha acesso à LINHA — inclusive o próprio avaliado.
--
--   * avaliacoes_cultural_all / avaliacoes_tecnica_all (migration 20260720)
--     são FOR ALL com pode_acessar_avaliacao, que inclui e_avaliado. Qualquer
--     funcionário conseguia `select nota_gestor, nota_calibragem` e também
--     `upsert` nessas colunas da PRÓPRIA avaliação direto pelo supabase-js.
--   * avaliacoes_update (20260827010000) também inclui e_avaliado: dava pra
--     gravar media_*_calibragem e status = 'finalizada' na própria avaliação.
--   * A máscara de coluna (20260821) só existe dentro das funções get_*; o
--     SELECT direto na tabela sempre devolveu tudo. A migration que fecharia
--     isso (20260828030000_avaliacao_fecha_leitura_direta_notas) se perdeu em
--     31/08 e nunca foi reconstruída.
--
-- O que esta migration faz:
--
-- 1. LEITURA: tira o SELECT direto das colunas de nota pra `authenticated`.
--    As funções de leitura mascaradas (get_avaliacao_cultural etc.) eram
--    SECURITY INVOKER e dependiam desse SELECT. Elas passam a ser SECURITY
--    DEFINER com dono `avaliacao_leitor` — um papel sem login que NÃO é dono
--    das tabelas, então a RLS continua filtrando as LINHAS exatamente como
--    antes (auth.uid() vem da sessão, não do papel). Só muda que as colunas
--    agora são lidas com o privilégio desse papel. O corpo das funções não é
--    tocado (evita divergência com o que está no banco hoje).
--
-- 2. ESCRITA: tira INSERT/UPDATE/DELETE direto de avaliacoes_cultural/tecnica
--    e UPDATE direto de avaliacoes. Toda gravação passa por 4 RPCs novas, que
--    checam no servidor quem pode gravar cada lado:
--      - lado AUTO (nota_auto, observacoes/evidências, media_*_auto): só o
--        próprio avaliado;
--      - lado GESTOR (nota_gestor, observacoes_gerais, media_*_gestor): mesma
--        regra de pode_ver_lado_gestor (admin, gestor no organograma ou
--        avaliador designado);
--      - lado CALIBRAGEM (nota_calibragem, observacoes_calibragem,
--        media_*_calibragem): pode_ver_lado_calibragem (ciclo inteiro) ou
--        e_calibrador_restrito (só os próprios liderados).
--    Campo de um lado que a pessoa não pode gravar é IGNORADO (não dá erro) —
--    de propósito: o front-end às vezes reenvia o valor mascarado (null) do
--    outro lado, e antes isso podia apagar a nota de outra pessoa.
--    Status só avança nas transições do fluxo normal (pendente→auto_concluida
--    pelo avaliado; auto_concluida→gestor_concluida e, em pares,
--    pendente→gestor_concluida pelo lado gestor). Qualquer outra mudança de
--    status só por administrador ou pelas RPCs de calibragem em lote.
--    Avaliação 'finalizada' ou de ciclo 'encerrado' fica travada pra quem não
--    é administrador (antes "encerrar" era só rótulo).
--
-- INSERT/DELETE em avaliacoes continuam diretos (policies admin-only já
-- cobrem). avaliacoes_pdi não muda.
--
-- Tudo roda numa transação: se qualquer passo falhar, nada fica aplicado.
-- Depois de rodar, fazer o teste da seção "VERIFICAÇÃO" no fim do arquivo.

begin;

-- ── 1. Papel dono das funções de leitura ────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'avaliacao_leitor') then
    create role avaliacao_leitor nologin;
  end if;
end
$$;

-- Quem roda o script precisa pertencer ao papel pra poder transferir a posse.
grant avaliacao_leitor to current_user;
-- Herda os privilégios de `authenticated` (leitura de funcionarios,
-- ciclos_avaliacao etc. e execução das funções auxiliares), e as policies
-- escritas "to authenticated" passam a valer pra ele também.
grant authenticated to avaliacao_leitor;
grant usage, create on schema public to avaliacao_leitor;
grant select on public.avaliacoes, public.avaliacoes_cultural, public.avaliacoes_tecnica to avaliacao_leitor;

do $$
declare
  r record;
  funcoes text[] := array[
    'get_avaliacao_cultural',
    'get_avaliacao_tecnica',
    'get_avaliacoes_por_ciclo',
    'get_minhas_avaliacoes',
    'get_avaliacoes_para_avaliar',
    'get_calibragem_ciclo_cultural',
    'get_calibragem_ciclo_tecnica',
    'get_detalhamento_perguntas_ciclo'
  ];
begin
  for r in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (funcoes)
      and not p.prosecdef
  loop
    execute format('alter function %s owner to avaliacao_leitor', r.assinatura);
    execute format('alter function %s security definer', r.assinatura);
    execute format('alter function %s set search_path = public', r.assinatura);
  end loop;
end
$$;

-- ── 2. RPCs de escrita ──────────────────────────────────────────────────────

-- Grava UMA linha de nota (um pilar cultural ou um critério técnico).
-- p_tipo: 'cultural' (p_chave = número do pilar, '1'..'4') ou 'tecnica'
-- (p_chave = criterio_key). p_campos: só as chaves que o front quer gravar
-- (nota_auto, nota_gestor, nota_calibragem, observacoes); chave ausente = não
-- mexe, chave com null = apaga (se a pessoa puder gravar aquele lado).
create or replace function public.salvar_nota_avaliacao(
  p_avaliacao_id uuid,
  p_tipo text,
  p_chave text,
  p_campos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  a public.avaliacoes%rowtype;
  v_ciclo_status text;
  v_admin boolean;
  v_auto boolean;
  v_gestor boolean;
  v_calib boolean;
  v_pilar smallint;
begin
  select * into a from public.avaliacoes where id = p_avaliacao_id;
  if not found or not public.pode_acessar_avaliacao(p_avaliacao_id) then
    raise exception 'Avaliação não encontrada ou sem acesso.' using errcode = '42501';
  end if;

  select status into v_ciclo_status from public.ciclos_avaliacao where id = a.ciclo_id;
  v_admin := public.e_admin_do_ciclo(a.ciclo_id);

  if not v_admin and (a.status = 'finalizada' or v_ciclo_status = 'encerrado') then
    raise exception 'Esta avaliação já foi finalizada (ou o ciclo foi encerrado) e não pode mais ser alterada.' using errcode = '42501';
  end if;

  v_auto := public.e_avaliado(a.funcionario_id);
  v_gestor := public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado);
  v_calib := public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id);

  -- Nada que esta pessoa possa gravar: não cria linha vazia, só sai.
  if not (
    (v_auto and (p_campos ? 'nota_auto' or p_campos ? 'observacoes'))
    or (v_gestor and p_campos ? 'nota_gestor')
    or (v_calib and p_campos ? 'nota_calibragem')
  ) then
    return;
  end if;

  if p_tipo = 'cultural' then
    v_pilar := p_chave::smallint;
    if v_pilar not between 1 and 4 then
      raise exception 'Pilar inválido: %', p_chave;
    end if;

    insert into public.avaliacoes_cultural (avaliacao_id, pilar)
    values (p_avaliacao_id, v_pilar)
    on conflict (avaliacao_id, pilar) do nothing;

    update public.avaliacoes_cultural set
      nota_auto = case when v_auto and p_campos ? 'nota_auto' then (p_campos->>'nota_auto')::smallint else nota_auto end,
      observacoes = case when v_auto and p_campos ? 'observacoes' then p_campos->>'observacoes' else observacoes end,
      nota_gestor = case when v_gestor and p_campos ? 'nota_gestor' then (p_campos->>'nota_gestor')::smallint else nota_gestor end,
      nota_calibragem = case when v_calib and p_campos ? 'nota_calibragem' then (p_campos->>'nota_calibragem')::smallint else nota_calibragem end
    where avaliacao_id = p_avaliacao_id and pilar = v_pilar;

  elsif p_tipo = 'tecnica' then
    if coalesce(trim(p_chave), '') = '' then
      raise exception 'Critério técnico inválido.';
    end if;

    insert into public.avaliacoes_tecnica (avaliacao_id, criterio_key)
    values (p_avaliacao_id, p_chave)
    on conflict (avaliacao_id, criterio_key) do nothing;

    update public.avaliacoes_tecnica set
      nota_auto = case when v_auto and p_campos ? 'nota_auto' then (p_campos->>'nota_auto')::smallint else nota_auto end,
      observacoes = case when v_auto and p_campos ? 'observacoes' then p_campos->>'observacoes' else observacoes end,
      nota_gestor = case when v_gestor and p_campos ? 'nota_gestor' then (p_campos->>'nota_gestor')::smallint else nota_gestor end,
      nota_calibragem = case when v_calib and p_campos ? 'nota_calibragem' then (p_campos->>'nota_calibragem')::smallint else nota_calibragem end
    where avaliacao_id = p_avaliacao_id and criterio_key = p_chave;

  else
    raise exception 'Tipo de nota inválido: %', p_tipo;
  end if;
end;
$func$;

-- Atualiza a linha-pai da avaliação (vertical, status, observações, médias).
-- Mesma regra de lados de salvar_nota_avaliacao.
create or replace function public.atualizar_avaliacao(
  p_avaliacao_id uuid,
  p_campos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  a public.avaliacoes%rowtype;
  v_ciclo_status text;
  v_admin boolean;
  v_auto boolean;
  v_gestor boolean;
  v_calib boolean;
  v_novo_status text;
  v_pares boolean;
begin
  select * into a from public.avaliacoes where id = p_avaliacao_id;
  if not found or not public.pode_acessar_avaliacao(p_avaliacao_id) then
    raise exception 'Avaliação não encontrada ou sem acesso.' using errcode = '42501';
  end if;

  select status into v_ciclo_status from public.ciclos_avaliacao where id = a.ciclo_id;
  v_admin := public.e_admin_do_ciclo(a.ciclo_id);

  if not v_admin and (a.status = 'finalizada' or v_ciclo_status = 'encerrado') then
    raise exception 'Esta avaliação já foi finalizada (ou o ciclo foi encerrado) e não pode mais ser alterada.' using errcode = '42501';
  end if;

  v_auto := public.e_avaliado(a.funcionario_id);
  v_gestor := public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado);
  v_calib := public.pode_ver_lado_calibragem(a.ciclo_id) or public.e_calibrador_restrito(a.funcionario_id);
  v_pares := a.tipo = 'pares';

  -- Status: só as transições do fluxo normal, a menos que seja administrador.
  v_novo_status := a.status;
  if p_campos ? 'status' and (p_campos->>'status') is distinct from a.status then
    v_novo_status := p_campos->>'status';
    if v_novo_status is null or v_novo_status not in ('pendente', 'auto_concluida', 'gestor_concluida', 'calibragem', 'finalizada') then
      raise exception 'Status inválido: %', v_novo_status;
    end if;
    if not (
      v_admin
      or (not v_pares and a.status = 'pendente' and v_novo_status = 'auto_concluida' and v_auto)
      or (not v_pares and a.status = 'auto_concluida' and v_novo_status = 'gestor_concluida' and v_gestor)
      or (v_pares and a.status = 'pendente' and v_novo_status = 'gestor_concluida' and v_gestor)
    ) then
      raise exception 'Mudança de status não permitida (% → %).', a.status, v_novo_status using errcode = '42501';
    end if;
  end if;

  update public.avaliacoes set
    status = v_novo_status,
    vertical = case when p_campos ? 'vertical' then nullif(p_campos->>'vertical', '') else vertical end,
    avaliador_id = case when v_admin and p_campos ? 'avaliador_id' then (p_campos->>'avaliador_id')::uuid else avaliador_id end,
    revelado = case when v_admin and p_campos ? 'revelado' then coalesce((p_campos->>'revelado')::boolean, false) else revelado end,
    evidencias_culturais = case when v_auto and p_campos ? 'evidencias_culturais' then p_campos->>'evidencias_culturais' else evidencias_culturais end,
    evidencias_tecnicas = case when v_auto and p_campos ? 'evidencias_tecnicas' then p_campos->>'evidencias_tecnicas' else evidencias_tecnicas end,
    media_cultural_auto = case when v_auto and p_campos ? 'media_cultural_auto' then (p_campos->>'media_cultural_auto')::numeric else media_cultural_auto end,
    media_tecnica_auto = case when v_auto and p_campos ? 'media_tecnica_auto' then (p_campos->>'media_tecnica_auto')::numeric else media_tecnica_auto end,
    observacoes_gerais = case when v_gestor and p_campos ? 'observacoes_gerais' then p_campos->>'observacoes_gerais' else observacoes_gerais end,
    media_cultural_gestor = case when v_gestor and p_campos ? 'media_cultural_gestor' then (p_campos->>'media_cultural_gestor')::numeric else media_cultural_gestor end,
    media_tecnica_gestor = case when v_gestor and p_campos ? 'media_tecnica_gestor' then (p_campos->>'media_tecnica_gestor')::numeric else media_tecnica_gestor end,
    observacoes_calibragem = case when v_calib and p_campos ? 'observacoes_calibragem' then p_campos->>'observacoes_calibragem' else observacoes_calibragem end,
    media_cultural_calibragem = case when v_calib and p_campos ? 'media_cultural_calibragem' then (p_campos->>'media_cultural_calibragem')::numeric else media_cultural_calibragem end,
    media_tecnica_calibragem = case when v_calib and p_campos ? 'media_tecnica_calibragem' then (p_campos->>'media_tecnica_calibragem')::numeric else media_tecnica_calibragem end
  where id = p_avaliacao_id;
end;
$func$;

-- Calibragem em lote (antes era UPDATE direto na tabela pelo navegador).
create or replace function public.iniciar_calibragem_ciclo(p_ciclo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if not public.pode_ver_lado_calibragem(p_ciclo_id) then
    raise exception 'Sem permissão para iniciar a calibragem deste ciclo.' using errcode = '42501';
  end if;

  update public.avaliacoes
  set status = 'calibragem'
  where ciclo_id = p_ciclo_id
    and tipo = 'padrao'
    and status in ('pendente', 'auto_concluida', 'gestor_concluida');
end;
$func$;

create or replace function public.finalizar_calibragem_ciclo(p_ciclo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if not public.pode_ver_lado_calibragem(p_ciclo_id) then
    raise exception 'Sem permissão para finalizar a calibragem deste ciclo.' using errcode = '42501';
  end if;
  -- Mesma trava que o botão já tinha no front-end, agora também no servidor.
  if public.get_calibragem_pendente(p_ciclo_id) then
    raise exception 'Ainda há avaliações sem nota de calibragem completa neste ciclo.';
  end if;

  update public.avaliacoes
  set status = 'finalizada'
  where ciclo_id = p_ciclo_id
    and tipo = 'padrao'
    and status = 'calibragem';
end;
$func$;

revoke all on function public.salvar_nota_avaliacao(uuid, text, text, jsonb) from public, anon;
revoke all on function public.atualizar_avaliacao(uuid, jsonb) from public, anon;
revoke all on function public.iniciar_calibragem_ciclo(uuid) from public, anon;
revoke all on function public.finalizar_calibragem_ciclo(uuid) from public, anon;
grant execute on function public.salvar_nota_avaliacao(uuid, text, text, jsonb) to authenticated;
grant execute on function public.atualizar_avaliacao(uuid, jsonb) to authenticated;
grant execute on function public.iniciar_calibragem_ciclo(uuid) to authenticated;
grant execute on function public.finalizar_calibragem_ciclo(uuid) to authenticated;

-- ── 3. Fecha o acesso direto às tabelas ─────────────────────────────────────

revoke all on public.avaliacoes_cultural from anon, authenticated;
revoke all on public.avaliacoes_tecnica from anon, authenticated;

-- avaliacoes: o front ainda lê funcionario_id/avaliador_id direto (montagem
-- do ciclo) e faz INSERT/DELETE direto (policies admin-only). Só as colunas
-- sem nota continuam legíveis; UPDATE direto sai.
revoke all on public.avaliacoes from anon;
revoke select, update on public.avaliacoes from authenticated;
grant select (id, ciclo_id, funcionario_id, avaliador_id, vertical, status, tipo, revelado, created_at)
  on public.avaliacoes to authenticated;

commit;

-- ── VERIFICAÇÃO (rodar depois, separado) ────────────────────────────────────
-- a) As 8 funções de leitura devem aparecer com security_definer = true e
--    dono avaliacao_leitor:
--
--    select p.proname, p.prosecdef as security_definer, pg_get_userbyid(p.proowner) as dono
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and (p.proname like 'get_%avalia%' or p.proname like 'get_calibragem_ciclo_%' or p.proname = 'get_detalhamento_perguntas_ciclo')
--    order by 1;
--
-- b) Nenhuma OUTRA função sem security definer deveria ler estas colunas (se
--    esta consulta devolver alguma linha, me avise — ela quebraria):
--
--    select p.oid::regprocedure
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and not p.prosecdef
--      and p.prosrc ~* '(avaliacoes_cultural|avaliacoes_tecnica|media_cultural_|media_tecnica_|observacoes_calibragem|observacoes_gerais)';
--
-- c) Teste no app com uma conta que NÃO é administradora: abrir a própria
--    autoavaliação, salvar; e, como gestor, abrir a avaliação de um liderado
--    e salvar. As duas coisas devem continuar funcionando.
--
-- ── DESFAZER (só se algo quebrar) ───────────────────────────────────────────
-- grant select, insert, update, delete on public.avaliacoes_cultural, public.avaliacoes_tecnica to authenticated;
-- grant select, update on public.avaliacoes to authenticated;
-- e, pra cada função da lista do passo 1:
--   alter function public.<nome>(uuid) security invoker;
--   alter function public.<nome>(uuid) owner to postgres;
-- (o front-end novo continua funcionando com o banco desfeito, porque as RPCs
-- de escrita continuam existindo.)
