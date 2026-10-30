-- Pedido do Igor (30/10/2026), depois do retorno da Priscila sobre o Célio:
--
-- 1) Líder (permission_level 'gestor') também usa Cargos: lê, cria, edita e
--    exclui em cargos_perfil, como administrador e piloto. O vínculo
--    pessoa↔cargo com a análise do Eneagrama (funcionarios_cargo_perfil) NÃO
--    muda: continua só do piloto.
-- 2) Líder da CTZ também cadastra e edita funcionários (INSERT/UPDATE).
--    Excluir continua só de administrador. Atenção: editar inclui o gestor_id,
--    que define quem avalia quem na Avaliação.
-- 3) Jean Patrick Candia Correa (Líder de Marketing e IA) com o mesmo acesso
--    dos outros líderes: 'gestor' + is_calibrador + calibrador restrito
--    (estava como 'visualizador').
--
-- Para desfazer: drop das duas policies "..._lider_ctz" de funcionarios,
-- rodar de novo as policies de PENDENTE_20260921030000_cargos_perfil_escrita.sql
-- e PENDENTE_20260909010000_cargos_perfil_acesso_admin.sql, voltar o Jean para
-- 'visualizador'/false e a e_calibrador_restrito para a versão de
-- PENDENTE_20261030000000_celio_acesso_de_lider_e_mapa_sem_desligados.sql.
--
-- Pode rodar de novo.

-- 1) cargos_perfil
drop policy if exists cargos_perfil_select_admin_piloto on public.cargos_perfil;
create policy cargos_perfil_select_admin_piloto on public.cargos_perfil
  for select using (
    public.pode_ver_todos_eneagrama_ctz() or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

drop policy if exists cargos_perfil_insert_admin_piloto on public.cargos_perfil;
create policy cargos_perfil_insert_admin_piloto on public.cargos_perfil
  for insert with check (
    public.pode_ver_todos_eneagrama_ctz() or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

drop policy if exists cargos_perfil_update_admin_piloto on public.cargos_perfil;
create policy cargos_perfil_update_admin_piloto on public.cargos_perfil
  for update using (
    public.pode_ver_todos_eneagrama_ctz() or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

drop policy if exists cargos_perfil_delete_admin_piloto on public.cargos_perfil;
create policy cargos_perfil_delete_admin_piloto on public.cargos_perfil
  for delete using (
    public.pode_ver_todos_eneagrama_ctz() or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );

-- 2) funcionarios: líder da CTZ cadastra e edita (soma à "Unified Write Policy").
drop policy if exists funcionarios_insert_lider_ctz on public.funcionarios;
create policy funcionarios_insert_lider_ctz on public.funcionarios
  for insert with check (
    client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = funcionarios.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level = 'gestor'
    )
  );

drop policy if exists funcionarios_update_lider_ctz on public.funcionarios;
create policy funcionarios_update_lider_ctz on public.funcionarios
  for update
  using (
    client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = funcionarios.client_id and ucr.user_id = auth.uid()
        and ucr.permission_level = 'gestor'
    )
  )
  with check (client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06');

-- 3) Jean Patrick
update public.user_company_roles
set permission_level = 'gestor', is_calibrador = true
where user_id = '11d990f4-e8c5-4a5c-95f1-c6fc8b1f7a95' -- Jean Patrick Candia Correa
  and client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06';

create or replace function public.e_calibrador_restrito(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    auth.uid() in (
      '203e4429-b9c7-451f-bc00-cc42f6e713f4', -- Graciela Borges Hoepers
      '05d3db6c-ef45-40af-9748-2f02b6f1efc4', -- Felipe Marques Santos
      '9c6dfb0a-c7d5-4a6a-8214-a6f22aea74e8', -- Felipe Bet Ross
      '09f58ad9-89dc-444e-8448-88554d90f26e', -- Filipe Bossoni Finato
      '4e4e267f-769d-47d9-9e35-f2d44de2933a', -- Célio Bitencourt
      '11d990f4-e8c5-4a5c-95f1-c6fc8b1f7a95'  -- Jean Patrick Candia Correa
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;

-- Conferência: 4 policies em cargos_perfil com 'gestor', 2 novas em
-- funcionarios e o Jean como gestor + calibrador.
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and policyname in (
  'cargos_perfil_select_admin_piloto', 'cargos_perfil_insert_admin_piloto',
  'cargos_perfil_update_admin_piloto', 'cargos_perfil_delete_admin_piloto',
  'funcionarios_insert_lider_ctz', 'funcionarios_update_lider_ctz')
union all
select 'jean', permission_level::text, is_calibrador::text from public.user_company_roles
where user_id = '11d990f4-e8c5-4a5c-95f1-c6fc8b1f7a95'
  and client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06';
