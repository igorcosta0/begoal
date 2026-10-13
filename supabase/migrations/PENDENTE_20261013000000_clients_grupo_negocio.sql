-- Negócios dentro de um mesmo grupo (pedido de 13/10/2026, BMG).
-- Cada negócio continua sendo uma linha de `clients` (dados, pessoas e acessos separados, com
-- a mesma RLS por client_id de sempre). Estas colunas só dizem quais empresas pertencem ao
-- mesmo grupo, para a tela mostrar o botão de alternar entre elas.
--   grupo          nome do grupo (ex.: 'BMG'); null = empresa comum, sem negócios
--   negocio        nome curto do negócio dentro do grupo (ex.: 'CSC')
--   negocio_ordem  posição na lista do botão
-- O front funciona sem estas colunas (só não mostra o botão), então pode rodar antes ou depois
-- do deploy.

alter table public.clients
  add column if not exists grupo text,
  add column if not exists negocio text,
  add column if not exists negocio_ordem smallint;

create index if not exists clients_grupo_idx on public.clients (grupo) where grupo is not null;
