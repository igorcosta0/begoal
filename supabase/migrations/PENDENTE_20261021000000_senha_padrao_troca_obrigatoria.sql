-- Troca obrigatória da senha padrão (pedido do Igor, 21/10/2026).
-- Quem entra com a senha padrão (a dos logins criados por SQL) vê um pop-up que não fecha até
-- trocar a senha (componente TrocaSenhaObrigatoria, no layout do (dashboard)).
--
-- A senha padrão NÃO fica no repositório: vai na tabela senha_padrao, preenchida à mão no SQL
-- Editor (script fora do Git: "Adições futuras/Senha padrao - configurar.sql"). A tabela tem RLS
-- sem nenhuma policy e sem grants: só a função abaixo (SECURITY DEFINER) lê.
-- Não depende de flag gravada: a função compara a senha atual de quem está logado, então vale para
-- quem já tem a senha padrão hoje e para de valer sozinha quando a pessoa troca.

create table if not exists public.senha_padrao (
  senha text primary key
);

alter table public.senha_padrao enable row level security;
revoke all on public.senha_padrao from anon, authenticated;

create or replace function public.usando_senha_padrao()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.senha_padrao s on u.encrypted_password = extensions.crypt(s.senha, u.encrypted_password)
    where u.id = auth.uid()
  );
$$;

revoke all on function public.usando_senha_padrao() from public, anon;
grant execute on function public.usando_senha_padrao() to authenticated;

-- DESFAZER:
-- drop function if exists public.usando_senha_padrao();
-- drop table if exists public.senha_padrao;
