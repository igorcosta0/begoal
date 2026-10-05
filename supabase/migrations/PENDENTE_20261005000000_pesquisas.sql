-- Módulo de Pesquisa (pedido 05/10/2026, CTZ): pesquisa de satisfação interna
-- (funcionários logados) ou externa (clientes, por um link público).
--
-- Decisões confirmadas com o Igor:
--   * Interna é ANÔNIMA: a resposta não guarda quem respondeu. Uma tabela
--     separada (pesquisa_participacoes) guarda só "fulano já respondeu" (pra
--     cobrar quem falta e impedir resposta dupla), sem ligação com a resposta.
--     As duas guardam só a DATA (sem hora), pra não dar pra casar uma com a
--     outra pelo horário.
--   * Externa: UM link por pesquisa (token aleatório). Quem abre informa
--     e-mail, nome completo e empresa antes de responder. Uma resposta por
--     e-mail.
--   * Só administrador da empresa cria, publica, encerra e vê resultados.
--   * Tipos de pergunta: nota 1 a 5, NPS (0 a 10), múltipla escolha, texto.
--
-- Quem responde de fora não tem login: tudo passa por funções SECURITY
-- DEFINER chamáveis com a chave anon, que só aceitam o token da pesquisa e
-- validam cada resposta. As tabelas em si continuam fechadas pro anon (RLS).
--
-- Rode este script inteiro no SQL Editor do Supabase ANTES do push do front.

-- ── Tabelas ──────────────────────────────────────────────────────────────────

create table if not exists public.pesquisas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  publico text not null check (publico in ('interna', 'externa')),
  status text not null default 'rascunho' check (status in ('rascunho', 'aberta', 'encerrada')),
  -- Token do link externo. 128 bits aleatórios (2 UUIDs v4 sem traço).
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  publicada_em timestamptz,
  encerrada_em timestamptz
);
create index if not exists pesquisas_client_id_idx on public.pesquisas (client_id);

create table if not exists public.pesquisa_perguntas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  ordem int not null default 0,
  tipo text not null check (tipo in ('nota_1_5', 'nps', 'multipla', 'texto')),
  enunciado text not null check (length(trim(enunciado)) > 0),
  opcoes jsonb not null default '[]'::jsonb,   -- só múltipla escolha: ["Ótimo", "Bom", ...]
  obrigatoria boolean not null default true
);
create index if not exists pesquisa_perguntas_pesquisa_idx on public.pesquisa_perguntas (pesquisa_id, ordem);

create table if not exists public.pesquisa_respostas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  respondida_em date not null default current_date,
  -- Só na externa. Na interna ficam nulos (anônima).
  respondente_email text,
  respondente_nome text,
  respondente_empresa text,
  -- { "<pergunta_id>": 4 | "texto" | "opção" }
  itens jsonb not null default '{}'::jsonb
);
create index if not exists pesquisa_respostas_pesquisa_idx on public.pesquisa_respostas (pesquisa_id);
create unique index if not exists pesquisa_respostas_email_unico
  on public.pesquisa_respostas (pesquisa_id, lower(respondente_email))
  where respondente_email is not null;

create table if not exists public.pesquisa_participacoes (
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  respondida_em date not null default current_date,
  primary key (pesquisa_id, user_id)
);

-- ── Helper ───────────────────────────────────────────────────────────────────

create or replace function public.pesquisa_sou_admin(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_company_roles ucr
    where ucr.client_id = p_client_id
      and ucr.user_id = auth.uid()
      and ucr.permission_level = 'administrador'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.pesquisas enable row level security;
alter table public.pesquisa_perguntas enable row level security;
alter table public.pesquisa_respostas enable row level security;
alter table public.pesquisa_participacoes enable row level security;

-- pesquisas: admin vê tudo da empresa; os demais membros só as internas já
-- publicadas (pra responder). Escrita só admin.
drop policy if exists "pesquisas_select" on public.pesquisas;
create policy "pesquisas_select" on public.pesquisas
  for select using (
    public.pesquisa_sou_admin(client_id)
    or (
      publico = 'interna' and status <> 'rascunho'
      and exists (select 1 from public.user_company_roles ucr
                  where ucr.client_id = pesquisas.client_id and ucr.user_id = auth.uid())
    )
  );

drop policy if exists "pesquisas_admin_insert" on public.pesquisas;
create policy "pesquisas_admin_insert" on public.pesquisas
  for insert with check (public.pesquisa_sou_admin(client_id));

drop policy if exists "pesquisas_admin_update" on public.pesquisas;
create policy "pesquisas_admin_update" on public.pesquisas
  for update using (public.pesquisa_sou_admin(client_id))
  with check (public.pesquisa_sou_admin(client_id));

drop policy if exists "pesquisas_admin_delete" on public.pesquisas;
create policy "pesquisas_admin_delete" on public.pesquisas
  for delete using (public.pesquisa_sou_admin(client_id));

-- perguntas: leitura acompanha a pesquisa; escrita só admin e só enquanto a
-- pesquisa está em rascunho (mudar pergunta com resposta já dada estraga o
-- resultado).
drop policy if exists "pesquisa_perguntas_select" on public.pesquisa_perguntas;
create policy "pesquisa_perguntas_select" on public.pesquisa_perguntas
  for select using (
    exists (select 1 from public.pesquisas p where p.id = pesquisa_perguntas.pesquisa_id)
  );

drop policy if exists "pesquisa_perguntas_admin_write" on public.pesquisa_perguntas;
create policy "pesquisa_perguntas_admin_write" on public.pesquisa_perguntas
  for all using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_perguntas.pesquisa_id
              and p.status = 'rascunho'
              and public.pesquisa_sou_admin(p.client_id))
  ) with check (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_perguntas.pesquisa_id
              and p.status = 'rascunho'
              and public.pesquisa_sou_admin(p.client_id))
  );

