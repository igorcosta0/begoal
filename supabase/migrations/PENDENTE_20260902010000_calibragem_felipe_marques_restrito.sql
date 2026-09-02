-- Pedido (02/09/2026, mesma sessão da migration PENDENTE_20260902000000_
-- calibragem_restrita_graciela): Felipe Marques Santos sai da lista de
-- calibradores que veem/calibram o CICLO INTEIRO da CTZ (pode_ver_lado_
-- calibragem, onde tinha entrado na migration 20260828000000_calibragem_ctz_
-- adiciona_felipe_marques) e passa a ser "calibrador restrito" — mesma regra
-- da Graciela (migration anterior desta sessão): só vê autoavaliação e
-- calibra os PRÓPRIOS liderados no organograma (11 liderados diretos, ver
-- migration 20260827010000_calibragem_ctz_acesso_filippe). Confirmado com o
-- usuário: só o Filippe Réus mantém visão do ciclo inteiro além de Igor e
-- Priscila (ele é o dono da empresa) — Felipe Marques não precisa mais ver
-- ninguém fora do próprio time.
--
-- pode_ver_lado_calibragem() volta a ter só 3 nomes fixos (Igor, Filippe
-- Réus, Priscila). e_calibrador_restrito() ganha o segundo nome fixo (Felipe
-- Marques, ao lado da Graciela) — mesmo padrão de lista fixa por user_id já
-- usado nas duas funções.
--
-- Sem mudança nenhuma em RLS de linha (avaliacoes_select/update,
-- pode_acessar_avaliacao): Felipe Marques já tinha acesso de linha aos
-- próprios liderados via e_gestor_do_funcionario desde sempre (migration
-- 20260807000000), independente de qual lista de calibragem ele está.
-- Também não mexe nas funções que só usam pode_ver_lado_calibragem OU
-- e_calibrador_restrito somados (pode_ver_lado_auto, get_avaliacao_cultural/
-- tecnica, get_avaliacoes_por_ciclo — migration anterior desta sessão): elas
-- já cobrem os dois casos automaticamente, só o CONTEÚDO das duas funções
-- muda aqui.
--
-- Front-end (avaliacao/page.tsx): felipe.marques@projetosconcretize.com.br
-- sai da lista de souGestorDaCalibragem e entra na de souCalibradorRestrito
-- (que passa a ser lista de e-mails, não um só) — ele perde os botões
-- Iniciar/Finalizar Calibragem e o Painel de Calibragem em lote, mantém a
-- aba Calibragem/nota auto só dos próprios liderados no modal individual.

create or replace function public.pode_ver_lado_calibragem(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select case
    when exists (
      select 1
      from public.ciclos_avaliacao ca
      where ca.id = p_ciclo_id
        and ca.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' -- CTZ
    )
    then auth.uid() in (
      '499bc128-a5d8-4f04-9d4c-4bd8629d7894', -- Igor Costa
      '0177b153-a332-40b9-bf9e-a37820c7145c', -- Filippe Réus
      '2623efc0-fe54-45cb-89c1-96dc52baa20b'  -- Priscila Santos
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$func$;

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
      '05d3db6c-ef45-40af-9748-2f02b6f1efc4'  -- Felipe Marques Santos
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;
