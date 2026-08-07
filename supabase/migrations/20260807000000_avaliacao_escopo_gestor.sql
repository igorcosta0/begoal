-- Restringe o acesso de um GESTOR comum (permission_level = 'gestor') às avaliações
-- dos seus próprios liderados (funcionarios.gestor_id = ele mesmo).
--
-- Antes desta migration, a política de RLS só liberava acesso total a quem tinha
-- permission_level = 'administrador' (função e_admin_do_ciclo). Como o front-end já
-- tratava 'gestor' e calibradores avulsos (is_calibrador) como usuários "admin" do
-- módulo, um gestor comum na prática não conseguia nem criar nem preencher avaliação
-- alguma (RLS bloqueava tudo que não fosse a própria autoavaliação). Esta migration
-- fecha essa lacuna, liberando cada gestor apenas para os avaliados que lideram.

create or replace function public.e_gestor_do_funcionario(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios alvo
    join public.funcionarios gestor on gestor.id = alvo.gestor_id
    where alvo.id = p_funcionario_id
      and gestor.user_id = auth.uid()
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
      )
  );
$$;

drop policy if exists "avaliacoes_select" on public.avaliacoes;
create policy "avaliacoes_select" on public.avaliacoes
  for select using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
  );

drop policy if exists "avaliacoes_insert" on public.avaliacoes;
create policy "avaliacoes_insert" on public.avaliacoes
  for insert with check (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_gestor_do_funcionario(funcionario_id)
  );

drop policy if exists "avaliacoes_update" on public.avaliacoes;
create policy "avaliacoes_update" on public.avaliacoes
  for update using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
  );

-- avaliacoes_cultural / avaliacoes_tecnica / avaliacoes_pdi já reusam
-- pode_acessar_avaliacao(), então herdam a mudança automaticamente.
