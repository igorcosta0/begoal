-- Sinais vitais "removidos": saem da lista principal e da Início, mas continuam no
-- banco (com os lançamentos) até alguém validar. Restaurar = voltar removido_em para null.
-- Rodar ANTES do deploy do front que lê essa coluna.

alter table public.sinais_vitais
  add column if not exists removido_em timestamptz;

comment on column public.sinais_vitais.removido_em is
  'Quando o sinal vital foi movido para Removidos (aguardando validação). Null = ativo.';

-- DESFAZER:
-- alter table public.sinais_vitais drop column if exists removido_em;
