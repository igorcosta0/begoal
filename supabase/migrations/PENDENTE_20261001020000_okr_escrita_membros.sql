-- Gestor (ex.: Guilherme) não conseguia editar lançamento de KR nem gravar
-- metas mensais (relato de 01/10/2026). As policies estavam inconsistentes:
-- qualquer membro da empresa já podia criar/editar KR e objetivo e criar/
-- apagar lançamento, mas UPDATE de lançamento e escrita de metas mensais só
-- passavam pela policy de administrador/editor. O UPDATE bloqueado devolvia
-- 0 linhas sem erro, então a tela parecia salvar e nada mudava.
--
-- Abre as duas operações pro mesmo grupo que já cria/apaga lançamentos
-- (qualquer membro da empresa dona do KR). As policies de admin continuam.

drop policy if exists "Usuários autenticados podem atualizar lançamentos" on public.kr_lancamentos;
create policy "Usuários autenticados podem atualizar lançamentos" on public.kr_lancamentos
  for update
  using (kr_id in (
    select krs.id from public.krs
    where krs.client_id in (select ucr.client_id from public.user_company_roles ucr where ucr.user_id = auth.uid())
  ))
  with check (kr_id in (
    select krs.id from public.krs
    where krs.client_id in (select ucr.client_id from public.user_company_roles ucr where ucr.user_id = auth.uid())
  ));

drop policy if exists "Membros podem gravar metas mensais" on public.kr_metas_mensais;
create policy "Membros podem gravar metas mensais" on public.kr_metas_mensais
  for all
  using (kr_id in (
    select krs.id from public.krs
    where krs.client_id in (select ucr.client_id from public.user_company_roles ucr where ucr.user_id = auth.uid())
  ))
  with check (kr_id in (
    select krs.id from public.krs
    where krs.client_id in (select ucr.client_id from public.user_company_roles ucr where ucr.user_id = auth.uid())
  ));

-- Conferência:
-- select tablename, cmd, policyname from pg_policies
-- where tablename in ('kr_lancamentos','kr_metas_mensais') order by 1, 2;
