-- Meta de cada mês por KR (29/09/2026). Até aqui o KR só tinha uma meta; as
-- planilhas da CTZ têm meta diferente por mês (ex.: Faturamento Concretize
-- 300 mil jan–mar, 325 mil abr–jun, 350 mil jul–set, 375 mil out–dez).
-- Opcional: KR sem linhas aqui continua funcionando como antes.
-- Acesso igual ao de kr_lancamentos: lê quem é da empresa do KR; grava
-- administrador/editor da empresa ou superusuário.

create table if not exists public.kr_metas_mensais (
  kr_id uuid not null references public.krs(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  meta numeric not null,
  primary key (kr_id, mes)
);

alter table public.kr_metas_mensais enable row level security;

drop policy if exists "Leitura de metas mensais" on public.kr_metas_mensais;
create policy "Leitura de metas mensais" on public.kr_metas_mensais
  for select to authenticated
  using (
    ((select p.is_superuser from public.profiles p where p.id = (select auth.uid())) = true)
    or exists (
      select 1
      from public.krs k
      join public.objetivos o on o.id = k.objetivo_id
      join public.user_company_roles ucr on ucr.client_id = o.client_id
      where k.id = kr_metas_mensais.kr_id and ucr.user_id = (select auth.uid())
    )
  );

drop policy if exists "Escrita de metas mensais" on public.kr_metas_mensais;
create policy "Escrita de metas mensais" on public.kr_metas_mensais
  for all to authenticated
  using (
    ((select p.is_superuser from public.profiles p where p.id = (select auth.uid())) = true)
    or exists (
      select 1
      from public.krs k
      join public.objetivos o on o.id = k.objetivo_id
      join public.user_company_roles ucr on ucr.client_id = o.client_id
      where k.id = kr_metas_mensais.kr_id and ucr.user_id = (select auth.uid())
        and ucr.permission_level in ('administrador'::permission_level_type, 'editor'::permission_level_type)
    )
  )
  with check (
    ((select p.is_superuser from public.profiles p where p.id = (select auth.uid())) = true)
    or exists (
      select 1
      from public.krs k
      join public.objetivos o on o.id = k.objetivo_id
      join public.user_company_roles ucr on ucr.client_id = o.client_id
      where k.id = kr_metas_mensais.kr_id and ucr.user_id = (select auth.uid())
        and ucr.permission_level in ('administrador'::permission_level_type, 'editor'::permission_level_type)
    )
  );

-- Metas mensais do Faturamento da Concretize (imagem "OKR Concretize.jpeg").
-- Soma = R$ 4.050.000, igual à meta anual do KR.
do $$
declare
  kr uuid;
  metas numeric[] := array[300000, 300000, 300000, 325000, 325000, 325000,
                           350000, 350000, 350000, 375000, 375000, 375000];
  i int;
begin
  select k.id into kr from public.krs k
  where k.client_id = 'ac4ad62b-9b88-44da-ae69-0f26ced07d06' and k.titulo ilike 'Faturamento%';
  if kr is null then
    raise notice 'KR de Faturamento não encontrado; metas mensais não carregadas.';
    return;
  end if;
  for i in 1..12 loop
    insert into public.kr_metas_mensais (kr_id, mes, meta)
    values (kr, make_date(2026, i, 1), metas[i])
    on conflict (kr_id, mes) do update set meta = excluded.meta;
  end loop;
end $$;

-- Conferência: 12 linhas, soma 4.050.000
-- select k.titulo, count(*), sum(m.meta) from public.kr_metas_mensais m
-- join public.krs k on k.id = m.kr_id group by k.titulo;
