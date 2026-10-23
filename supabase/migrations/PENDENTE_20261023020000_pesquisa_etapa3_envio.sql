-- Pesquisa, etapa 3 do guia do Miro (23/10/2026, "M3 Envio e Distribuição").
-- Decisões do Igor nesta etapa:
--   * a resposta passa a guardar o "segmento" de quem respondeu (setor, cargo,
--     tempo de empresa, estado, cliente), nunca o nome. Os recortes da etapa 4
--     só aparecem com 5 respostas ou mais;
--   * convite e lembrete saem do e-mail do próprio administrador (sem serviço
--     de envio): o sistema só gera os links individuais e as mensagens.
--
-- O que muda:
--   * publico = 'lista' (F30–F35): lista importada de planilha; cada pessoa
--     tem um link próprio e responde sem login (F32). Uma resposta por pessoa;
--   * pesquisas.filtro (F36–F39): {"setores": [...], "cargos": [...],
--     "clientes": [...]}. Vazio = todos. Vale para 'interna' (pelo cadastro de
--     funcionários) e para 'lista' (pelas colunas da planilha);
--   * pesquisas.pede_identificacao (F28): link aberto pode dispensar e-mail,
--     nome e empresa (aí não há como barrar resposta repetida);
--   * pesquisas.repetir_meses e origem_id (F40): reaplicação periódica; a
--     cópia aponta para a anterior (base dos comparativos da etapa 4);
--   * convite_assunto / convite_mensagem (F31), com {nome} e {link}.
--
-- Rode este script inteiro no SQL Editor do Supabase ANTES do push do front.

-- ── Pesquisa ─────────────────────────────────────────────────────────────────

alter table public.pesquisas drop constraint if exists pesquisas_publico_check;
alter table public.pesquisas add constraint pesquisas_publico_check
  check (publico in ('interna', 'lista', 'externa'));

alter table public.pesquisas add column if not exists filtro jsonb not null default '{}'::jsonb;
alter table public.pesquisas add column if not exists pede_identificacao boolean not null default true;
alter table public.pesquisas add column if not exists repetir_meses int;
alter table public.pesquisas drop constraint if exists pesquisas_repetir_meses_check;
alter table public.pesquisas add constraint pesquisas_repetir_meses_check
  check (repetir_meses is null or repetir_meses between 1 and 12);
alter table public.pesquisas add column if not exists origem_id uuid references public.pesquisas(id) on delete set null;
alter table public.pesquisas add column if not exists convite_assunto text;
alter table public.pesquisas add column if not exists convite_mensagem text;

-- ── Segmento na resposta ─────────────────────────────────────────────────────

alter table public.pesquisa_respostas add column if not exists segmento jsonb not null default '{}'::jsonb;

-- ── Participantes (lista importada) ──────────────────────────────────────────

create table if not exists public.pesquisa_participantes (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0 and length(nome) <= 200),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  setor text check (length(setor) <= 120),
  cargo text check (length(cargo) <= 120),
  tempo_empresa text check (length(tempo_empresa) <= 60),
  estado text check (length(estado) <= 60),
  cliente text check (length(cliente) <= 120),
  -- Link individual (128 bits aleatórios, como o token da pesquisa).
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  convidado_em timestamptz,
  -- Só a DATA, como em pesquisa_participacoes.
  respondeu_em date,
  created_at timestamptz not null default now()
);
create index if not exists pesquisa_participantes_pesquisa_idx on public.pesquisa_participantes (pesquisa_id);
create unique index if not exists pesquisa_participantes_email_unico
  on public.pesquisa_participantes (pesquisa_id, lower(email));

alter table public.pesquisa_participantes enable row level security;

drop policy if exists "pesquisa_participantes_admin_select" on public.pesquisa_participantes;
create policy "pesquisa_participantes_admin_select" on public.pesquisa_participantes
  for select using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_participantes.pesquisa_id and public.pesquisa_sou_admin(p.client_id))
  );

drop policy if exists "pesquisa_participantes_admin_insert" on public.pesquisa_participantes;
create policy "pesquisa_participantes_admin_insert" on public.pesquisa_participantes
  for insert with check (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_participantes.pesquisa_id and public.pesquisa_sou_admin(p.client_id))
  );

