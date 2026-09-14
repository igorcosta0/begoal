-- Pedido do Igor (14/09/2026): Letícia Leite (autora do "Programa Foco" da
-- BeHive, fonte de todo o módulo de Autoconhecimento/Eneagrama) ganha acesso
-- IGUAL ao de Igor e Priscila na CTZ — administrador de verdade + calibragem
-- do ciclo inteiro + Nine Box + visão de admin do Eneagrama. NÃO inclui
-- podeIgnorarLimiteCiclo (front-end, avaliacao/page.tsx) — isso é só do
-- Igor, nem a Priscila tem, então fica fora por ser a interseção, não a
-- união dos dois.
--
-- PRÉ-REQUISITO: o login (leticia.leite@behive.net.br, e-mail genérico,
-- senha padrão combinada com o Igor) precisa já existir em auth.users antes
-- de rodar isto — criado pelo próprio Igor no painel do Supabase
-- (Authentication > Add user, com "Auto Confirm User" marcado). Por isso
-- esta migration busca o id dela por e-mail em vez de usar um UUID literal
-- (diferente do padrão das migrations anteriores dessa mesma lista) — o
-- UUID só passa a existir depois que a conta é criada.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'leticia.leite@behive.net.br';
  if v_user_id is null then
    raise exception 'leticia.leite@behive.net.br ainda não existe em auth.users — crie o login no painel do Supabase (Authentication > Add user) antes de rodar esta migration.';
  end if;
end $$;

-- Linha em funcionarios — mesmo padrão da Priscila (sem gestor/setor,
-- "Calibradora Externa"); é só rótulo de exibição, não concede nenhuma
-- permissão por si só (isso vem de user_company_roles + das funções
-- abaixo). Guardado com NOT EXISTS pra rodar de novo sem duplicar se
-- precisar reexecutar.
insert into public.funcionarios (client_id, user_id, full_name, email, cargo, status)
select 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', u.id, 'Letícia Leite', 'leticia.leite@behive.net.br', 'Consultora Externa (BeHive)', 'Ativo'
from auth.users u
where u.email = 'leticia.leite@behive.net.br'
  and not exists (
    select 1 from public.funcionarios f
    where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and f.user_id = u.id
  );

-- Administrador de verdade na CTZ — mesmo permission_level de Igor/Priscila.
-- Libera sozinho: "toda a empresa" (veTodaEmpresa/todaEmpresa), criar ciclo,
-- e todo gate que checa e_admin_do_ciclo()/administrador.
insert into public.user_company_roles (user_id, client_id, permission_level)
select u.id, 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', 'administrador'
from auth.users u
where u.email = 'leticia.leite@behive.net.br'
on conflict (user_id, client_id) do update set permission_level = 'administrador';

-- Calibragem do ciclo inteiro da CTZ (Painel de Calibragem, Iniciar/
-- Finalizar Calibragem, e a nota de calibragem em si em qualquer avaliação)
-- — mesma lista fixa de Igor/Filippe Réus/Priscila, ganha o 4º nome.
create or replace function public.pode_ver_lado_calibragem(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.ciclos_avaliacao ca
      where ca.id = p_ciclo_id
        and ca.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' -- CTZ
    )
    then auth.uid() in (
      '499bc128-a5d8-4f04-9d4c-4bd8629d7894', -- Igor Costa
      '0177b153-a332-40b9-bf9e-a37820c7145c', -- Filippe Réus
      '2623efc0-fe54-45cb-89c1-96dc52baa20b', -- Priscila Santos
      (select id from auth.users where email = 'leticia.leite@behive.net.br') -- Letícia Leite
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$$;

-- Visão de administrador do Eneagrama/Autoconhecimento ("Perfis da equipe",
-- cruzamento cargo x tipo) — mesma lista de Igor/Priscila, ganha o 3º nome.
create or replace function public.pode_ver_todos_eneagrama_ctz()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() in (
    '499bc128-a5d8-4f04-9d4c-4bd8629d7894', -- igorecosta1@gmail.com
    '2623efc0-fe54-45cb-89c1-96dc52baa20b', -- priscila.santos@behive.net.br
    (select id from auth.users where email = 'leticia.leite@behive.net.br') -- leticia.leite@behive.net.br
  );
$$;
