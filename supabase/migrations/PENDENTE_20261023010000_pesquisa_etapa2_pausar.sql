-- Pesquisa, etapa 2 do guia do Miro (23/10/2026, "M4 Acompanhamento"), F42:
-- abrir, PAUSAR e encerrar. Pausada = ninguém responde, mas a pesquisa volta
-- a abrir do ponto em que parou (diferente de encerrada, que é o fim).
--
-- Rode este script inteiro no SQL Editor do Supabase ANTES do push do front.

alter table public.pesquisas drop constraint if exists pesquisas_status_check;
alter table public.pesquisas add constraint pesquisas_status_check
  check (status in ('rascunho', 'aberta', 'pausada', 'encerrada'));

-- Mensagem própria para pausada (a de 05/10 dizia "já foi encerrada").
create or replace function public.pesquisa_publica_responder(
  p_token text, p_email text, p_nome text, p_empresa text, p_respostas jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pesquisa public.pesquisas;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_empresa text := trim(coalesce(p_empresa, ''));
  v_itens jsonb;
begin
  select * into v_pesquisa from public.pesquisas
  where token = p_token and publico = 'externa';
  if not found or v_pesquisa.status = 'rascunho' then
    raise exception 'Pesquisa não encontrada.';
  end if;
  if v_pesquisa.status = 'pausada' then
    raise exception 'Esta pesquisa está pausada no momento. Tente de novo mais tarde.';
  end if;
  if v_pesquisa.status <> 'aberta' then
    raise exception 'Esta pesquisa já foi encerrada.';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if length(v_nome) < 3 or length(v_nome) > 200 or position(' ' in v_nome) = 0 then
    raise exception 'Informe o nome completo.';
  end if;
  if length(v_empresa) < 2 or length(v_empresa) > 200 then
    raise exception 'Informe a empresa.';
  end if;

  v_itens := public.pesquisa_validar_respostas(v_pesquisa.id, p_respostas);

  begin
    insert into public.pesquisa_respostas (pesquisa_id, respondente_email, respondente_nome, respondente_empresa, itens)
    values (v_pesquisa.id, v_email, v_nome, v_empresa, v_itens);
  exception when unique_violation then
    raise exception 'Este e-mail já respondeu esta pesquisa.';
  end;
end;
$$;

revoke all on function public.pesquisa_publica_responder(text, text, text, text, jsonb) from public;
grant execute on function public.pesquisa_publica_responder(text, text, text, text, jsonb) to anon, authenticated;

-- A interna (pesquisa_interna_responder) já barra tudo que não é 'aberta'
-- com "Esta pesquisa não está aberta.": não precisa mudar.

-- Conferência:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'pesquisas_status_check';

-- DESFAZER (só se nenhuma pesquisa estiver pausada):
-- alter table public.pesquisas drop constraint pesquisas_status_check;
-- alter table public.pesquisas add constraint pesquisas_status_check
--   check (status in ('rascunho', 'aberta', 'encerrada'));
-- (a função antiga está em PENDENTE_20261005000000_pesquisas.sql)
