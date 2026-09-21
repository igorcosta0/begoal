-- Pedido (21/09/2026): a aba "Cargos" era somente-leitura (catálogo importado
-- da planilha em 01/09/2026) — agora ganha CRUD (editar, adicionar, excluir)
-- direto na tela. cargos_perfil só tinha policy de SELECT até aqui
-- (PENDENTE_20260901000000/PENDENTE_20260909010000); esta migration soma
-- INSERT/UPDATE/DELETE com o MESMO grupo de acesso já usado pra leitura —
-- administrador de verdade da empresa (escopado por client_id) OU o piloto
-- do Autoconhecimento (pode_ver_todos_eneagrama_ctz, hoje Igor/Priscila/
-- Letícia/Eduardo Rigotto) — não abre escrita pra ninguém que já não pudesse
-- ver a tela inteira.

drop policy if exists "cargos_perfil_insert_admin_piloto" on public.cargos_perfil;
create policy "cargos_perfil_insert_admin_piloto" on public.cargos_perfil
  for insert
  with check (
    public.pode_ver_todos_eneagrama_ctz()
    or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

drop policy if exists "cargos_perfil_update_admin_piloto" on public.cargos_perfil;
create policy "cargos_perfil_update_admin_piloto" on public.cargos_perfil
  for update
  using (
    public.pode_ver_todos_eneagrama_ctz()
    or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

drop policy if exists "cargos_perfil_delete_admin_piloto" on public.cargos_perfil;
create policy "cargos_perfil_delete_admin_piloto" on public.cargos_perfil
  for delete
  using (
    public.pode_ver_todos_eneagrama_ctz()
    or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );
