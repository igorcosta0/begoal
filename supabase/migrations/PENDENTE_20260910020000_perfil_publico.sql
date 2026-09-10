-- Pedido (10/09/2026): 3 caixas novas na aba "Perfil" — "Sobre mim",
-- "Minhas Habilidades" e "Meus sonhos" — que cada usuário preenche sobre si
-- mesmo, e que ficam PÚBLICAS pra qualquer colega da mesma empresa ler
-- (diferente de tudo que construímos até aqui no Eneagrama/avaliação, onde a
-- regra sempre foi "cada um só vê o seu" — aqui é o oposto, de propósito, é
-- conteúdo que a própria pessoa escreve pra ser lido pelos outros).
--
-- Tabela nova em vez de colunas em public.funcionarios: não é por privacidade
-- (a leitura já seria igual, `funcionarios` já libera SELECT pra qualquer um
-- da mesma empresa) — é porque a policy de ESCRITA de `funcionarios`
-- ("Unified Write Policy for Funcionarios") hoje exige
-- permission_level = 'administrador', ou seja, um funcionário comum não
-- consegue de fato atualizar a PRÓPRIA linha ali (o campo "Nome completo" na
-- aba Perfil já tem esse problema, preexistente, fora do escopo deste
-- pedido). Colocar os campos novos numa tabela própria, com sua própria regra
-- de escrita (só a própria linha, sem depender de ser administrador), evita
-- tocar numa policy confusa e já usada por outras telas.
--
-- Sem trava de empresa CTZ — Perfil e Funcionários são páginas genéricas de
-- todas as empresas da plataforma, e o pedido não mencionou restringir a
-- nenhuma em especial.
create table if not exists public.funcionarios_perfil_publico (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) unique,
  user_id uuid not null,
  client_id uuid not null references public.clients(id),
  sobre_mim text,
  habilidades text,
  sonhos text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.funcionarios_perfil_publico enable row level security;

-- Leitura: público pra qualquer um da MESMA empresa (mesmo padrão de leitura
-- já usado em public.funcionarios — "Usuários autenticados podem ler
-- funcionarios").
drop policy if exists "funcionarios_perfil_publico_select_mesma_empresa" on public.funcionarios_perfil_publico;
create policy "funcionarios_perfil_publico_select_mesma_empresa" on public.funcionarios_perfil_publico
  for select using (
    client_id in (select ucr.client_id from public.user_company_roles ucr where ucr.user_id = auth.uid())
  );

-- Escrita: só a PRÓPRIA linha, pra qualquer usuário (não depende de ser
-- administrador) — é o ponto central desta tabela existir separada.
drop policy if exists "funcionarios_perfil_publico_insert_proprio" on public.funcionarios_perfil_publico;
create policy "funcionarios_perfil_publico_insert_proprio" on public.funcionarios_perfil_publico
  for insert with check (user_id = auth.uid());

drop policy if exists "funcionarios_perfil_publico_update_proprio" on public.funcionarios_perfil_publico;
create policy "funcionarios_perfil_publico_update_proprio" on public.funcionarios_perfil_publico
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
