-- Pedido (ago/2026): Filippe Réus passa a poder abrir/rodar o Painel de
-- Calibragem da CTZ (Iniciar/Finalizar Calibragem, editar nota) mesmo não
-- sendo administrador nem gestor de ninguém no organograma. A migration
-- anterior (20260827000000_calibragem_ctz_restrita) já resolveu QUEM VÊ o
-- VALOR da nota de calibragem (pode_ver_lado_calibragem, usada pra mascarar
-- colunas em get_avaliacao_cultural/tecnica e get_calibragem_ciclo_*) — mas
-- isso não basta: o painel só devolve LINHA nenhuma pra quem não passa
-- primeiro pela RLS de avaliacoes/avaliacoes_cultural/avaliacoes_tecnica
-- (pode_acessar_avaliacao, e as policies avaliacoes_select/update direto na
-- tabela-mãe), e Filippe não bate em nenhuma das condições existentes
-- (e_admin_do_ciclo, e_avaliado, e_gestor_do_funcionario,
-- e_avaliador_designado) pra avaliação de terceiros.
--
-- Em vez de duplicar a lista fixa de novo, reaproveitamos
-- pode_ver_lado_calibragem() como mais uma condição de acesso: pra empresas
-- que não são a CTZ ela já é idêntica a e_admin_do_ciclo (nenhuma mudança de
-- comportamento ali); pra CTZ ela é "só Igor ou Filippe" — exatamente quem
-- deve conseguir ler/editar QUALQUER avaliação do ciclo pra fins de
-- calibragem.
--
-- updateAvaliacao() (usado pra gravar media_cultural_calibragem/
-- media_tecnica_calibragem após cada nota) mexe na tabela avaliacoes
-- direto, por isso avaliacoes_update também precisa da cláusula — só
-- avaliacoes_select não seria suficiente.

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
        or public.pode_ver_lado_calibragem(a.ciclo_id)
      )
  );
$$;

drop policy if exists "avaliacoes_select" on public.avaliacoes;
create policy "avaliacoes_select" on public.avaliacoes
  for select using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_avaliador_designado(avaliador_id)
    or public.pode_ver_lado_calibragem(ciclo_id)
  );

drop policy if exists "avaliacoes_update" on public.avaliacoes;
create policy "avaliacoes_update" on public.avaliacoes
  for update using (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_avaliado(funcionario_id)
    or public.e_gestor_do_funcionario(funcionario_id)
    or public.e_avaliador_designado(avaliador_id)
    or public.pode_ver_lado_calibragem(ciclo_id)
  );