drop policy if exists "pesquisa_participantes_admin_update" on public.pesquisa_participantes;
create policy "pesquisa_participantes_admin_update" on public.pesquisa_participantes
  for update using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_participantes.pesquisa_id and public.pesquisa_sou_admin(p.client_id))
  );

drop policy if exists "pesquisa_participantes_admin_delete" on public.pesquisa_participantes;
create policy "pesquisa_participantes_admin_delete" on public.pesquisa_participantes
  for delete using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_participantes.pesquisa_id and public.pesquisa_sou_admin(p.client_id))
  );

-- O administrador cadastra os dados da pessoa e marca o convite; token e
-- "respondeu" só mudam pelo banco (senão daria para liberar resposta dupla).
revoke insert, update on public.pesquisa_participantes from anon, authenticated;
grant insert (pesquisa_id, nome, email, setor, cargo, tempo_empresa, estado, cliente)
  on public.pesquisa_participantes to authenticated;
grant update (convidado_em) on public.pesquisa_participantes to authenticated;
revoke all on public.pesquisa_participantes from anon;

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Filtro vazio (ou lista vazia) = todos.
create or replace function public.pesquisa_no_filtro(p_filtro jsonb, p_setor text, p_cargo text, p_cliente text)
returns boolean
language sql
immutable
as $$
  select (coalesce(jsonb_array_length(case when jsonb_typeof(p_filtro -> 'setores') = 'array' then p_filtro -> 'setores' end), 0) = 0
          or (p_filtro -> 'setores') ? coalesce(p_setor, ''))
     and (coalesce(jsonb_array_length(case when jsonb_typeof(p_filtro -> 'cargos') = 'array' then p_filtro -> 'cargos' end), 0) = 0
          or (p_filtro -> 'cargos') ? coalesce(p_cargo, ''))
     and (coalesce(jsonb_array_length(case when jsonb_typeof(p_filtro -> 'clientes') = 'array' then p_filtro -> 'clientes' end), 0) = 0
          or (p_filtro -> 'clientes') ? coalesce(p_cliente, ''));
$$;

-- Mesmas faixas do front (faixaTempoEmpresa em src/lib/pesquisaImportacao.ts).
create or replace function public.pesquisa_faixa_tempo(p_admissao date)
returns text
language sql
stable
as $$
  select case
    when p_admissao is null then null
    when age(current_date, p_admissao) < interval '1 year' then 'Menos de 1 ano'
    when age(current_date, p_admissao) < interval '3 years' then '1 a 3 anos'
    when age(current_date, p_admissao) < interval '5 years' then '3 a 5 anos'
    else 'Mais de 5 anos'
  end;
$$;

-- ── Interna: confere o filtro e grava o segmento ─────────────────────────────

create or replace function public.pesquisa_interna_responder(p_pesquisa_id uuid, p_respostas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pesquisa public.pesquisas;
  v_itens jsonb;
  v_setor text;
  v_cargo text;
  v_admissao date;
begin
  if auth.uid() is null then
    raise exception 'Faça login para responder.';
  end if;

  select * into v_pesquisa from public.pesquisas where id = p_pesquisa_id and publico = 'interna';
  if not found or not exists (
    select 1 from public.user_company_roles ucr
    where ucr.client_id = v_pesquisa.client_id and ucr.user_id = auth.uid()
  ) then
    raise exception 'Pesquisa não encontrada.';
  end if;
  if v_pesquisa.status <> 'aberta' then
    raise exception 'Esta pesquisa não está aberta.';
  end if;

  select s.name, f.cargo, f.data_admissao into v_setor, v_cargo, v_admissao
  from public.funcionarios f
  left join public.setores s on s.id = f.setor_id
  where f.client_id = v_pesquisa.client_id and f.user_id = auth.uid()
  order by f.is_current desc nulls last, f.created_at desc
  limit 1;

  if not public.pesquisa_no_filtro(v_pesquisa.filtro, v_setor, v_cargo, null) then
    raise exception 'Esta pesquisa não foi aplicada à sua área ou ao seu cargo.';
  end if;

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  begin
    insert into public.pesquisa_participacoes (pesquisa_id, user_id) values (v_pesquisa.id, auth.uid());
  exception when unique_violation then
    raise exception 'Você já respondeu esta pesquisa.';
  end;

  insert into public.pesquisa_respostas (pesquisa_id, itens, segmento)
  values (v_pesquisa.id, v_itens, jsonb_strip_nulls(jsonb_build_object(
    'setor', v_setor, 'cargo', v_cargo, 'tempo_empresa', public.pesquisa_faixa_tempo(v_admissao)
  )));
end;
$$;

-- ── Externa (link aberto): identificação opcional ────────────────────────────

create or replace function public.pesquisa_publica_obter(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'titulo', p.titulo,
    'descricao', p.descricao,
    'status', p.status,
    'empresa', c.company_name,
    'pede_identificacao', p.pede_identificacao,
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'tipo', q.tipo, 'enunciado', q.enunciado,
        'opcoes', q.opcoes, 'obrigatoria', q.obrigatoria
      ) order by q.ordem)
      from public.pesquisa_perguntas q where q.pesquisa_id = p.id
    ), '[]'::jsonb)
  )
  from public.pesquisas p
  join public.clients c on c.id = p.client_id
  where p.token = p_token
    and p.publico = 'externa'
    and p.status <> 'rascunho';
