-- Pesquisa, etapa 5 do guia do Miro (23/10/2026, "M1 Usuários e Acesso"):
-- perfis do módulo de Pesquisa (valem SÓ aqui; o resto do sistema segue com
-- os níveis de user_company_roles).
--   F01 Master: tudo, inclusive dar e tirar qualquer perfil.
--   F02 Administrativo: cria, edita, publica, convida e vê resultados; gerencia
--       só Administrativo e Visualizador.
--   F03 Visualizador: só vê as pesquisas e os resultados.
--   F04 cadastro e gestão dos usuários do módulo (entre os membros da empresa).
--   F05 Administrativo não cria nem gerencia Master.
-- Quem é administrador da empresa (user_company_roles) é Master automático,
-- sem linha na tabela, e não muda por aqui. Os demais membros só respondem.
--
-- pesquisa_sou_admin passa a significar "pode gerir" (Master ou
-- Administrativo): todas as regras de escrita das migrations anteriores
-- continuam valendo sem mudança. As de LEITURA passam a aceitar também o
-- Visualizador (pesquisa_pode_ver).
--
-- ATENÇÃO: rodar junto do push do front desta etapa (muda regras de acesso).

-- ── Perfis ───────────────────────────────────────────────────────────────────

create table if not exists public.pesquisa_perfis (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  perfil text not null check (perfil in ('master', 'administrativo', 'visualizador')),
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (client_id, user_id)
);

alter table public.pesquisa_perfis enable row level security;
-- Ninguém lê nem grava direto: só pelas funções abaixo.
revoke all on public.pesquisa_perfis from anon, authenticated;

-- Perfil de uma pessoa na Pesquisa de uma empresa (null = só responde).
create or replace function public.pesquisa_perfil(p_client_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.user_company_roles ucr
                 where ucr.client_id = p_client_id and ucr.user_id = p_user_id and ucr.permission_level = 'administrador')
      then 'master'
    else (select pp.perfil from public.pesquisa_perfis pp
          where pp.client_id = p_client_id and pp.user_id = p_user_id
            and exists (select 1 from public.user_company_roles ucr
                        where ucr.client_id = p_client_id and ucr.user_id = p_user_id))
  end;
$$;

-- "Pode gerir" = Master ou Administrativo. Mantém o nome antigo, usado por
-- todas as regras de escrita.
create or replace function public.pesquisa_sou_admin(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.pesquisa_perfil(p_client_id, auth.uid()) in ('master', 'administrativo'), false);
$$;

create or replace function public.pesquisa_pode_ver(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pesquisa_perfil(p_client_id, auth.uid()) is not null;
$$;

create or replace function public.pesquisa_meu_perfil(p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.pesquisa_perfil(p_client_id, auth.uid());
$$;

-- Resultados (funções da etapa 4) passam a aceitar o Visualizador.
create or replace function public.pesquisa_exigir_admin(p_pesquisa_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select client_id into v_client from public.pesquisas where id = p_pesquisa_id;
  if v_client is null or not public.pesquisa_pode_ver(v_client) then
    raise exception 'Sem permissão para ver os resultados desta pesquisa.';
  end if;
end;
$$;

-- ── Leitura: Visualizador vê o que o administrador vê ────────────────────────

drop policy if exists "pesquisas_select" on public.pesquisas;
create policy "pesquisas_select" on public.pesquisas
  for select using (
    public.pesquisa_pode_ver(client_id)
    or (
      publico = 'interna' and status <> 'rascunho'
      and exists (select 1 from public.user_company_roles ucr
                  where ucr.client_id = pesquisas.client_id and ucr.user_id = auth.uid())
    )
  );

drop policy if exists "pesquisa_respostas_admin_select" on public.pesquisa_respostas;
create policy "pesquisa_respostas_admin_select" on public.pesquisa_respostas
  for select using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_respostas.pesquisa_id and public.pesquisa_pode_ver(p.client_id))
  );

drop policy if exists "pesquisa_participacoes_select" on public.pesquisa_participacoes;
create policy "pesquisa_participacoes_select" on public.pesquisa_participacoes
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.pesquisas p
               where p.id = pesquisa_participacoes.pesquisa_id and public.pesquisa_pode_ver(p.client_id))
  );

drop policy if exists "pesquisa_participantes_admin_select" on public.pesquisa_participantes;
create policy "pesquisa_participantes_admin_select" on public.pesquisa_participantes
  for select using (
    exists (select 1 from public.pesquisas p
            where p.id = pesquisa_participantes.pesquisa_id and public.pesquisa_pode_ver(p.client_id))
  );

-- ── F04: lista e gestão dos usuários do módulo ───────────────────────────────

