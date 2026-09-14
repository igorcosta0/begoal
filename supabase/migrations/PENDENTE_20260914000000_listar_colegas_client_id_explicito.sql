-- Bug relatado pelo Igor (14/09/2026): Mapa 3 "Relacionando com o time"
-- mostrava "Ainda não há colegas com tipo mapeado nesta empresa" pra ele,
-- mesmo a CTZ tendo 20 pessoas mapeadas (confirmado via SQL direto).
--
-- Causa raiz: listar_colegas_com_perfil_mapeado() (migration
-- PENDENTE_20260910010000_autoconhecimento_3_mapas.sql) descobria "minha
-- empresa" auto-consultando a PRÓPRIA linha de `funcionarios` de quem chama
-- (`select client_id from funcionarios where user_id = auth.uid() limit 1`).
-- Isso funciona pra qualquer funcionário normal, de uma empresa só — mas
-- quebra pra administrador multi-empresa (plataforma BeHive: Igor/Priscila,
-- que administram várias empresas via user_company_roles). A própria linha
-- de `funcionarios` do Igor pertence a "Debbuger" (client_id
-- bc8ec3fe-53e7-47a2-879f-6872290159dd), não à CTZ — então a função filtrava
-- colegas pela empresa errada (que não tem ninguém com Eneagrama mapeado) e
-- sempre devolvia vazio pra ele, independente de qual empresa estivesse
-- selecionada na tela. Confirmado via SQL direto (contagem de
-- funcionarios_eneagrama por client_id, linha de funcionarios do Igor).
--
-- sou_lider_de_alguem() e listar_meus_liderados_com_perfil_mapeado() (mesma
-- migration) NÃO têm esse problema — não fazem esse self-lookup de
-- client_id, checam só o organograma via gestor_id, que já é implicitamente
-- da empresa certa independente de qual é a "própria empresa" de quem chama.
-- Mapa 2 continuar vazio pro Igor é esperado (ele não lidera ninguém no
-- organograma de nenhuma empresa), não é bug.
--
-- Fix: recebe client_id explícito — a empresa selecionada na UI, o mesmo
-- `empresa.id` já usado com sucesso por getTodosPerfisEneagrama/
-- getTodosCargosPerfil (mesmo padrão, agora unificado). Como é security
-- definer, confere que quem chama de fato pertence a essa empresa
-- (user_company_roles) antes de listar nomes — sem isso, qualquer usuário
-- autenticado poderia passar client_id de uma empresa que não é a dele.

drop function if exists public.listar_colegas_com_perfil_mapeado();

create or replace function public.listar_colegas_com_perfil_mapeado(p_client_id uuid)
returns table(funcionario_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.full_name
  from public.funcionarios f
  join public.funcionarios_eneagrama fe on fe.funcionario_id = f.id
  where f.client_id = p_client_id
    and f.user_id is distinct from auth.uid()
    and exists (
      select 1 from public.user_company_roles ucr
      where ucr.user_id = auth.uid() and ucr.client_id = p_client_id
    )
  order by f.full_name;
$$;
