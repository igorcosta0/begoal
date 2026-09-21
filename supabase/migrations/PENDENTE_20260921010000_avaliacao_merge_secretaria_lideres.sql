-- Pedido (21/09/2026): "Secretária Executiva" deixa de ser vertical própria
-- na tela de Avaliação — a pessoa que estava lá é organizacionalmente parte
-- do CSC/Financeiro, não um departamento isolado. Os 3 critérios técnicos
-- (sec_agenda/sec_eventos/sec_viagens) foram unidos aos 3 já existentes de
-- csc_financeiro no front-end (ModalAvaliacao.tsx VERTICAIS_CTZ) — as chaves
-- de critério não mudaram, só o agrupamento por vertical, então nenhuma nota
-- técnica já preenchida se perde.
--
-- Esta migration só reaponta a COLUNA vertical de avaliações existentes —
-- não mexe em avaliacoes_tecnica (as notas continuam lá, com as mesmas
-- chaves, agora visíveis sob csc_financeiro em vez de secretaria_executiva).
update public.avaliacoes
set vertical = 'csc_financeiro'
where vertical = 'secretaria_executiva';

-- Vertical nova "lideres" não precisa de nenhuma linha aqui — é só um valor
-- de texto livre no front-end (avaliacoes.vertical não tem constraint/enum
-- no banco), passa a existir a partir da primeira avaliação que o admin
-- montar com essa vertical selecionada.
