-- Pedido (ago/2026): quem vai ser avaliado só deve aparecer pra quem foi
-- escolhido como avaliador — mesmo líder tendo, hoje, acesso a tudo. Vamos
-- tirar esse "líder vê tudo" das AVALIAÇÕES agora e focar no processo em si;
-- o acompanhamento/visão geral do líder sobre o ciclo fica pra uma etapa
-- futura, feito de propósito e com RLS própria quando chegar a hora.
--
-- A migration 20260815 (lider_gerencia_ciclo) tinha ampliado
-- e_admin_do_ciclo() pra também aceitar líder — isso vazava visibilidade de
-- TODAS as avaliações da empresa (select/update/delete + cultural/tecnica/pdi
-- via pode_acessar_avaliacao) pra qualquer líder, não só as que ele monta ou
-- avalia. Esta migration desfaz só essa parte: e_admin_do_ciclo volta a ser
-- exclusiva de administrador.
--
-- O que NÃO muda (fica igual ao que já foi pedido antes):
--   - criar / ativar / encerrar / excluir o CICLO em si continua liberado pra
--     líder — essas policies (ciclos_avaliacao_insert/update/delete) chamam
--     e_lider_da_empresa() diretamente, não passam por e_admin_do_ciclo();
--   - montar o ciclo (selecionar QUALQUER participante da empresa, não só os
--     próprios liderados) continua liberado pro líder — é por isso que
--     avaliacoes_insert ganha uma cláusula própria de líder aqui embaixo, em
--     vez de simplesmente perder o acesso que tinha via e_admin_do_ciclo;
--   - "Preciso Avaliar" continua funcionando igual — usa
--     e_avaliador_designado() (migration 20260817), que é independente disso.
--
-- O que muda: um líder que NÃO é o avaliador designado, nem o avaliado, nem
-- o gestor no organograma daquela pessoa, deixa de conseguir ver/editar a
-- avaliação dela — só administrador continua enxergando o ciclo inteiro.

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
      and ucr.permission_level = 'administrador'
  );
$$;

-- Mantém pode_acessar_avaliacao() com a mesma assinatura, só reavaliando com
-- o e_admin_do_ciclo() já revertido acima (chamada indireta, nada a mudar
-- no corpo da função em si) — recriando aqui só pra documentar a intenção.
create or replace function public.pode_acessar_avaliacao(p_avaliacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.avaliacoes a
    where a.id = p_avaliacao_id
      and (
        public.e_admin_do_ciclo(a.ciclo_id)
        or public.e_avaliado(a.funcionario_id)
        or public.e_gestor_do_funcionario(a.funcionario_id)
        or public.e_avaliador_designado(a.avaliador_id)
      )
  );
$$;

-- avaliacoes_insert precisa continuar liberada pro líder montar o ciclo com
-- QUALQUER participante da empresa (não só os próprios liderados) — antes
-- isso vinha de graça via e_admin_do_ciclo ampliado; agora que essa função
-- voltou a ser só-admin, a cláusula de líder entra aqui direto.
drop policy if exists "avaliacoes_insert" on public.avaliacoes;
create policy "avaliacoes_insert" on public.avaliacoes
  for insert with check (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or exists (
      select 1 from public.ciclos_avaliacao ca
      where ca.id = avaliacoes.ciclo_id
        and public.e_lider_da_empresa(ca.client_id)
    )
  );

-- select/update voltam a NÃO ter mais a cláusula ampla de líder — só
-- e_admin_do_ciclo (agora admin-only), autoavaliação, gestor no organograma
-- ou avaliador designado (migration 20260817). Recriadas aqui só pra deixar
-- explícito o estado final; o corpo é o mesmo desde 20260817.
drop policy if exists "avaliacoes_select" on public.avaliacoes;
create policy "avaliacoes_select" on public.avaliacoes
  for select using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_avaliador_designado(avaliador_id)
  );

drop policy if exists "avaliacoes_update" on public.avaliacoes;
create policy "avaliacoes_update" on public.avaliacoes
  for update using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_avaliador_designado(avaliador_id)
  );

-- avaliacoes_delete fica só e_admin_do_ciclo (agora admin-only de novo) —
-- excluir avaliação avulsa nunca foi pedido pro líder, e o front-end já só
-- mostra esse botão pra administrador (avaliacao/page.tsx).
