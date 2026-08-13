-- Bug: a régua de notas no front-end (ModalAvaliacao) vai de 1 a 5 — a nota 5
-- ("Excepcional") foi criada como extensão do nível 4, ver comentário em
-- NOTAS_LEGENDA — mas as colunas de nota nunca foram ampliadas: continuavam
-- com CHECK (... between 1 and 4) desde a criação das tabelas (migration
-- 20260720) e da calibragem (migration 20260721).
--
-- Efeito prático: ao marcar nota 5 em qualquer pilar cultural ou critério
-- técnico (auto, gestor ou calibragem), o upsert daquele pilar quebra por
-- violar a constraint do banco. Como persistirCampos() salva os 4 pilares
-- culturais + as observações gerais numa mesma leva e aborta tudo se
-- qualquer upsert falhar, o texto digitado em "Observações do Avaliador" /
-- "Observações do Gestor" nunca chegava a ser salvo — mesmo sem nenhum erro
-- visível de RLS, só a mensagem crua da constraint do Postgres.
-- Mais comum de aparecer na Avaliação de Pares porque líderes avaliando
-- colegas tendem a dar nota máxima com mais frequência.

alter table public.avaliacoes_cultural
  drop constraint if exists avaliacoes_cultural_nota_auto_check,
  drop constraint if exists avaliacoes_cultural_nota_gestor_check,
  drop constraint if exists avaliacoes_cultural_nota_calibragem_check;

alter table public.avaliacoes_cultural
  add constraint avaliacoes_cultural_nota_auto_check check (nota_auto between 1 and 5),
  add constraint avaliacoes_cultural_nota_gestor_check check (nota_gestor between 1 and 5),
  add constraint avaliacoes_cultural_nota_calibragem_check check (nota_calibragem between 1 and 5);

alter table public.avaliacoes_tecnica
  drop constraint if exists avaliacoes_tecnica_nota_auto_check,
  drop constraint if exists avaliacoes_tecnica_nota_gestor_check,
  drop constraint if exists avaliacoes_tecnica_nota_calibragem_check;

alter table public.avaliacoes_tecnica
  add constraint avaliacoes_tecnica_nota_auto_check check (nota_auto between 1 and 5),
  add constraint avaliacoes_tecnica_nota_gestor_check check (nota_gestor between 1 and 5),
  add constraint avaliacoes_tecnica_nota_calibragem_check check (nota_calibragem between 1 and 5);
