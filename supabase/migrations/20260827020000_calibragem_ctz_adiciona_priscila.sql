-- Pedido (ago/2026): Priscila Santos entra na calibragem da CTZ junto com
-- Igor e Filippe Réus — ela é administradora de verdade da CTZ (já bate em
-- e_admin_do_ciclo), então só falta essa função: pode_acessar_avaliacao()/
-- avaliacoes_select/avaliacoes_update (migration 20260827010000) já liberam
-- pra ela via e_admin_do_ciclo, não precisam de mudança nenhuma — só o
-- Filippe (que não é admin) tinha precisado daquele reforço.

create or replace function public.pode_ver_lado_calibragem(p_ciclo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
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
      '2623efc0-fe54-45cb-89c1-96dc52baa20b'  -- Priscila Santos
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$func$;
