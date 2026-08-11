-- Avaliação de Pares: líderes avaliando líderes, além do ciclo padrão
-- (autoavaliação + gestor). Só cultural (4 pilares) — pares de outra vertical
-- raramente têm visibilidade das metas técnicas específicas do colega.
--
-- "Líder" é calculado no front-end (não uma coluna nova): cargo contém "líder"
-- OU a pessoa tem pelo menos 1 liderado (funcionarios.gestor_id apontando pra
-- ela). Aqui só precisamos abrir espaço no banco pra múltiplas avaliações por
-- pessoa no mesmo ciclo, uma por avaliador.

alter table public.avaliacoes
  add column if not exists tipo text not null default 'padrao' check (tipo in ('padrao', 'pares'));

-- A trava antiga (1 avaliação por pessoa por ciclo, ponto) não serve mais: uma
-- pessoa pode ter 1 avaliação "padrao" (gestor) + N avaliações "pares" (uma por
-- colega avaliador). Troca por dois índices parciais:
--   - "padrao" continua no máximo 1 por pessoa por ciclo (comportamento igual
--     ao que já existia, zero regressão pra ciclos já criados);
--   - "pares" permite várias, mas nunca duas do mesmo avaliador pra mesma pessoa.
alter table public.avaliacoes
  drop constraint if exists avaliacoes_ciclo_funcionario_unique;

create unique index if not exists avaliacoes_padrao_unique
  on public.avaliacoes (ciclo_id, funcionario_id)
  where tipo = 'padrao';

create unique index if not exists avaliacoes_pares_unique
  on public.avaliacoes (ciclo_id, funcionario_id, avaliador_id)
  where tipo = 'pares';

-- Nenhuma mudança de RLS necessária: avaliacoes_select/update e
-- pode_acessar_avaliacao (avaliacoes_cultural/tecnica/pdi) já liberam acesso
-- pra quem está em avaliacoes.avaliador_id (e_o_avaliador, da migration
-- anterior) — é exatamente o mecanismo que a avaliação de pares usa.
