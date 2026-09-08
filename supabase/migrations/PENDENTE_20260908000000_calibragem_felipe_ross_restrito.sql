-- Pedido (08/09/2026): Felipe Bet Ross (Líder da Vertical Concretize, lidera
-- Jean Patrick Candia Correa, Laura Tolentino e Luis Henrique Gaseta no
-- organograma) reportou não conseguir ver a nota de autoavaliação dos
-- próprios liderados pra fazer a calibragem. Diagnosticado: não é bug, ele
-- simplesmente nunca tinha entrado em nenhuma das duas listas de calibragem
-- (nem souGestorDaCalibragem — ciclo inteiro — nem souCalibradorRestrito —
-- Graciela e Felipe Marques Santos, migrations PENDENTE_20260902000000 e
-- PENDENTE_20260902010000), apesar de ter avaliações de liderados diretos já
-- em status calibragem no ciclo ativo (Jean Patrick e Luis Henrique Gaseta).
--
-- Confirmado com o usuário (AskUserQuestion): mesma regra da Graciela/Felipe
-- Marques — "calibrador restrito", só vê autoavaliação e calibra os PRÓPRIOS
-- liderados (via e_gestor_do_funcionario, já existente desde a migration
-- 20260807000000), não o ciclo inteiro da CTZ. Não entra em
-- pode_ver_lado_calibragem() (ações em lote Iniciar/Finalizar Calibragem,
-- Painel de Calibragem) nem em souGestorDaCalibragem no front-end.
--
-- e_calibrador_restrito() ganha o terceiro nome fixo (Felipe Bet Ross, ao
-- lado de Graciela e Felipe Marques) — mesmo padrão de lista fixa por
-- user_id. Sem mudança nenhuma em RLS de linha nem nas funções que somam
-- pode_ver_lado_calibragem OU e_calibrador_restrito (pode_ver_lado_auto,
-- get_avaliacao_cultural/tecnica, get_avaliacoes_por_ciclo) — elas já cobrem
-- o caso automaticamente, só o CONTEÚDO de e_calibrador_restrito muda aqui.

create or replace function public.e_calibrador_restrito(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    auth.uid() in (
      '203e4429-b9c7-451f-bc00-cc42f6e713f4', -- Graciela Borges Hoepers
      '05d3db6c-ef45-40af-9748-2f02b6f1efc4', -- Felipe Marques Santos
      '9c6dfb0a-c7d5-4a6a-8214-a6f22aea74e8'  -- Felipe Bet Ross
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;
