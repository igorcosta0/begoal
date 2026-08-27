-- Pedido (ago/2026): na empresa CTZ, a calibragem passa a ser visível SÓ pro
-- Igor e pro Filippe Réus — nem os demais administradores da CTZ (que hoje
-- passam por e_admin_do_ciclo, migration 20260825) enxergam mais a nota de
-- calibragem. Nas demais empresas nada muda: continua valendo
-- e_admin_do_ciclo() (qualquer administrador da empresa vê a calibragem).
--
-- Usamos os user_id fixos (em vez de comparar e-mail via auth.users) pelo
-- mesmo motivo de e_admin_do_ciclo(): auth.uid() já resolve o usuário logado
-- sem precisar ler auth.users em tempo de execução.
--
--   igorecosta1@gmail.com   -> 499bc128-a5d8-4f04-9d4c-4bd8629d7894
--   filippe.reus@ctz.eng.br -> 0177b153-a332-40b9-bf9e-a37820c7145c
--
-- security definer + search_path fixo: precisa ler ciclos_avaliacao sem cair
-- na RLS de quem está chamando (mesmo padrão de e_admin_do_ciclo), senão um
-- usuário sem visibilidade do ciclo cairia direto no fallback e perderia
-- acesso mesmo estando na lista liberada.
--
-- Aplicado direto no SQL Editor do Supabase em 27/08/2026 — este arquivo só
-- documenta/versiona o que já está em produção.

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
      '0177b153-a332-40b9-bf9e-a37820c7145c'  -- Filippe Réus
    )
    else public.e_admin_do_ciclo(p_ciclo_id)
  end;
$func$;