-- Todos os membros da empresa, com o perfil na Pesquisa (null = só responde).
create or replace function public.pesquisa_listar_perfis(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pesquisa_pode_ver(p_client_id) then
    raise exception 'Sem permissão.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', m.user_id,
      'nome', m.nome,
      'email', m.email,
      'perfil', public.pesquisa_perfil(p_client_id, m.user_id),
      'automatico', m.admin_empresa
    ) order by m.nome)
    from (
      select distinct on (ucr.user_id)
        ucr.user_id,
        coalesce(nullif(trim(f.full_name), ''), nullif(trim(pr.full_name), ''), pr.email, 'Sem nome') as nome,
        coalesce(nullif(trim(f.email), ''), pr.email) as email,
        bool_or(ucr.permission_level = 'administrador') over (partition by ucr.user_id) as admin_empresa
      from public.user_company_roles ucr
      left join public.funcionarios f on f.client_id = ucr.client_id and f.user_id = ucr.user_id
      left join public.profiles pr on pr.id = ucr.user_id
      where ucr.client_id = p_client_id
      order by ucr.user_id, f.is_current desc nulls last
    ) m
  ), '[]'::jsonb);
end;
$$;

-- Dá, troca ou tira (p_perfil null) o perfil de alguém. Regras:
--   * só Master e Administrativo gerenciam;
--   * Administrativo não dá Master nem mexe em quem é Master (F05);
--   * administrador da empresa é Master automático e não muda por aqui;
--   * só membros da empresa.
create or replace function public.pesquisa_definir_perfil(p_client_id uuid, p_user_id uuid, p_perfil text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu text := public.pesquisa_perfil(p_client_id, auth.uid());
  v_dele text := public.pesquisa_perfil(p_client_id, p_user_id);
begin
  if v_meu is null or v_meu not in ('master', 'administrativo') then
    raise exception 'Só Master ou Administrativo gerenciam os usuários da Pesquisa.';
  end if;
  if p_perfil is not null and p_perfil not in ('master', 'administrativo', 'visualizador') then
    raise exception 'Perfil inválido.';
  end if;
  if not exists (select 1 from public.user_company_roles where client_id = p_client_id and user_id = p_user_id) then
    raise exception 'Esta pessoa não é membro da empresa.';
  end if;
  if exists (select 1 from public.user_company_roles where client_id = p_client_id and user_id = p_user_id and permission_level = 'administrador') then
    raise exception 'Administrador da empresa é Master automaticamente e não muda por aqui.';
  end if;
  if v_meu = 'administrativo' and (p_perfil = 'master' or v_dele = 'master') then
    raise exception 'O perfil Administrativo não cria nem gerencia Master.';
  end if;

  if p_perfil is null then
    delete from public.pesquisa_perfis where client_id = p_client_id and user_id = p_user_id;
  else
    insert into public.pesquisa_perfis (client_id, user_id, perfil, atualizado_por, atualizado_em)
    values (p_client_id, p_user_id, p_perfil, auth.uid(), now())
    on conflict (client_id, user_id) do update
      set perfil = excluded.perfil, atualizado_por = excluded.atualizado_por, atualizado_em = excluded.atualizado_em;
  end if;
end;
$$;

-- ── Permissões ───────────────────────────────────────────────────────────────

revoke all on function public.pesquisa_perfil(uuid, uuid) from public, anon, authenticated;
revoke all on function public.pesquisa_pode_ver(uuid) from public, anon;
revoke all on function public.pesquisa_meu_perfil(uuid) from public, anon;
revoke all on function public.pesquisa_listar_perfis(uuid) from public, anon;
revoke all on function public.pesquisa_definir_perfil(uuid, uuid, text) from public, anon;
grant execute on function public.pesquisa_pode_ver(uuid) to authenticated;
grant execute on function public.pesquisa_meu_perfil(uuid) to authenticated;
grant execute on function public.pesquisa_listar_perfis(uuid) to authenticated;
grant execute on function public.pesquisa_definir_perfil(uuid, uuid, text) to authenticated;

-- Conferência:
-- select policyname, cmd from pg_policies where tablename like 'pesquisa%' order by 1;

-- DESFAZER: recriar pesquisa_sou_admin, pesquisa_exigir_admin e as 4 policies de
-- leitura como em PENDENTE_20261005000000, PENDENTE_20261023020000 e
-- PENDENTE_20261023030000; depois:
-- drop function public.pesquisa_definir_perfil(uuid, uuid, text);
-- drop function public.pesquisa_listar_perfis(uuid);
-- drop function public.pesquisa_meu_perfil(uuid);
-- drop function public.pesquisa_pode_ver(uuid);
-- drop function public.pesquisa_perfil(uuid, uuid);
-- drop table public.pesquisa_perfis;
