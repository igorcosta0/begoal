-- Pedido da Priscila (30/10/2026), confirmado pelo Igor:
--
-- 1) Célio Bitencourt (celio.bitencourt@projetosconcretize.com.br) com o
--    mesmo acesso dos outros líderes da CTZ (Felipe Marques, Graciela, Felipe
--    Bet Ross, Finato): permission_level 'gestor' + is_calibrador na CTZ e
--    "calibrador restrito" (calibra só os próprios liderados, pelo gestor_id).
--    Ele estava como 'visualizador', sem calibrador. No front, o e-mail entra
--    na lista de souCalibradorRestrito (avaliacao/page.tsx).
--
-- 2) Desligado não aparece mais no Mapa do time do Autoconhecimento: as
--    funções do Mapa 2 passam a ignorar funcionarios.status = 'Desligado'
--    (a lista de liderados, o resumo do time, o tipo do liderado e o
--    "sou líder de alguém").
--
-- Para desfazer o item 1:
--   update public.user_company_roles set permission_level = 'visualizador', is_calibrador = false
--   where user_id = '4e4e267f-769d-47d9-9e35-f2d44de2933a'
--     and client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06';
--   e rodar de novo a e_calibrador_restrito da migration
--   PENDENTE_20260908010000_calibragem_finato_restrito.sql.
--
-- Pode rodar de novo.

update public.user_company_roles
set permission_level = 'gestor', is_calibrador = true
where user_id = '4e4e267f-769d-47d9-9e35-f2d44de2933a' -- Célio Bitencourt
  and client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06';

create or replace function public.e_calibrador_restrito(p_funcionario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    auth.uid() in (
      '203e4429-b9c7-451f-bc00-cc42f6e713f4', -- Graciela Borges Hoepers
      '05d3db6c-ef45-40af-9748-2f02b6f1efc4', -- Felipe Marques Santos
      '9c6dfb0a-c7d5-4a6a-8214-a6f22aea74e8', -- Felipe Bet Ross
      '09f58ad9-89dc-444e-8448-88554d90f26e', -- Filipe Bossoni Finato
      '4e4e267f-769d-47d9-9e35-f2d44de2933a'  -- Célio Bitencourt
    )
    and public.e_gestor_do_funcionario(p_funcionario_id);
$func$;

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
    where liderado.gestor_id in (select public.meus_cadastros_de_lider())
      and liderado.status is distinct from 'Desligado'
  );
$$;

create or replace function public.listar_meus_liderados_com_perfil_mapeado()
returns table(funcionario_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select alvo.id, alvo.full_name
  from public.funcionarios alvo
  join public.funcionarios_eneagrama fe on fe.funcionario_id = alvo.id
  where alvo.gestor_id in (select public.meus_cadastros_de_lider())
    and alvo.status is distinct from 'Desligado'
  order by alvo.full_name;
$$;

create or replace function public.resumo_time_liderado()
returns table(instintivo int, emocional int, racional int, total_liderados int, total_mapeados int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where fe.tipo in (8, 9, 1))::int as instintivo,
    count(*) filter (where fe.tipo in (2, 3, 4))::int as emocional,
    count(*) filter (where fe.tipo in (5, 6, 7))::int as racional,
    count(alvo.id)::int as total_liderados,
    count(fe.tipo)::int as total_mapeados
  from public.funcionarios alvo
  left join public.funcionarios_eneagrama fe on fe.funcionario_id = alvo.id
  where alvo.gestor_id in (select public.meus_cadastros_de_lider())
    and alvo.status is distinct from 'Desligado';
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
  join public.funcionarios alvo on alvo.id = fe.funcionario_id
  where fe.funcionario_id = p_funcionario_alvo_id
    and alvo.gestor_id in (select public.meus_cadastros_de_lider())
    and alvo.status is distinct from 'Desligado';
$$;

-- Conferência: Célio como gestor + calibrador.
select f.full_name, ucr.permission_level, ucr.is_calibrador
from public.funcionarios f
join public.user_company_roles ucr on ucr.user_id = f.user_id and ucr.client_id = f.client_id
where lower(f.email) = 'celio.bitencourt@projetosconcretize.com.br';