-- respostas: só admin lê. Ninguém grava direto (só pelas funções abaixo).
drop policy if exists "pesquisa_respostas_admin_select" on public.pesquisa_respostas;
create policy "pesquisa_respostas_admin_select" on public.pesquisa_respostas
  for select using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_respostas.pesquisa_id
              and public.pesquisa_sou_admin(p.client_id))
  );

-- participações: admin vê quem já respondeu; cada um vê a própria.
drop policy if exists "pesquisa_participacoes_select" on public.pesquisa_participacoes;
create policy "pesquisa_participacoes_select" on public.pesquisa_participacoes
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.pesquisas p
               where p.id = pesquisa_participacoes.pesquisa_id
                 and public.pesquisa_sou_admin(p.client_id))
  );

-- ── Validação das respostas ──────────────────────────────────────────────────
-- Confere cada pergunta da pesquisa e devolve só os itens válidos. Erro com
-- mensagem legível (vai direto pra tela) quando algo não bate.

create or replace function public.pesquisa_validar_respostas(p_pesquisa_id uuid, p_respostas jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q record;
  v jsonb;
  n numeric;
  t text;
  resultado jsonb := '{}'::jsonb;
begin
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas.';
  end if;

  for q in
    select * from public.pesquisa_perguntas where pesquisa_id = p_pesquisa_id order by ordem
  loop
    v := p_respostas -> q.id::text;

    if v is null or jsonb_typeof(v) = 'null'
       or (jsonb_typeof(v) = 'string' and length(trim(v #>> '{}')) = 0) then
      if q.obrigatoria then
        raise exception 'Responda a pergunta: %', q.enunciado;
      end if;
      continue;
    end if;

    if q.tipo in ('nota_1_5', 'nps') then
      if jsonb_typeof(v) <> 'number' then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      n := (v #>> '{}')::numeric;
      if n <> trunc(n)
         or (q.tipo = 'nota_1_5' and (n < 1 or n > 5))
         or (q.tipo = 'nps' and (n < 0 or n > 10)) then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, n::int);
    elsif q.tipo = 'multipla' then
      t := v #>> '{}';
      if jsonb_typeof(v) <> 'string' or not (q.opcoes ? t) then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, t);
    else
      t := trim(v #>> '{}');
      if jsonb_typeof(v) <> 'string' or length(t) > 2000 then
        raise exception 'Resposta muito longa na pergunta: % (máximo 2000 caracteres)', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, t);
    end if;
  end loop;

  return resultado;
end;
$$;

-- ── Pesquisa externa (sem login) ─────────────────────────────────────────────

-- Dados pra montar a página pública. Null quando o token não existe, a
-- pesquisa é interna ou ainda está em rascunho.
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

create or replace function public.pesquisa_publica_ja_respondeu(p_token text, p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pesquisa_respostas r
    join public.pesquisas p on p.id = r.pesquisa_id
    where p.token = p_token and p.publico = 'externa'
      and lower(r.respondente_email) = lower(trim(p_email))
  );
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
  if v_pesquisa.status <> 'aberta' then
    raise exception 'Esta pesquisa já foi encerrada.';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if length(v_nome) < 3 or length(v_nome) > 200 or position(' ' in v_nome) = 0 then
    raise exception 'Informe o nome completo.';
  end if;
  if length(v_empresa) < 2 or length(v_empresa) > 200 then
    raise exception 'Informe a empresa.';
  end if;

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  begin
    insert into public.pesquisa_respostas (pesquisa_id, respondente_email, respondente_nome, respondente_empresa, itens)
    values (v_pesquisa.id, v_email, v_nome, v_empresa, v_itens);
  exception when unique_violation then
    raise exception 'Este e-mail já respondeu esta pesquisa.';
  end;
end;
$$;

-- ── Pesquisa interna (logado, anônima) ───────────────────────────────────────

create or replace function public.pesquisa_interna_responder(p_pesquisa_id uuid, p_respostas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pesquisa public.pesquisas;
  v_itens jsonb;
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

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  begin
    insert into public.pesquisa_participacoes (pesquisa_id, user_id) values (v_pesquisa.id, auth.uid());
  exception when unique_violation then
    raise exception 'Você já respondeu esta pesquisa.';
  end;

  insert into public.pesquisa_respostas (pesquisa_id, itens) values (v_pesquisa.id, v_itens);
end;
$$;

-- ── Permissões das funções ───────────────────────────────────────────────────

revoke all on function public.pesquisa_sou_admin(uuid) from public, anon;
revoke all on function public.pesquisa_validar_respostas(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.pesquisa_interna_responder(uuid, jsonb) from public, anon;
revoke all on function public.pesquisa_publica_obter(text) from public;
revoke all on function public.pesquisa_publica_ja_respondeu(text, text) from public;
revoke all on function public.pesquisa_publica_responder(text, text, text, text, jsonb) from public;

grant execute on function public.pesquisa_sou_admin(uuid) to authenticated;
grant execute on function public.pesquisa_interna_responder(uuid, jsonb) to authenticated;
grant execute on function public.pesquisa_publica_obter(text) to anon, authenticated;
grant execute on function public.pesquisa_publica_ja_respondeu(text, text) to anon, authenticated;
grant execute on function public.pesquisa_publica_responder(text, text, text, text, jsonb) to anon, authenticated;

-- Conferência:
-- select tablename, cmd, policyname from pg_policies where tablename like 'pesquisa%' order by 1, 2;
-- select proname from pg_proc where proname like 'pesquisa%';
