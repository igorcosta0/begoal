-- Pedido do Igor (17/09/2026): Eduardo Rigotto (login já existente,
-- eduardo.rigotto@behive.net.br, user_id 829734f9-c38d-4922-adc0-1fa8cf3631d1)
-- ganha o mesmo acesso de Igor e Priscila — mesmo pacote já dado pra Letícia
-- Leite em 14-16/09/2026 (ver PENDENTE_20260914020000).
--
-- Diferente da Letícia, ele já tinha login e já era administrador em 8 das
-- 11 empresas (confirmado por SQL direto antes de escrever isto: BeHive,
-- Debbuger, Moedense, OHB Agencia, OHB CadaverLab, OHB Construtora, OHB
-- Legado, Terminal de Cargas de Sarzedo) — faltavam só CTZ e Hedgehog. Esta
-- migration usa o mesmo cross join com public.clients (cobre empresa nova
-- que apareça depois) em vez de listar as 2 que faltam, pra ficar
-- exatamente no mesmo padrão das migrations de Igor/Priscila/Letícia.

-- Administrador de verdade em TODA empresa da plataforma. is_calibrador só
-- true na CTZ, igual Priscila/Letícia.
insert into public.user_company_roles (user_id, client_id, permission_level, is_calibrador)
select u.id, c.id, 'administrador', (c.id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06')
from auth.users u
cross join public.clients c
where u.email = 'eduardo.rigotto@behive.net.br'
on conflict (user_id, client_id) do update
  set permission_level = excluded.permission_level,
      is_calibrador = excluded.is_calibrador;

-- Linha em funcionarios na CTZ (ele não tinha nenhuma lá) — mesmo padrão da
-- Priscila/Letícia (sem gestor/setor, só rótulo de exibição; não concede
-- permissão por si só). Guardado com NOT EXISTS pra rodar de novo sem duplicar.
insert into public.funcionarios (client_id, user_id, full_name, email, cargo, status)
select 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', u.id, 'Eduardo Rigotto', 'eduardo.rigotto@behive.net.br', 'Consultor Externo (BeHive)', 'Ativo'
from auth.users u
where u.email = 'eduardo.rigotto@behive.net.br'
  and not exists (
    select 1 from public.funcionarios f
    where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and f.user_id = u.id
  );

-- Calibragem do ciclo inteiro da CTZ — mesma lista fixa de Igor/Filippe
-- Réus/Priscila/Letícia, ganha o 5º nome.
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
      (select id from auth.users where email = 'leticialeite2003@yahoo.com.br'), -- Letícia Leite
      '829734f9-c38d-4922-adc0-1fa8cf3631d1' -- Eduardo Rigotto
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$$;

-- Visão de administrador do Eneagrama/Autoconhecimento ("Perfis da equipe",
-- cruzamento cargo x tipo) — mesma lista, ganha o 4º nome.
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
    (select id from auth.users where email = 'leticialeite2003@yahoo.com.br'), -- leticialeite2003@yahoo.com.br
    '829734f9-c38d-4922-adc0-1fa8cf3631d1' -- eduardo.rigotto@behive.net.br
  );
$$;