$$;

create or replace function public.pesquisa_publica_responder(
  p_token text, p_email text, p_nome text, p_empresa text, p_respostas jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pesquisa public.pesquisas;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_empresa text := trim(coalesce(p_empresa, ''));
  v_itens jsonb;
begin
  select * into v_pesquisa from public.pesquisas
  where token = p_token and publico = 'externa';
  if not found or v_pesquisa.status = 'rascunho' then
    raise exception 'Pesquisa não encontrada.';
  end if;
  if v_pesquisa.status = 'pausada' then
    raise exception 'Esta pesquisa está pausada no momento. Tente de novo mais tarde.';
  end if;
  if v_pesquisa.status <> 'aberta' then
    raise exception 'Esta pesquisa já foi encerrada.';
  end if;

  if v_pesquisa.pede_identificacao then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
      raise exception 'Informe um e-mail válido.';
    end if;
    if length(v_nome) < 3 or length(v_nome) > 200 or position(' ' in v_nome) = 0 then
      raise exception 'Informe o nome completo.';
    end if;
    if length(v_empresa) < 2 or length(v_empresa) > 200 then
      raise exception 'Informe a empresa.';
    end if;
  end if;

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  begin
    insert into public.pesquisa_respostas (pesquisa_id, respondente_email, respondente_nome, respondente_empresa, itens, segmento)
    values (
      v_pesquisa.id,
      case when v_pesquisa.pede_identificacao then v_email end,
      case when v_pesquisa.pede_identificacao then v_nome end,
      case when v_pesquisa.pede_identificacao then v_empresa end,
      v_itens,
      case when v_pesquisa.pede_identificacao then jsonb_build_object('cliente', v_empresa) else '{}'::jsonb end
    );
  exception when unique_violation then
    raise exception 'Este e-mail já respondeu esta pesquisa.';
  end;
end;
$$;

-- ── Lista de participantes: link individual, sem login ───────────────────────

create or replace function public.pesquisa_convite_obter(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'titulo', p.titulo,
    'descricao', p.descricao,
    'status', p.status,
    'empresa', c.company_name,
    'nome', split_part(trim(pt.nome), ' ', 1),
    'ja_respondeu', pt.respondeu_em is not null,
    'no_publico', public.pesquisa_no_filtro(p.filtro, pt.setor, pt.cargo, pt.cliente),
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'tipo', q.tipo, 'enunciado', q.enunciado,
        'opcoes', q.opcoes, 'obrigatoria', q.obrigatoria
      ) order by q.ordem)
      from public.pesquisa_perguntas q where q.pesquisa_id = p.id
    ), '[]'::jsonb)
  )
  from public.pesquisa_participantes pt
  join public.pesquisas p on p.id = pt.pesquisa_id
  join public.clients c on c.id = p.client_id
  where pt.token = p_token
    and p.publico = 'lista'
    and p.status <> 'rascunho';
$$;

