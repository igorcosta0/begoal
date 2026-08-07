-- Libera para o gestor comum (permission_level = 'gestor'), além do administrador,
-- a criação de novos ciclos de avaliação. Ativar/encerrar/excluir ciclo continuam
-- restritos a administrador (ação de escopo empresa toda).

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert with check (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level in ('administrador', 'gestor')
    )
  );
