-- Pedido (28/08/2026): Felipe Marques Santos entra na calibragem da CTZ
-- junto com Igor, Filippe Réus e Priscila Santos. Ele é só 'gestor' (não
-- administrador de verdade da CTZ, ver e_admin_do_ciclo) e não estava na
-- lista fixa de pode_ver_lado_calibragem, então precisa do mesmo reforço que
-- o Filippe já tinha recebido (migration 20260827010000_calibragem_ctz_acesso_filippe):
-- sem isso, o Painel de Calibragem carregaria vazio pra ele nas avaliações de
-- quem ele não lidera diretamente, e ele não veria a aba/botões de
-- Iniciar/Finalizar Calibragem.
--
-- Não confundir com "Felipe Bortolozzo" (Coordenador de TI, liderado dele) ou
-- com "Felipe Bet Ross" (outra pessoa, sem relação) — este é Felipe Marques
-- Santos, Líder de Operações, user_id 05d3db6c-ef45-40af-9748-2f02b6f1efc4.

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
      '2623efc0-fe54-45cb-89c1-96dc52baa20b', -- Priscila Santos
      '05d3db6c-ef45-40af-9748-2f02b6f1efc4'  -- Felipe Marques Santos
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$func$;
