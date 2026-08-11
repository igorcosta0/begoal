-- Restringe a criação de ciclo de avaliação a administrador + líder (em vez de
-- administrador + qualquer "gestor comum"), e trava em 1 único ciclo em aberto
-- (rascunho ou ativo) por empresa por vez, pra não deixar criar vários e
-- confundir quem está avaliando em qual ciclo.
--
-- "Líder" não é uma coluna própria — é calculado igual ao resto do app: cargo
-- contém "líder" OU a pessoa tem pelo menos 1 liderado (funcionarios.gestor_id
-- apontando pra ela) dentro da mesma empresa.

create or replace function public.e_lider_da_empresa(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios eu
    where eu.user_id = auth.uid()
      and eu.client_id = p_client_id
      and (
        eu.cargo ilike '%líder%'
        or eu.cargo ilike '%lider%'
        or exists (
          select 1 from public.funcionarios liderado
          where liderado.gestor_id = eu.id
            and liderado.client_id = p_client_id
        )
      )
  );
$$;

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert with check (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
    or public.e_lider_da_empresa(ciclos_avaliacao.client_id)
  );

-- No máximo 1 ciclo não encerrado por empresa. Se isso falhar com erro de chave
-- duplicada, é sinal de que já existem 2+ ciclos em aberto hoje — encerre os
-- excedentes pelo app (botão "Encerrar" no ciclo) e rode a migration de novo.
create unique index if not exists ciclos_avaliacao_aberto_unico
  on public.ciclos_avaliacao (client_id)
  where status <> 'encerrado';
