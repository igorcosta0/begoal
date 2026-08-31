-- Fase 2 do módulo de autoconhecimento (Eneagrama), só CTZ (pedido gravado em
-- Adições futuras/Eneagrama.txt, base consolidada em
-- Adições futuras/Eneagrama - Base de Conhecimento CTZ.md).
--
-- Os tipos de cada pessoa vieram de Adições futuras/FUNCIONARIOS CTZ.xlsx e já
-- foram conferidos manualmente contra o banco: as 22 pessoas da planilha batem
-- 100% com public.funcionarios (client_id da CTZ) por
-- upper(trim(full_name)) = NOME, e cada linha já tem user_id preenchido.
--
-- Por que uma tabela nova em vez de colunas em funcionarios: a RLS de SELECT em
-- public.funcionarios hoje libera qualquer pessoa da mesma empresa (join por
-- user_company_roles.client_id), não só a própria linha — colocar o tipo ali
-- deixaria o tipo de todo mundo visível a todo mundo. O mesmo princípio que já
-- vale pras notas de avaliação (cada um só vê a que deu, nunca a que recebeu)
-- deve valer aqui: cada um só vê o PRÓPRIO tipo. Por isso uma tabela separada,
-- com RLS restrita a user_id = auth.uid(), sem policy de insert/update (a carga
-- inicial roda como owner no SQL Editor, que não passa pela RLS).
--
-- Felipe Bortolozzo Araújo de Mello e Gabriel Rodrigues Lodetti não entram
-- aqui: existem em funcionarios mas a planilha não tinha tipo preenchido pra
-- eles ainda. Ficam sem linha nesta tabela até serem mapeados.

create table if not exists public.funcionarios_eneagrama (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id),
  user_id uuid not null,
  client_id uuid not null references public.clients(id),
  tipo smallint not null check (tipo between 1 and 9),
  subtipo_sequencia text,
  created_at timestamptz not null default now(),
  unique (funcionario_id)
);

alter table public.funcionarios_eneagrama enable row level security;

drop policy if exists "funcionarios_eneagrama_select_proprio" on public.funcionarios_eneagrama;
create policy "funcionarios_eneagrama_select_proprio" on public.funcionarios_eneagrama
  for select using (user_id = auth.uid());

-- Carga inicial: 20 das 22 pessoas da planilha (as 2 sem tipo ficam de fora).
insert into public.funcionarios_eneagrama (funcionario_id, user_id, client_id, tipo, subtipo_sequencia)
select f.id, f.user_id, f.client_id, v.tipo, v.subtipo_sequencia
from public.funcionarios f
join (values
  ('AMANDA BITTENCOURT', 6, 'SX/AP/SO'),
  ('ANGELICA SCARPARI MACHADO', 6, 'SO/AP/SX'),
  ('CAMILA CHRISTINE LEAL', 1, 'AP/SO/SX'),
  ('CAROLINA ZANETTE DE CASTRO SCHIEFLER', 2, 'SO/AP/SX'),
  ('DAVI PUZIO DA SILVA', 9, 'AP/SO/SX'),
  ('EZEQUIEL CUNHA DE OLIVEIRA', 5, 'AP/SO/SX'),
  ('FABIANA CAROLINA DE OLIVERA', 6, 'SO/AP/SX'),
  ('FELIPE BET ROSS', 7, 'SX/AP/SO'),
  ('FELIPE MARQUES SANTOS', 1, 'AP/SX/SO'),
  ('FILIPE BOSSONI FINATO', 5, 'AP/SO/SX'),
  ('FILIPPE TEIXEIRA RÉUS', 3, 'AP/SO/SX'),
  ('GRACIELA BORGES HOEPERS', 1, 'AP/SX/SO'),
  ('GUILHERME COSTA MANOEL', 9, 'SO/SX/AP'),
  ('JEAN PATRICK CANDIA CORREA', 7, 'AP/SO/SX'),
  ('LEILIANE SCHEFFER RADDATZ', 4, 'AP/SX/SO'),
  ('LUIS HENRIQUE GASETA', 7, 'SO/AP/SX'),
  ('OTAVIO PIUCCO JUNIOR', 2, 'SO/AP/SX'),
  ('SAMUEL SABINO SACKETI', 3, 'SO/AP/SX'),
  ('TAIANE DOMINGOS BERTO', 6, 'AP/SO/SX'),
  ('TUANI BITENCOURT FERREIRA', 2, 'AP/SO/SX')
) as v(nome, tipo, subtipo_sequencia) on upper(trim(f.full_name)) = v.nome
where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
on conflict (funcionario_id) do nothing;
