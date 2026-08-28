-- Pedido (28/08/2026): Felipe Marques relatou que, mesmo já estando em
-- pode_ver_lado_calibragem (migration 20260828000000), ainda não via a
-- autoavaliação de quem ele avalia no painel individual (ModalAvaliacao,
-- aba Cultural/Técnica) — só via no Painel de Calibragem (tela em lote,
-- get_calibragem_ciclo_cultural/tecnica).
--
-- Causa: pode_ver_lado_auto (a função que mascara a coluna "auto" nas
-- leituras normais — get_avaliacao_cultural/tecnica, get_minhas_avaliacoes,
-- get_avaliacoes_por_ciclo) só libera pra e_admin_do_ciclo ou o próprio
-- avaliado; nunca checava pode_ver_lado_calibragem. O Painel de Calibragem
-- é uma leitura à parte (get_calibragem_ciclo_cultural/tecnica, migration
-- 20260826000000) que já usava pode_ver_lado_calibragem direto — por isso
-- funcionava só lá.
--
-- Fix: pode_ver_lado_auto passa a aceitar também pode_ver_lado_calibragem,
-- sem gate de status (mesmo comportamento incondicional que e_admin_do_ciclo
-- já tinha) — quem está nessa lista é tratado como auditor em qualquer tela,
-- não só no painel em lote. Fora da CTZ, pode_ver_lado_calibragem cai em
-- e_admin_do_ciclo, que já era coberto — sem mudança de comportamento pras
-- outras empresas.

create or replace function public.pode_ver_lado_auto(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_status text)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_avaliado(p_funcionario_id)
    or public.pode_ver_lado_calibragem(p_ciclo_id);
$func$;
