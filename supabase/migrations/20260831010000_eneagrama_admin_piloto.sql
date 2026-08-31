-- Pedido do Igor (31/08, mesmo dia da migration anterior): como administrador
-- do protótipo, ele precisa conseguir ver o perfil de TODOS os funcionários
-- mapeados, não só o próprio — que, aliás, nem existe pra ele nem pra Priscila
-- Santos (nenhum dos dois é um dos 20 funcionários com tipo cadastrado, os
-- dois estão fora da tabela de propósito). É exatamente a mesma dupla
-- restrita a quem vê o módulo (souPilotoAutoconhecimento, no front).
--
-- A policy "funcionarios_eneagrama_select_proprio" (migration anterior)
-- continua intacta e vale pra todo mundo. Esta é uma SEGUNDA policy de
-- SELECT, adicional (Postgres faz OR entre policies permissivas do mesmo
-- comando) — libera ver QUALQUER linha só pra esses 2 user_ids fixos. Mesmo
-- padrão de pode_ver_lado_calibragem em avaliacao.

create or replace function public.pode_ver_todos_eneagrama_ctz()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() in (
    '499bc128-a5d8-4f04-9d4c-4bd8629d7894', -- igorecosta1@gmail.com
    '2623efc0-fe54-45cb-89c1-96dc52baa20b'  -- priscila.santos@behive.net.br
  );
$$;

drop policy if exists "funcionarios_eneagrama_select_admin_piloto" on public.funcionarios_eneagrama;
create policy "funcionarios_eneagrama_select_admin_piloto" on public.funcionarios_eneagrama
  for select using (public.pode_ver_todos_eneagrama_ctz());
