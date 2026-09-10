-- Corrige bug preexistente achado na sessão anterior (10/09/2026, ao
-- implementar o "perfil público"): a policy de ESCRITA de
-- public.funcionarios ("Unified Write Policy for Funcionarios", já existia
-- antes de qualquer migration deste repositório, não documentada em
-- supabase/migrations/) exige permission_level = 'administrador' — ou seja,
-- um funcionário comum nunca conseguiu de fato salvar o próprio "Nome
-- completo" na aba Perfil. O update rodava sem erro (RLS só bloqueia a
-- linha, não lança exception), então o botão "Salvar" parecia funcionar mas
-- não mudava nada no banco pra ninguém que não fosse administrador.
--
-- Solução: em vez de mexer na policy de escrita da tabela (arriscado — ela é
-- usada por outras telas e, se virasse "qualquer um edita a própria linha",
-- um funcionário comum passaria a poder alterar também status, cargo,
-- gestor_id etc. da própria linha, não só o nome), uma função
-- security-definer estreita que só atualiza full_name da PRÓPRIA linha —
-- mesmo padrão já usado no resto do projeto pra escrita self-service
-- (funcionarios_perfil_publico, migration PENDENTE_20260910020000, foi por
-- esse motivo que virou tabela separada em vez de colunas em funcionarios).
create or replace function public.atualizar_meu_nome(p_full_name text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.funcionarios
  set full_name = p_full_name
  where user_id = auth.uid();
$$;