create or replace function public.pesquisa_convite_responder(p_token text, p_respostas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_part public.pesquisa_participantes;
  v_pesquisa public.pesquisas;
  v_itens jsonb;
begin
  select * into v_part from public.pesquisa_participantes where token = p_token for update;
  if not found then
    raise exception 'Convite não encontrado.';
  end if;
  select * into v_pesquisa from public.pesquisas where id = v_part.pesquisa_id and publico = 'lista';
  if not found or v_pesquisa.status = 'rascunho' then
    raise exception 'Convite não encontrado.';
  end if;
  if v_pesquisa.status = 'pausada' then
    raise exception 'Esta pesquisa está pausada no momento. Tente de novo mais tarde.';
  end if;
  if v_pesquisa.status <> 'aberta' then
    raise exception 'Esta pesquisa já foi encerrada.';
  end if;
  if not public.pesquisa_no_filtro(v_pesquisa.filtro, v_part.setor, v_part.cargo, v_part.cliente) then
    raise exception 'Este convite não faz parte do público desta pesquisa.';
  end if;
  if v_part.respondeu_em is not null then
    raise exception 'Você já respondeu esta pesquisa. Obrigado!';
  end if;

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  insert into public.pesquisa_respostas (pesquisa_id, itens, segmento)
  values (v_pesquisa.id, v_itens, jsonb_strip_nulls(jsonb_build_object(
    'setor', nullif(trim(v_part.setor), ''), 'cargo', nullif(trim(v_part.cargo), ''),
    'tempo_empresa', nullif(trim(v_part.tempo_empresa), ''), 'estado', nullif(trim(v_part.estado), ''),
    'cliente', nullif(trim(v_part.cliente), '')
  )));

  update public.pesquisa_participantes set respondeu_em = current_date where id = v_part.id;
end;
$$;

-- ── Permissões das funções ───────────────────────────────────────────────────

revoke all on function public.pesquisa_no_filtro(jsonb, text, text, text) from public, anon;
grant execute on function public.pesquisa_no_filtro(jsonb, text, text, text) to authenticated;
revoke all on function public.pesquisa_faixa_tempo(date) from public, anon;
grant execute on function public.pesquisa_faixa_tempo(date) to authenticated;

revoke all on function public.pesquisa_interna_responder(uuid, jsonb) from public, anon;
grant execute on function public.pesquisa_interna_responder(uuid, jsonb) to authenticated;

revoke all on function public.pesquisa_publica_obter(text) from public;
grant execute on function public.pesquisa_publica_obter(text) to anon, authenticated;
revoke all on function public.pesquisa_publica_responder(text, text, text, text, jsonb) from public;
grant execute on function public.pesquisa_publica_responder(text, text, text, text, jsonb) to anon, authenticated;

revoke all on function public.pesquisa_convite_obter(text) from public;
grant execute on function public.pesquisa_convite_obter(text) to anon, authenticated;
revoke all on function public.pesquisa_convite_responder(text, jsonb) from public;
grant execute on function public.pesquisa_convite_responder(text, jsonb) to anon, authenticated;

-- Conferência:
-- select column_name from information_schema.columns where table_name = 'pesquisas' order by ordinal_position;
-- select policyname, cmd from pg_policies where tablename = 'pesquisa_participantes';
-- select grantee, privilege_type, column_name from information_schema.column_privileges
--  where table_name = 'pesquisa_participantes' and grantee in ('anon', 'authenticated');

-- DESFAZER (só se nenhuma pesquisa usar 'lista'):
-- drop function public.pesquisa_convite_responder(text, jsonb);
-- drop function public.pesquisa_convite_obter(text);
-- drop table public.pesquisa_participantes;
-- alter table public.pesquisa_respostas drop column segmento;
-- alter table public.pesquisas drop column filtro, drop column pede_identificacao, drop column repetir_meses,
--   drop column origem_id, drop column convite_assunto, drop column convite_mensagem;
-- alter table public.pesquisas drop constraint pesquisas_publico_check;
-- alter table public.pesquisas add constraint pesquisas_publico_check check (publico in ('interna', 'externa'));
-- (as funções interna/publica anteriores estão em PENDENTE_20261005000000 e PENDENTE_20261023010000)
-- drop function public.pesquisa_no_filtro(jsonb, text, text, text); drop function public.pesquisa_faixa_tempo(date);
