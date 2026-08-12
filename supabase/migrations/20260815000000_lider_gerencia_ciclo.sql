-- Líder (funcionarios.lider_avaliacao = true) já podia CRIAR ciclo de
-- avaliação (migration 20260813) e usar Avaliação de Pares (20260814), mas
-- não conseguia ativar/encerrar o ciclo nem selecionar quem entra nele
-- (montagem de participantes = inserir em avaliacoes): a policy de UPDATE de
-- ciclos_avaliacao e a função e_admin_do_ciclo() só reconheciam
-- permission_level = 'administrador', então a RLS barrava essas ações mesmo
-- com o botão liberado no front para o líder.
--
-- Esta migration estende as duas coisas para também aceitar líder.
--
-- e_admin_do_ciclo é usada por avaliacoes_select/insert/update/delete e,
-- via pode_acessar_avaliacao, pelas tabelas avaliacoes_cultural/tecnica/pdi
-- — então o líder passa a poder criar, ver, editar e excluir avaliações dos
-- ciclos da própria empresa, igual administrador. Isso é intencional: é o
-- "mesmo poder para gerenciar ciclos" pedido para quem é líder, sem virar
-- administrador da empresa (permission_level continua o que era).
--
-- Excluir/editar o CICLO em si (ciclos_avaliacao_delete) continua exclusivo
-- de administrador — não foi pedido para líder e é a ação mais destrutiva
-- (apaga o ciclo e todas as avaliações dele em cascata).

create or replace function public.e_admin_do_ciclo(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ciclos_avaliacao ca
    join public.user_company_roles ucr on ucr.client_id = ca.client_id
    where ca.id = p_ciclo_id
      and ucr.user_id = auth.uid()
      and (
        ucr.permission_level = 'administrador'
        or public.e_lider_da_empresa(ca.client_id)
      )
  );
$$;

drop policy if exists "ciclos_avaliacao_update" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_update" on public.ciclos_avaliacao
  for update using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
    or public.e_lider_da_empresa(ciclos_avaliacao.client_id)
  );
