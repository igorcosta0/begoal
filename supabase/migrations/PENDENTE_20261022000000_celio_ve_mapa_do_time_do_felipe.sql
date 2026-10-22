-- Pedido do Igor (22/10/2026): Célio Bitencourt (celio.bitencourt@projetosconcretize.com.br)
-- entra no lugar do Felipe Marques. Ele ainda não tem perfil de Eneagrama nem
-- liderado no organograma, mas o Mapa 2 ("Mapa do time") do Autoconhecimento
-- deve mostrar para ele o time do Felipe: o resumo do time e a conversa sobre
-- cada liderado direto do Felipe.
--
-- Como: coluna nova funcionarios.ve_time_de (o cadastro de quem tem o time
-- espelhado). Vale SÓ para o Autoconhecimento: as 4 funções do Mapa 2 abaixo
-- passam a considerar "liderado direto meu OU de quem eu espelho". O
-- organograma (gestor_id) e a Avaliação (e_gestor_do_funcionario) não mudam.
-- O tipo do Felipe não é usado: a conversa considera o perfil do líder pela
-- linha do próprio Célio (sem perfil, segue sem essa camada).
--
-- Para desfazer: update public.funcionarios set ve_time_de = null where ve_time_de is not null;
-- Para trocar quando o Felipe sair: basta passar os liderados para o Célio no
-- organograma (gestor_id) e zerar ve_time_de.
--
-- Pode rodar de novo.

alter table public.funcionarios
  add column if not exists ve_time_de uuid references public.funcionarios(id) on delete set null;

update public.funcionarios celio
set ve_time_de = felipe.id
from public.funcionarios felipe
where celio.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
  and felipe.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06'
  and lower(celio.email) = 'celio.bitencourt@projetosconcretize.com.br'
  and lower(felipe.email) = 'felipe.marques@projetosconcretize.com.br';

-- Cadastros cujo time a pessoa logada vê no Mapa 2: os próprios e os espelhados.
create or replace function public.meus_cadastros_de_lider()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.funcionarios where user_id = auth.uid()
  union
  select ve_time_de from public.funcionarios where user_id = auth.uid() and ve_time_de is not null;
$$;

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
  where alvo.gestor_id in (select public.meus_cadastros_de_lider());
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
    and alvo.gestor_id in (select public.meus_cadastros_de_lider());
$$;

-- Conferência: deve voltar 1 linha, com user_id preenchido (sem user_id o
-- Célio não é reconhecido ao entrar) e ve_time_de = cadastro do Felipe.
select celio.full_name, celio.user_id, celio.ve_time_de, felipe.full_name as ve_time_de_nome,
       (select count(*) from public.funcionarios l where l.gestor_id = felipe.id) as liderados_do_felipe
from public.funcionarios celio
left join public.funcionarios felipe on felipe.id = celio.ve_time_de
where lower(celio.email) = 'celio.bitencourt@projetosconcretize.com.br';
