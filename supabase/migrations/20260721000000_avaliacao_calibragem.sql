-- Adiciona a etapa de Calibragem ao módulo de Avaliação de Desempenho:
-- uma terceira nota (além de Auto e Gestor), feita depois com acompanhamento.

alter table public.avaliacoes
  add column if not exists media_cultural_calibragem numeric(3, 1),
  add column if not exists media_tecnica_calibragem numeric(3, 1);

alter table public.avaliacoes drop constraint if exists avaliacoes_status_check;
alter table public.avaliacoes add constraint avaliacoes_status_check
  check (status in ('pendente', 'auto_concluida', 'gestor_concluida', 'calibragem', 'finalizada'));

alter table public.avaliacoes_cultural
  add column if not exists nota_calibragem smallint check (nota_calibragem between 1 and 4);

alter table public.avaliacoes_tecnica
  add column if not exists nota_calibragem smallint check (nota_calibragem between 1 and 4);
