-- Substitui o campo único "Evidências e Exemplos Práticos" da aba Alinhamento
-- Cultural (evidencias_culturais, em avaliacoes) por um campo por pilar,
-- no mesmo padrão já usado por avaliacoes_tecnica.observacoes (um campo por
-- critério). O campo geral evidencias_tecnicas também deixa de ser usado
-- pela UI em favor do campo já existente por critério técnico.

alter table public.avaliacoes_cultural
  add column if not exists observacoes text;
