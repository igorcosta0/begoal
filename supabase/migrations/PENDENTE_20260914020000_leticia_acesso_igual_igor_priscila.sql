-- Pedido do Igor (14/09/2026, ampliado em 16/09/2026): Letícia Leite (autora
-- do "Programa Foco" da BeHive, fonte de todo o módulo de
-- Autoconhecimento/Eneagrama) ganha um LOGIN de verdade e o mesmo acesso de
-- Igor e Priscila.
--
-- Mudança de 16/09 em relação à versão original desta migration (14/09):
-- (1) e-mail definitivo é leticialeite2003@yahoo.com.br, não mais
--     leticia.leite@behive.net.br (que nunca chegou a existir em auth.users
--     — confirmado por SQL direto antes de escrever isto; as 3 referências a
--     esse e-mail no front-end, em utils.ts e avaliacao/page.tsx, foram
--     atualizadas pro e-mail novo no mesmo commit desta migration);
-- (2) "mesmo acesso de Igor/Priscila" passou a significar TODAS as empresas
--     da plataforma (11 hoje), não só a CTZ — Igor e Priscila são
--     administrador em toda empresa via user_company_roles (o time BeHive
--     administra a plataforma inteira), confirmado com o Igor antes de
--     aplicar; a CTZ continua sendo a única com calibragem/Eneagrama, então
--     as permissões especiais abaixo continuam restritas a ela.
--
-- PASSO 0 (rodar só se leticialeite2003@yahoo.com.br ainda não existir em
-- auth.users): cria o login com senha aleatória — ninguém fica sabendo a
-- senha, incluindo quem roda este script. Ela define a própria senha pelo
-- link de "Esqueci minha senha" da tela de login (supabase.auth.
-- resetPasswordForEmail, já implementado em reset-senha/page.tsx), usando o
-- e-mail leticialeite2003@yahoo.com.br. "Auto Confirm" já vem embutido
-- (email_confirmed_at preenchido), então ela não precisa confirmar e-mail
-- antes do primeiro reset de senha.
do $$
declare
  v_new_id uuid;
begin
  if exists (select 1 from auth.users where email = 'leticialeite2003@yahoo.com.br') then
    raise notice 'leticialeite2003@yahoo.com.br já existe em auth.users — pulando criação de login.';
  else
    v_new_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_new_id,
      'authenticated',
      'authenticated',
      'leticialeite2003@yahoo.com.br',
      crypt(gen_random_uuid()::text, gen_salt('bf')), -- senha aleatória e descartada, ninguém usa: ela define a própria via "Esqueci minha senha"
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Letícia Leite"}',
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_new_id,
      v_new_id::text,
      jsonb_build_object('sub', v_new_id::text, 'email', 'leticialeite2003@yahoo.com.br', 'email_verified', true),
      'email',
      now(), now(), now()
    );
  end if;
end $$;

-- profiles.email/full_name (populados por trigger só com full_name, e olhe
-- lá) — preenchidos à parte pra bater com o padrão já usado no perfil da
-- Priscila e pro painel de admin (getUsersByEmpresa, admin.ts) mostrar o
-- e-mail dela corretamente.
update public.profiles
set email = 'leticialeite2003@yahoo.com.br', full_name = 'Letícia Leite'
where id = (select id from auth.users where email = 'leticialeite2003@yahoo.com.br');

-- Linha em funcionarios, só na CTZ — mesmo padrão da Priscila (sem
-- gestor/setor, "Consultora Externa"); é só rótulo de exibição, não concede
-- nenhuma permissão por si só (isso vem de user_company_roles + das funções
-- abaixo). Guardado com NOT EXISTS pra rodar de novo sem duplicar.
insert into public.funcionarios (client_id, user_id, full_name, email, cargo, status)
select 'ac4ad62b-9b88-44da-ae69-0f26ced07d06', u.id, 'Letícia Leite', 'leticialeite2003@yahoo.com.br', 'Consultora Externa (BeHive)', 'Ativo'
from auth.users u
where u.email = 'leticialeite2003@yahoo.com.br'
  and not exists (
    select 1 from public.funcionarios f
    where f.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and f.user_id = u.id
  );

-- Administrador de verdade em TODA empresa da plataforma — mesmo padrão de
-- Igor/Priscila (cross join com public.clients em vez de listar client_id
-- um a um, pra cobrir empresa nova que apareça depois sem precisar de outra
-- migration). is_calibrador só true na CTZ, igual à linha da Priscila lá.
insert into public.user_company_roles (user_id, client_id, permission_level, is_calibrador)
select u.id, c.id, 'administrador', (c.id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06')
from auth.users u
cross join public.clients c
where u.email = 'leticialeite2003@yahoo.com.br'
on conflict (user_id, client_id) do update
  set permission_level = excluded.permission_level,
      is_calibrador = excluded.is_calibrador;

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
      (select id from auth.users where email = 'leticialeite2003@yahoo.com.br') -- Letícia Leite
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
    (select id from auth.users where email = 'leticialeite2003@yahoo.com.br') -- leticialeite2003@yahoo.com.br
  );
$$;
