-- Pedido (09/09/2026): "confuso não ver a autoavaliação de um usuário ao
-- entrar na avaliação de par" — Avaliação de Pares não tem lado "auto" (só
-- nota_gestor, ver migration 20260812_avaliacao_pares), então quem abre o
-- ModalAvaliacao pra preencher/revisar uma avaliação de pares não tinha
-- nenhum jeito de ver o que a pessoa disse sobre si mesma na avaliação
-- COMUM (tipo='padrao') dela no mesmo ciclo — mesmo quem já tem esse
-- direito hoje (administrador/calibrador).
--
-- Confirmado com o usuário (AskUserQuestion): só organizar a exibição pra
-- quem JÁ pode ver autoavaliação hoje (pode_ver_lado_auto) — nenhuma
-- exceção nova na regra "cada um só vê a nota que deu, nunca a que
-- recebeu". Por isso estas duas funções são SECURITY DEFINER (pra poder
-- juntar dados de uma avaliação DIFERENTE da que está aberta — a comum, não
-- a de pares), mas repetem pode_ver_lado_auto no WHERE em vez de ignorar
-- permissão: quem não tem direito recebe conjunto vazio, igual já acontece
-- em get_vertical_padrao (mesma ideia, mesmo motivo).
create or replace function public.get_autoavaliacao_padrao_cultural(p_ciclo_id uuid, p_funcionario_id uuid)
returns table (pilar smallint, nota_auto smallint, observacoes text)
language sql
stable
security definer
set search_path = public
as $func$
  select ac.pilar, ac.nota_auto, ac.observacoes
  from public.avaliacoes a
  join public.avaliacoes_cultural ac on ac.avaliacao_id = a.id
  where a.ciclo_id = p_ciclo_id
    and a.funcionario_id = p_funcionario_id
    and a.tipo = 'padrao'
    and public.pode_ver_lado_auto(p_ciclo_id, p_funcionario_id, a.avaliador_id, a.status)
  order by ac.pilar;
$func$;

create or replace function public.get_autoavaliacao_padrao_tecnica(p_ciclo_id uuid, p_funcionario_id uuid)
returns table (criterio_key text, nota_auto smallint, observacoes text)
language sql
stable
security definer
set search_path = public
as $func$
  select t.criterio_key, t.nota_auto, t.observacoes
  from public.avaliacoes a
  join public.avaliacoes_tecnica t on t.avaliacao_id = a.id
  where a.ciclo_id = p_ciclo_id
    and a.funcionario_id = p_funcionario_id
    and a.tipo = 'padrao'
    and public.pode_ver_lado_auto(p_ciclo_id, p_funcionario_id, a.avaliador_id, a.status)
  order by t.criterio_key;
$func$;
