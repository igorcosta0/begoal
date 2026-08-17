-- Pedido (ago/2026): deixar líder criar e configurar ciclo de avaliação não
-- funcionou na prática — agora só administrador pode criar, ativar, encerrar,
-- excluir ciclo e montar avaliações "padrão" (escolher participante,
-- avaliador, vertical). Avaliação de Pares (sorteio entre líderes) fica de
-- fora dessa mudança por enquanto — líder continua usando normalmente.
--
-- Reverte a parte de ciclos_avaliacao das migrations 20260813/815/816
-- (e_lider_da_empresa como alternativa a administrador) e restringe a
-- cláusula de líder em avaliacoes_insert pra só valer quando tipo = 'pares'.

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert with check (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

drop policy if exists "ciclos_avaliacao_update" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_update" on public.ciclos_avaliacao
  for update using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

drop policy if exists "ciclos_avaliacao_delete" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
  );

-- avaliacoes_insert: líder só continua inserindo direto quando for avaliação
-- de pares (tipo = 'pares') — a montagem "padrão" (participante + avaliador +
-- vertical) agora só passa por e_admin_do_ciclo (administrador) ou
-- e_gestor_do_funcionario (gestor direto no organograma, já existia e não foi
-- pedido pra mudar).
drop policy if exists "avaliacoes_insert" on public.avaliacoes;
create policy "avaliacoes_insert" on public.avaliacoes
  for insert with check (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or (
      tipo = 'pares'
      and exists (
        select 1 from public.ciclos_avaliacao ca
        where ca.id = avaliacoes.ciclo_id
          and public.e_lider_da_empresa(ca.client_id)
      )
    )
  );

-- ── "Só 1 ciclo aberto por vez" deixa de ser um índice único rígido
-- (ciclos_avaliacao_aberto_unico, migration 20260813) e vira um trigger, pra
-- abrir uma exceção pontual: a conta do Igor Costa (administrador) pode ter
-- mais de um ciclo em aberto ao mesmo tempo, pra não precisar excluir o
-- ciclo que a líder já tinha criado antes dessa mudança pra admin-only.
-- Qualquer outro administrador continua limitado a 1 ciclo aberto (rascunho
-- ou ativo) por empresa.

drop index if exists public.ciclos_avaliacao_aberto_unico;

create or replace function public.checar_ciclo_unico_aberto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'encerrado' and exists (
    select 1 from public.ciclos_avaliacao
    where client_id = new.client_id
      and status <> 'encerrado'
  ) then
    if auth.email() is distinct from 'igorecosta1@gmail.com' then
      raise exception 'Já existe um ciclo em aberto (rascunho ou ativo) para esta empresa. Encerre-o antes de criar outro.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ciclos_avaliacao_checar_unico_aberto on public.ciclos_avaliacao;
create trigger ciclos_avaliacao_checar_unico_aberto
  before insert on public.ciclos_avaliacao
  for each row execute function public.checar_ciclo_unico_aberto();
