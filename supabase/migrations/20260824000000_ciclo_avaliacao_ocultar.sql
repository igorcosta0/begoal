-- Pedido (ago/2026): administrador poder "ocultar" um ciclo já criado —
-- fica invisível pros participantes (some da lista de ciclos deles e das
-- avaliações dentro dele em "Minha Auto-Avaliação"/"Devo Avaliar"), sem
-- excluir nada. Reversível: reexibir devolve tudo do jeito que estava.
--
-- Diferente de status (rascunho/ativo/encerrado, que é etapa do fluxo),
-- "oculto" é só visibilidade — pode ocultar um ciclo em qualquer status.

alter table public.ciclos_avaliacao
  add column if not exists oculto boolean not null default false;

-- ciclos_avaliacao_select: administrador sempre vê tudo (oculto ou não);
-- qualquer outro vinculado à empresa só vê ciclos não-ocultos.
drop policy if exists "ciclos_avaliacao_select" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_select" on public.ciclos_avaliacao
  for select using (
    exists (
      select 1 from public.user_company_roles ucr
      where ucr.client_id = ciclos_avaliacao.client_id
        and ucr.user_id = auth.uid()
        and ucr.permission_level = 'administrador'
    )
    or (
      not oculto
      and exists (
        select 1 from public.user_company_roles ucr
        where ucr.client_id = ciclos_avaliacao.client_id
          and ucr.user_id = auth.uid()
      )
    )
  );

-- Nenhuma mudança em avaliacoes/get_minhas_avaliacoes/get_avaliacoes_para_avaliar
-- é necessária: essas funções fazem INNER JOIN com ciclos_avaliacao, então a
-- RLS acima já esconde as avaliações de um ciclo oculto automaticamente pra
-- quem não é administrador — sem precisar duplicar a checagem em outro lugar.
