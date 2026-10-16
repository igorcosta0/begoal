-- Pedido do Igor (16/10/2026): Sandra Melo (sandra.melo@behive.net.br) ganha
-- login e o mesmo acesso de Igor e Priscila — mesmo pacote da Letícia Leite
-- (PENDENTE_20260914020000) e do Eduardo Rigotto (PENDENTE_20260917000000):
-- administrador em todas as empresas, calibragem do ciclo inteiro da CTZ e
-- visão de administrador do Autoconhecimento.
--
-- Senha inicial: a senha padrão de sempre (a mesma do login do Lucas Rosa, 14/10), fora do repositório.
-- O "Esqueci minha senha" depende do SMTP padrão do Supabase, que não entrega
-- para quem não é da equipe do projeto — por isso a senha conhecida.
-- Ela deve trocar a senha na aba Perfil no primeiro acesso.
--
-- Pode rodar de novo: se o login já existir, só completa os acessos.

-- PASSO 1: login (já confirmado)
do $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := 'sandra.melo@behive.net.br';
begin
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise notice '% ja existe em auth.users: pulando criacao do login', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')), -- no banco foi usada a senha padrao combinada com o Igor (fora do repositorio),
    now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sandra Melo"}',
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', null, now(), now());
end $$;

-- o gatilho on_auth_user_created cria a linha de profiles; completa e-mail e nome
update public.profiles
set email = 'sandra.melo@behive.net.br', full_name = 'Sandra Melo'
where id = (select id from auth.users where lower(email) = 'sandra.melo@behive.net.br');

-- PASSO 2: administrador em TODA empresa da plataforma (inclui os 6 negócios
-- da BMG). is_calibrador só true na CTZ, igual Priscila/Letícia/Eduardo.
-- Empresa criada depois NÃO herda isto: precisa de um insert próprio.
insert into public.user_company_roles (user_id, client_id, permission_level, is_calibrador)
select u.id, c.id, 'administrador', (c.id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06')
from auth.users u
cross join public.clients c
where lower(u.email) = 'sandra.melo@behive.net.br'
on conflict (user_id, client_id) do update
  set permission_level = excluded.permission_level,
      is_calibrador = excluded.is_calibrador;

-- PASSO 3: cadastro em funcionarios na CTZ (só rótulo de exibição, igual
-- Priscila/Letícia/Eduardo; não concede permissão por si só).
insert into public.funcionarios (client_id, user_id, full_name, email, cargo, status)
select 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', u.id, 'Sandra Melo', 'sandra.melo@behive.net.br', 'Consultora Externa (BeHive)', 'Ativo'
from auth.users u
where lower(u.email) = 'sandra.melo@behive.net.br'
  and not exists (
    select 1 from public.funcionarios f
    where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and f.user_id = u.id
  );

-- PASSO 4: calibragem do ciclo inteiro da CTZ — lista fixa ganha o 6º nome.
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
      '829734f9-c38d-4922-adc0-1fa8cf3631d1', -- Eduardo Rigotto
      (select id from auth.users where email = 'sandra.melo@behive.net.br') -- Sandra Melo
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$$;

-- PASSO 5: visão de administrador do Autoconhecimento — lista ganha o 5º nome.
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
    '829734f9-c38d-4922-adc0-1fa8cf3631d1', -- eduardo.rigotto@behive.net.br
    (select id from auth.users where email = 'sandra.melo@behive.net.br') -- sandra.melo@behive.net.br
  );
$$;

-- Conferência
select u.email,
       (select count(*) from public.user_company_roles r where r.user_id = u.id and r.permission_level = 'administrador') as empresas_admin,
       (select count(*) from public.clients) as total_empresas,
       (select count(*) from public.funcionarios f where f.user_id = u.id) as cadastros
from auth.users u
where lower(u.email) = 'sandra.melo@behive.net.br';
