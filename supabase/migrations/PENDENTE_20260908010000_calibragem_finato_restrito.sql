-- Pedido (08/09/2026): Filipe Bossoni Finato (Líder da Vertical Novos
-- Negócios, lidera Carolina Zanette de Castro Schiefler no organograma)
-- relatou ter feito a calibragem — verificado via SQL direto que isso não é
-- possível hoje: ele não está em nenhuma das duas listas de calibragem (nem
-- souGestorDaCalibragem — ciclo inteiro — nem souCalibradorRestrito —
-- Graciela, Felipe Marques Santos e Felipe Bet Ross), apesar de ter a
-- avaliação padrão da Carolina já em status calibragem no ciclo ativo. Na
-- mesma verificação também ficou claro que ele nunca preencheu a própria
-- autoavaliação nem a avaliação de gestor da Carolina (nota_auto/nota_gestor
-- nulos nos dois casos) — status "calibragem" só reflete o "Iniciar
-- Calibragem" em lote (que move todo mundo, sem checar conclusão), não
-- trabalho de fato feito.
--
-- Confirmado com o usuário (AskUserQuestion): mesma regra da Graciela/Felipe
-- Marques/Felipe Ross — "calibrador restrito", só vê autoavaliação e calibra
-- os PRÓPRIOS liderados (via e_gestor_do_funcionario, já existente desde a
-- migration 20260807000000), não o ciclo inteiro da CTZ. Não entra em
-- pode_ver_lado_calibragem() (ações em lote Iniciar/Finalizar Calibragem,
-- Painel de Calibragem) nem em souGestorDaCalibragem no front-end.
--
-- e_calibrador_restrito() ganha o quarto nome fixo (Filipe Bossoni Finato,
-- ao lado de Graciela, Felipe Marques e Felipe Bet Ross) — mesmo padrão de
-- lista fixa por user_id. Sem mudança nenhuma em RLS de linha nem nas
-- funções que somam pode_ver_lado_calibragem OU e_calibrador_restrito
-- (pode_ver_lado_auto, get_avaliacao_cultural/tecnica,
-- get_avaliacoes_por_ciclo) — elas já cobrem o caso automaticamente, só o
-- CONTEÚDO de e_calibrador_restrito muda aqui.

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
      '9c6dfb0a-c7d5-4a6a-8214-a6f22aea74e8', -- Felipe Bet Ross
      '09f58ad9-89dc-444e-8448-88554d90f26e'  -- Filipe Bossoni Finato
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;
