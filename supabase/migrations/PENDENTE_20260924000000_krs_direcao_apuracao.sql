-- Pedido (24/09/2026): melhorar a visualização dos OKRs. Dois problemas de
-- cálculo apareceram com os KRs da Concretize carregados no mesmo dia:
--
-- 1. KR "quanto menor, melhor" com meta igual ao valor inicial (ex.: falhas
--    graves, meta 0, inicial 0) sempre mostrava 0%: o front só inferia a
--    direção por meta < inicial, e meta = inicial caía no "return 0".
-- 2. Faturamento era medido só pelo último lançamento mensal contra uma meta
--    única — setembro parcial fazia o objetivo inteiro parecer ruim.
--
-- Duas colunas novas em krs, com default que mantém o comportamento de hoje
-- pra todo KR existente (nenhum KR muda de cálculo sem alguém escolher):
--   direcao:  'maior' (quanto maior, melhor) | 'menor' (quanto menor, melhor)
--             O front continua tratando meta < inicial como 'menor', igual antes.
--   apuracao: 'ultimo' (último lançamento, como sempre foi) | 'soma' (soma dos
--             lançamentos) | 'media' (média dos lançamentos)
--
-- Rodar ANTES do push do front correspondente (o front passa a ler e gravar
-- essas colunas; sem elas a página de OKRs dá erro).

begin;

alter table public.krs
  add column if not exists direcao text not null default 'maior',
  add column if not exists apuracao text not null default 'ultimo';

alter table public.krs drop constraint if exists krs_direcao_check;
alter table public.krs add constraint krs_direcao_check check (direcao in ('maior', 'menor'));
alter table public.krs drop constraint if exists krs_apuracao_check;
alter table public.krs add constraint krs_apuracao_check check (apuracao in ('ultimo', 'soma', 'media'));

-- Dados da CTZ (KRs da Concretize, carregados em 24/09):
-- falhas graves: quanto menor, melhor.
update public.krs set direcao = 'menor'
where client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
  and titulo = 'Nº de falhas graves percebidas pelos clientes';

-- faturamento: soma dos meses contra a meta anual da planilha (R$ 4.050.000,
-- soma das metas mensais de jan a dez), em vez do último mês contra a meta mensal.
update public.krs set apuracao = 'soma', meta = 4050000
where client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
  and titulo = 'Faturamento de projetos Concretize';

commit;

-- Conferência (rodar depois, separado): deve listar os 2 KRs acima com os
-- valores novos; todos os outros KRs ficam com maior/ultimo.
-- select titulo, direcao, apuracao, meta from public.krs
-- where client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
--   and (direcao <> 'maior' or apuracao <> 'ultimo');
