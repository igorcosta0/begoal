-- Garante que cada funcionário tenha no máximo uma avaliação por ciclo,
-- já que ativar um ciclo agora cria a avaliação de todos automaticamente.

alter table public.avaliacoes
  add constraint avaliacoes_ciclo_funcionario_unique unique (ciclo_id, funcionario_id);
