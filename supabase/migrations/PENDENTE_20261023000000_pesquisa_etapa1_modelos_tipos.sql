-- Pesquisa, etapa 1 do guia do Miro (23/10/2026, "M2 Pesquisas"):
--   * dois tipos de resposta novos: escala de 0 a 10 (F19) e múltipla escolha
--     com várias opções (F23). O guia lista só cinco tipos (escala 0–10, NPS,
--     aberta, múltipla com uma e com várias opções). A nota de 1 a 5 deixa de
--     ser oferecida na tela, mas continua aceita aqui para não quebrar as
--     pesquisas que já usam;
--   * pesquisas.modelo: de qual modelo a pesquisa nasceu (Clima, Pulse, NPS,
--     Satisfação, Cultura ou personalizada). Serve para os comparativos "entre
--     pesquisas do mesmo tipo" (F54) das próximas etapas.
--
-- Rode este script inteiro no SQL Editor do Supabase ANTES do push do front
-- (o front passa a ler a coluna `modelo`).

-- ── Tipos de pergunta ────────────────────────────────────────────────────────

alter table public.pesquisa_perguntas drop constraint if exists pesquisa_perguntas_tipo_check;
alter table public.pesquisa_perguntas add constraint pesquisa_perguntas_tipo_check
  check (tipo in ('escala_0_10', 'nps', 'texto', 'multipla', 'multipla_varias', 'nota_1_5'));

-- ── Modelo de origem ─────────────────────────────────────────────────────────

alter table public.pesquisas add column if not exists modelo text not null default 'personalizada';
alter table public.pesquisas drop constraint if exists pesquisas_modelo_check;
alter table public.pesquisas add constraint pesquisas_modelo_check
  check (modelo in ('clima', 'pulse', 'nps', 'satisfacao', 'cultura', 'personalizada'));

-- ── Validação das respostas (substitui a da migration de 05/10) ──────────────
-- Múltipla com várias opções chega como lista de textos: cada um precisa
-- estar entre as opções, sem repetir. Lista vazia conta como "sem resposta".

create or replace function public.pesquisa_validar_respostas(p_pesquisa_id uuid, p_respostas jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q record;
  v jsonb;
  n numeric;
  t text;
  item jsonb;
  escolhidas jsonb;
  resultado jsonb := '{}'::jsonb;
begin
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas.';
  end if;

  for q in
    select * from public.pesquisa_perguntas where pesquisa_id = p_pesquisa_id order by ordem
  loop
    v := p_respostas -> q.id::text;

    if v is null or jsonb_typeof(v) = 'null'
       or (jsonb_typeof(v) = 'string' and length(trim(v #>> '{}')) = 0)
       or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0) then
      if q.obrigatoria then
        raise exception 'Responda a pergunta: %', q.enunciado;
      end if;
      continue;
    end if;

    if q.tipo in ('nota_1_5', 'nps', 'escala_0_10') then
      if jsonb_typeof(v) <> 'number' then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      n := (v #>> '{}')::numeric;
      if n <> trunc(n)
         or (q.tipo = 'nota_1_5' and (n < 1 or n > 5))
         or (q.tipo in ('nps', 'escala_0_10') and (n < 0 or n > 10)) then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, n::int);
    elsif q.tipo = 'multipla' then
      t := v #>> '{}';
      if jsonb_typeof(v) <> 'string' or not (q.opcoes ? t) then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, t);
    elsif q.tipo = 'multipla_varias' then
      if jsonb_typeof(v) <> 'array' then
        raise exception 'Resposta inválida na pergunta: %', q.enunciado;
      end if;
      escolhidas := '[]'::jsonb;
      for item in select * from jsonb_array_elements(v) loop
        t := item #>> '{}';
        if jsonb_typeof(item) <> 'string' or not (q.opcoes ? t) or escolhidas ? t then
          raise exception 'Resposta inválida na pergunta: %', q.enunciado;
        end if;
        escolhidas := escolhidas || to_jsonb(t);
      end loop;
      resultado := resultado || jsonb_build_object(q.id::text, escolhidas);
    else
      t := trim(v #>> '{}');
      if jsonb_typeof(v) <> 'string' or length(t) > 2000 then
        raise exception 'Resposta muito longa na pergunta: % (máximo 2000 caracteres)', q.enunciado;
      end if;
      resultado := resultado || jsonb_build_object(q.id::text, t);
    end if;
  end loop;

  return resultado;
end;
$$;

revoke all on function public.pesquisa_validar_respostas(uuid, jsonb) from public, anon, authenticated;

-- Conferência:
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid in ('public.pesquisas'::regclass, 'public.pesquisa_perguntas'::regclass) and contype = 'c';
-- select modelo, count(*) from public.pesquisas group by 1;

-- DESFAZER (só se nenhuma pergunta nova usar os tipos novos):
-- alter table public.pesquisa_perguntas drop constraint pesquisa_perguntas_tipo_check;
-- alter table public.pesquisa_perguntas add constraint pesquisa_perguntas_tipo_check
--   check (tipo in ('nota_1_5', 'nps', 'multipla', 'texto'));
-- alter table public.pesquisas drop column modelo;
-- (a função de validação antiga está em PENDENTE_20261005000000_pesquisas.sql)
