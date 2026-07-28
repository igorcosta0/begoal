-- Adiciona um campo geral de "Evidências e Exemplos Práticos" na aba
-- Performance Técnica, equivalente ao evidencias_culturais já existente
-- na aba Alinhamento Cultural (até então só havia observação por critério).

alter table public.avaliacoes
  add column if not exists evidencias_tecnicas text;
