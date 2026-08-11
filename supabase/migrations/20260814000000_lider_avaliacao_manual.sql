-- Troca a detecção de "líder" por heurística (cargo contém "líder" OU tem
-- liderado no organograma) por uma marcação manual e explícita. A heurística
-- pegava gente que não devia (ex.: CEO, cujo cargo também cita "líder") e
-- ficava sempre um passo atrás de quem realmente lidera uma vertical.
--
-- Agora é o administrador quem liga/desliga isso pessoa a pessoa na tela
-- "Gerenciar Líderes" (dentro de Avaliação). É essa marcação que decide quem:
--   - pode criar ciclo de avaliação (junto com administrador);
--   - vê e usa o botão "Avaliação de Pares";
--   - entra como candidato no sorteio de pares.

alter table public.funcionarios
  add column if not exists lider_avaliacao boolean not null default false;

create or replace function public.e_lider_da_empresa(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.funcionarios eu
    where eu.user_id = auth.uid()
      and eu.client_id = p_client_id
      and eu.lider_avaliacao = true
  );
$$;
