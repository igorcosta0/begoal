-- Pedido (ago/2026): o sorteio automático de pares (grupos fixos no código +
-- distribuição aleatória) não deu certo na prática. Avaliação de Pares é
-- reconstruída do zero: agora é montada à mão pelo administrador, junto com
-- a avaliação comum, na mesma tela de montagem do ciclo — não existe mais
-- nenhum caminho de líder criar avaliação de pares sozinho.
--
-- Reverte a cláusula de líder que a migration 20260820_ciclo_avaliacao_admin_only
-- tinha deixado em avaliacoes_insert (só pra tipo = 'pares') — agora tipo =
-- 'pares' segue exatamente a mesma regra de tipo = 'padrao': só admin do
-- ciclo (e_admin_do_ciclo) ou gestor direto do organograma
-- (e_gestor_do_funcionario, pré-existente, não é sobre líder).

drop policy if exists "avaliacoes_insert" on public.avaliacoes;
create policy "avaliacoes_insert" on public.avaliacoes
  for insert with check (
    public.e_admin_do_ciclo(ciclo_id)
    or public.e_gestor_do_funcionario(funcionario_id)
  );
