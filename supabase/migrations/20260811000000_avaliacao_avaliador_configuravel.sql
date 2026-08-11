-- Deixa "quem avalia quem" configurável por avaliação, em vez de sempre derivado
-- de funcionarios.gestor_id (organograma fixo).
--
-- A coluna avaliacoes.avaliador_id já existia desde a primeira migration do módulo,
-- mas nunca era usada — a única forma de acesso "de gestor" era via
-- e_gestor_do_funcionario (compara com o gestor_id atual no cadastro). Esta
-- migration soma a ela um novo caminho: se avaliacoes.avaliador_id apontar pra um
-- funcionário específico, a pessoa logada com esse funcionário também ganha acesso
-- — mesmo que não seja o gestor "oficial" no organograma.
--
-- Compatível com o que já existe: quando avaliador_id fica null (como em toda
-- avaliação criada antes desta migration), o acesso continua caindo no fallback
-- de e_gestor_do_funcionario, então nada quebra.

create or replace function public.e_o_avaliador(p_avaliador_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.funcionarios f
    where f.id = p_avaliador_id
      and f.user_id = auth.uid()
  );
$$;

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
        or public.e_o_avaliador(a.avaliador_id)
      )
  );
$$;

drop policy if exists "avaliacoes_select" on public.avaliacoes;
create policy "avaliacoes_select" on public.avaliacoes
  for select using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_o_avaliador(avaliador_id)
  );

drop policy if exists "avaliacoes_update" on public.avaliacoes;
create policy "avaliacoes_update" on public.avaliacoes
  for update using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_o_avaliador(avaliador_id)
  );

-- avaliacoes_cultural / avaliacoes_tecnica / avaliacoes_pdi reusam
-- pode_acessar_avaliacao(), então herdam a mudança automaticamente.
