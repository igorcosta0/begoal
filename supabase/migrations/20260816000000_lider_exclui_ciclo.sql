-- Estende pro líder também a exclusão de ciclo de avaliação (ex.: apagar um
-- rascunho criado errado pra poder criar outro no lugar — só 1 ciclo em
-- aberto por empresa por vez, então sem excluir ele fica travado esperando
-- um administrador).
--
-- avaliacoes_delete já cobria o líder desde a migration 20260815 (usa
-- e_admin_do_ciclo, que já aceita líder) — então o cascade de avaliacoes ao
-- excluir o ciclo não é o problema. Faltava só a policy de DELETE da própria
-- tabela ciclos_avaliacao, que ainda checava só permission_level = 'administrador'.
--
-- Excluir avaliação AVULSA (o "X" numa avaliação já criada, sem excluir o
-- ciclo inteiro) continua reservado a administrador no front-end — não foi
-- pedido pro líder e essa migration não mexe nisso.

drop policy if exists "ciclos_avaliacao_delete" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
    or public.e_lider_da_empresa(ciclos_avaliacao.client_id)
  );
