-- A tela de montagem (ModalMontarAvaliacoes) sempre deixou escalar qualquer
-- pessoa da empresa como "avaliador" de um participante, não só o gestor
-- direto no organograma (comentário já existente em avaliacao/page.tsx:
-- "dá pra escalar qualquer pessoa, não só o gestor direto"). Só que a RLS
-- nunca acompanhou isso: avaliacoes_select/update e pode_acessar_avaliacao
-- só liberavam acesso via e_gestor_do_funcionario, que olha
-- funcionarios.gestor_id (organograma), ignorando por completo a coluna
-- avaliacoes.avaliador_id escolhida na montagem.
--
-- Resultado prático: se Réus monta o ciclo e escolhe alguém que NÃO é o
-- gestor direto do participante no organograma, essa pessoa escolhida nunca
-- via a avaliação em "Preciso Avaliar" nem conseguia abrir/preencher —
-- RLS barrava silenciosamente.
--
-- Esta migration adiciona e_avaliador_designado(), que reconhece
-- especificamente quem está em avaliacoes.avaliador_id, e passa a valer
-- tanto quanto ser gestor no organograma. Isso é o que faz a avaliação
-- aparecer só (e exatamente) pra quem foi selecionado no campo "Avaliador".

create or replace function public.e_avaliador_designado(p_avaliador_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios f
    where f.id = p_avaliador_id
      and f.user_id = auth.uid()
  );
$$;

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

-- avaliacoes_cultural / avaliacoes_tecnica / avaliacoes_pdi reusam
-- pode_acessar_avaliacao(), então herdam a mudança automaticamente.
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
