-- Pedido (09/09/2026): nova aba "Cargos" (antes de "Avaliação" no menu) —
-- consulta somente-leitura do catálogo de perfis de cargo (cargos_perfil,
-- já importado da planilha "Cargos Concretize.xlsx" em 01/09/2026 pra
-- alimentar o cruzamento cargo x Eneagrama do Autoconhecimento). Confirmado
-- com o usuário (AskUserQuestion): só CTZ, e só quem já tem acesso a coisa
-- sensível hoje — administrador de verdade da empresa OU o piloto do
-- Autoconhecimento (Igor/Priscila) — não abre pra todo mundo da CTZ.
--
-- A policy original (migration PENDENTE_20260901000000) só liberava
-- pode_ver_todos_eneagrama_ctz() (lista fixa Igor/Priscila) — qualquer outro
-- administrador real da CTZ (ex.: Filippe Réus) ficaria com a aba visível no
-- menu mas a query voltando vazia. Soma o OR de administrador de verdade,
-- escopado por client_id (mesmo padrão de 20260820000000_ciclo_avaliacao_
-- admin_only) — não é preciso nova função, é só mais uma condição na policy
-- já existente.
drop policy if exists "cargos_perfil_select_admin_piloto" on public.cargos_perfil;
create policy "cargos_perfil_select_admin_piloto" on public.cargos_perfil
  for select using (
    public.pode_ver_todos_eneagrama_ctz()
    or exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = cargos_perfil.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );
