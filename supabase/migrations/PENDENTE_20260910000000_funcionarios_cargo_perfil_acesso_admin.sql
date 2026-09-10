-- Pedido (10/09/2026): tela "Funcionários" (geral, todas as empresas) ganhou
-- a descrição do cargo (sumário de cargos_perfil) ao clicar no cargo exibido
-- embaixo do nome de cada funcionário — reaproveita o vínculo pessoa↔cargo
-- que já existe em funcionarios_cargo_perfil (curado à mão em 01/09/2026,
-- ver PENDENTE_20260901000000_cargos_perfil_eneagrama.sql) em vez de tentar
-- casar o texto livre de funcionarios.cargo com cargo_base na hora (a maioria
-- não bate: "Especialista em Agrimensura" vs "Especialista de Agrimensura",
-- "Analista de Administração e Finanças Júnior" com nível embutido no
-- string, etc. — confirmado por SQL direto que só 3 de 26 batem por texto
-- puro).
--
-- Mesmo problema resolvido em PENDENTE_20260909010000 pra cargos_perfil: a
-- policy original de funcionarios_cargo_perfil só liberava SELECT pro dono
-- da linha (user_id = auth.uid()) ou pode_ver_todos_eneagrama_ctz()
-- (Igor/Priscila) — qualquer outro administrador de verdade da CTZ via a
-- tela de Funcionários sem conseguir ler a descrição de cargo de ninguém
-- além de si mesmo. Soma o mesmo OR de administrador real escopado por
-- client_id, mantendo as duas policies antigas intactas (o Postgres já faz
-- OR entre policies permissivas da mesma ação).
drop policy if exists "funcionarios_cargo_perfil_select_admin_real" on public.funcionarios_cargo_perfil;
create policy "funcionarios_cargo_perfil_select_admin_real" on public.funcionarios_cargo_perfil
  for select using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = funcionarios_cargo_perfil.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );
