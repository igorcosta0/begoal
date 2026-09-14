-- Bug relatado pelo Igor (14/09/2026), mesma classe do corrigido em
-- PENDENTE_20260914000000 mas numa função diferente: no Mapa 3
-- "Relacionando com o time", a lista de colegas já mostrava as pessoas
-- certas (fix anterior), mas ao SELECIONAR uma e mandar mensagem, a rota
-- devolvia "Essa pessoa ainda não tem perfil mapeado" mesmo pra gente que
-- claramente tem tipo mapeado (aparece em "Perfis da equipe", na mesma tela,
-- logo abaixo).
--
-- Causa raiz: obter_tipo_colega_mesma_empresa() (migration
-- PENDENTE_20260910010000_autoconhecimento_3_mapas.sql), chamada por
-- /api/como-abordar-colega, comparava `alvo.client_id` contra a própria
-- empresa de quem chama, auto-consultada da linha de `funcionarios` de quem
-- chama (`select client_id from funcionarios where user_id = auth.uid()
-- limit 1`) — mesmo problema self-lookup do fix anterior: pra administrador
-- multi-empresa (Igor/Priscila) essa linha própria pertence a outra empresa
-- (no caso do Igor, "Debbuger"), não à CTZ, então a comparação nunca batia
-- pra ninguém da CTZ.
--
-- Fix (mais simples que o anterior, não precisa de client_id vindo do
-- front-end/rota): em vez de comparar contra a "empresa de casa" de quem
-- chama, confere diretamente se quem chama tem QUALQUER vínculo
-- (user_company_roles) com a empresa do PRÓPRIO ALVO — funciona igual pra
-- funcionário comum (1 empresa só) e pra administrador multi-empresa (várias
-- linhas em user_company_roles, uma delas cobre a empresa do alvo).
create or replace function public.obter_tipo_colega_mesma_empresa(p_funcionario_alvo_id uuid)
returns table(tipo smallint, subtipo_sequencia text)
language sql
stable
security definer
set search_path = public
as $$
  select fe.tipo, fe.subtipo_sequencia
  from public.funcionarios_eneagrama fe
  join public.funcionarios alvo on alvo.id = fe.funcionario_id
  where fe.funcionario_id = p_funcionario_alvo_id
    and exists (
      select 1 from public.user_company_roles ucr
      where ucr.user_id = auth.uid() and ucr.client_id = alvo.client_id
    );
$$;
