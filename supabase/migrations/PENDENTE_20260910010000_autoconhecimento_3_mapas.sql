-- Pedido (10/09/2026): "subir a metodologia" descrita em
-- "Adições futuras/Abordagem .pdf" (pitch da BeHive sobre liderar a partir do
-- Eneagrama — EU/Autoliderança e NÓS/Liderança de pessoas) organizada em 3
-- mapas dentro do módulo de Autoconhecimento:
--   1. Autoliderança          — todo mundo com tipo mapeado
--   2. Liderando o time       — só quem tem liderado direto no organograma
--   3. Relacionando com o time — todo mundo com tipo mapeado
--
-- Isso GRADUA o protótipo: até aqui só Igor/Priscila (souPilotoAutoconhecimento,
-- ver lib/utils.ts) viam o módulo inteiro — a partir de agora qualquer CTZ com
-- tipo mapeado acessa os mapas 1 e 3, e quem lidera gente (mapa 2). A visão
-- "Perfis da equipe" (tabela com o tipo de TODO MUNDO, pra conferência de
-- mapeamento) e o cruzamento cargo x Eneagrama CONTINUAM só pra Igor/Priscila
-- — nada aqui muda a RLS de funcionarios_eneagrama/funcionarios_cargo_perfil
-- em si, só soma funções novas security-definer por cima, que devolvem
-- estritamente o necessário (nome, nunca o tipo) ou, quando devolvem o tipo
-- (as duas "obter_tipo_*"), são chamadas só no SERVIDOR pelas rotas de
-- API — o contrato de nunca incluir `tipo` na resposta JSON pro cliente já
-- existia desde 09/09 em como-abordar-colega, ver comentário lá.

-- Mapa 2 (Liderando o time): quem vê a seção — mesma definição de "líder" já
-- usada pra escopo de gestor em avaliação (e_gestor_do_funcionario) e
-- calibragem restrita: organograma de verdade (funcionarios.gestor_id), não a
-- marcação manual lider_avaliacao (essa foi feita pra Avaliação de Pares, não
-- necessariamente bate com quem lidera gente de verdade).
create or replace function public.sou_lider_de_alguem()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios liderado
    join public.funcionarios eu on eu.id = liderado.gestor_id
    where eu.user_id = auth.uid()
  );
$$;

-- Mapa 3 (Relacionando com o time): lista de nomes pra escolher quem
-- perguntar "como abordar" — só NOME, nunca o tipo (o tipo só é lido dentro de
-- obter_tipo_colega_mesma_empresa, chamada só no servidor, ver rota de API).
-- Escopado pela MESMA empresa de quem chama (não é possível listar colega de
-- outro cliente), e exclui quem não tem tipo mapeado ainda (não teria como
-- gerar orientação sobre a pessoa).
create or replace function public.listar_colegas_com_perfil_mapeado()
returns table(funcionario_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.full_name
  from public.funcionarios f
  join public.funcionarios_eneagrama fe on fe.funcionario_id = f.id
  where f.client_id = (select client_id from public.funcionarios where user_id = auth.uid() limit 1)
    and f.user_id is distinct from auth.uid()
  order by f.full_name;
$$;

-- Mapa 2: mesma ideia, mas só os PRÓPRIOS liderados diretos (não a empresa
-- toda) — reaproveita a mesma relação de organograma de e_gestor_do_funcionario.
create or replace function public.listar_meus_liderados_com_perfil_mapeado()
returns table(funcionario_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select alvo.id, alvo.full_name
  from public.funcionarios alvo
  join public.funcionarios gestor on gestor.id = alvo.gestor_id
  join public.funcionarios_eneagrama fe on fe.funcionario_id = alvo.id
  where gestor.user_id = auth.uid()
  order by alvo.full_name;
$$;

-- As duas funções abaixo são as ÚNICAS que devolvem o tipo de OUTRA pessoa —
-- de propósito nunca chamadas direto do navegador: só as rotas
-- /api/como-abordar-colega e /api/liderar-liderado as chamam, no servidor, e
-- nenhuma das duas nunca repassa `tipo`/`subtipo_sequencia` pro cliente (só
-- usa como contexto interno do prompt do Gemini). Antes desta migration essas
-- rotas liam funcionarios_eneagrama direto pelo cliente Supabase da sessão, o
-- que só funcionava pra quem tinha pode_ver_todos_eneagrama_ctz() (Igor/
-- Priscila) — agora que o módulo abriu pra todo mundo, é preciso um caminho
-- security-definer que NÃO depende dessa lista fixa.
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
    and alvo.client_id = (select client_id from public.funcionarios where user_id = auth.uid() limit 1);
$$;

create or replace function public.obter_tipo_liderado(p_funcionario_alvo_id uuid)
returns table(tipo smallint, subtipo_sequencia text)
language sql
stable
security definer
set search_path = public
as $$
  select fe.tipo, fe.subtipo_sequencia
  from public.funcionarios_eneagrama fe
  where fe.funcionario_id = p_funcionario_alvo_id
    and public.e_gestor_do_funcionario(p_funcionario_alvo_id);
$$;
