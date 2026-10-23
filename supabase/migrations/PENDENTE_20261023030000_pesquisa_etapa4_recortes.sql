-- Pesquisa, etapa 4 do guia do Miro (23/10/2026, "M5 Resultados": filtros,
-- relatório, comparativos e IA). Regra do Igor: um recorte só aparece com 5
-- respostas ou mais. A regra vale AQUI no banco, não só na tela:
--   * a coluna pesquisa_respostas.segmento deixa de ser legível pela API
--     (nem o administrador lê o segmento linha a linha);
--   * os recortes passam por duas funções (só administrador da empresa):
--       pesquisa_respostas_filtradas: as respostas de um filtro, ou nada se o
--         recorte tiver menos de 5 respostas OU se o que sobra fora dele tiver
--         de 1 a 4 (senão daria para deduzir o grupo pequeno pela diferença
--         com o total);
--       pesquisa_metricas_por_segmento: média/NPS de uma pergunta por área,
--         cargo etc. Grupos com menos de 5 viram "Outros"; se "Outros" ficar
--         com 1 a 4, o menor grupo visível entra nele até passar de 5;
--   * pesquisa_opcoes_filtro: os valores de cada campo, com quantas respostas.
--
-- Rode este script inteiro no SQL Editor do Supabase ANTES do push do front.

-- ── Fecha o segmento linha a linha ───────────────────────────────────────────

revoke select on public.pesquisa_respostas from anon, authenticated;
grant select (id, pesquisa_id, respondida_em, respondente_email, respondente_nome, respondente_empresa, itens)
  on public.pesquisa_respostas to authenticated;

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Filtro: {"segmento": {"setor": ["Obras"], ...}, "respostas": {"<pergunta_id>": ["opção", ...]}}.
-- Dentro de um campo vale qualquer valor marcado; entre campos, todos.
create or replace function public.pesquisa_resposta_no_filtro(p_segmento jsonb, p_itens jsonb, p_filtro jsonb)
returns boolean
language sql
immutable
as $$
  select not exists (
      select 1 from jsonb_each(case when jsonb_typeof(p_filtro -> 'segmento') = 'object' then p_filtro -> 'segmento' else '{}'::jsonb end) f
      where jsonb_typeof(f.value) = 'array' and jsonb_array_length(f.value) > 0
        and not (f.value ? coalesce(p_segmento ->> f.key, ''))
    )
    and not exists (
      select 1 from jsonb_each(case when jsonb_typeof(p_filtro -> 'respostas') = 'object' then p_filtro -> 'respostas' else '{}'::jsonb end) f
      where jsonb_typeof(f.value) = 'array' and jsonb_array_length(f.value) > 0
        and not (
          case jsonb_typeof(p_itens -> f.key)
            when 'array' then (p_itens -> f.key) ?| array(select jsonb_array_elements_text(f.value))
            when 'string' then f.value ? (p_itens ->> f.key)
            else false
          end
        )
    );
$$;

create or replace function public.pesquisa_filtro_vazio(p_filtro jsonb)
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
    from (select value from jsonb_each(case when jsonb_typeof(p_filtro -> 'segmento') = 'object' then p_filtro -> 'segmento' else '{}'::jsonb end)
          union all
          select value from jsonb_each(case when jsonb_typeof(p_filtro -> 'respostas') = 'object' then p_filtro -> 'respostas' else '{}'::jsonb end)) x
    where jsonb_typeof(x.value) = 'array' and jsonb_array_length(x.value) > 0
  );
$$;

create or replace function public.pesquisa_exigir_admin(p_pesquisa_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select client_id into v_client from public.pesquisas where id = p_pesquisa_id;
  if v_client is null or not public.pesquisa_sou_admin(v_client) then
    raise exception 'Sem permissão para ver os resultados desta pesquisa.';
  end if;
end;
$$;

-- ── Respostas de um recorte ──────────────────────────────────────────────────

create or replace function public.pesquisa_respostas_filtradas(p_pesquisa_id uuid, p_filtro jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total int;
  v_filtradas int;
  v_lista jsonb;
begin
  perform public.pesquisa_exigir_admin(p_pesquisa_id);

  select count(*) into v_total from public.pesquisa_respostas where pesquisa_id = p_pesquisa_id;

  select count(*),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'respondida_em', r.respondida_em, 'respondente_email', r.respondente_email,
           'respondente_nome', r.respondente_nome, 'respondente_empresa', r.respondente_empresa, 'itens', r.itens
         ) order by r.respondida_em desc, r.id), '[]'::jsonb)
    into v_filtradas, v_lista
  from public.pesquisa_respostas r
  where r.pesquisa_id = p_pesquisa_id
    and public.pesquisa_resposta_no_filtro(r.segmento, r.itens, p_filtro);

  if not public.pesquisa_filtro_vazio(p_filtro)
     and (v_filtradas < 5 or (v_total - v_filtradas) between 1 and 4) then
    -- Não diz quantas são (nem o que sobra): só que o recorte é pequeno demais.
    return jsonb_build_object('oculto', true, 'total', null, 'respostas', '[]'::jsonb);
  end if;

  return jsonb_build_object('oculto', false, 'total', v_filtradas, 'respostas', v_lista);
end;
$$;

-- ── Valores de cada campo, para montar os filtros ────────────────────────────

create or replace function public.pesquisa_opcoes_filtro(p_pesquisa_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resultado jsonb := '{}'::jsonb;
  v_campo text;
begin
  perform public.pesquisa_exigir_admin(p_pesquisa_id);
  foreach v_campo in array array['setor', 'cargo', 'tempo_empresa', 'estado', 'cliente'] loop
    v_resultado := v_resultado || jsonb_build_object(v_campo, coalesce((
      select jsonb_agg(jsonb_build_object('valor', valor, 'n', n) order by valor)
      from (
        select r.segmento ->> v_campo as valor, count(*) as n
        from public.pesquisa_respostas r
        where r.pesquisa_id = p_pesquisa_id and r.segmento ? v_campo
        group by 1
      ) g
    ), '[]'::jsonb));
  end loop;
  return v_resultado;
end;
$$;

-- ── Métrica de uma pergunta por segmento (tendência por área, F53) ───────────

create or replace function public.pesquisa_metricas_por_segmento(p_pesquisa_id uuid, p_pergunta_id uuid, p_campo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tipo text;
  g record;
  v_visiveis jsonb := '[]'::jsonb;
  v_outros_n int := 0;
  v_outros_soma numeric := 0;
  v_outros_prom int := 0;
  v_outros_det int := 0;
  v_menor jsonb;
  v_lista jsonb;
begin
  perform public.pesquisa_exigir_admin(p_pesquisa_id);
  if p_campo not in ('setor', 'cargo', 'tempo_empresa', 'estado', 'cliente') then
    raise exception 'Campo inválido.';
  end if;
  select tipo into v_tipo from public.pesquisa_perguntas where id = p_pergunta_id and pesquisa_id = p_pesquisa_id;
  if v_tipo is null or v_tipo not in ('escala_0_10', 'nota_1_5', 'nps') then
    raise exception 'Escolha uma pergunta de nota.';
  end if;

  -- Grupos por valor do campo (quem não tem o campo fica em "Outros").
  for g in
    select coalesce(r.segmento ->> p_campo, '') as valor,
           count(*) as n,
           sum((r.itens ->> p_pergunta_id::text)::numeric) as soma,
           count(*) filter (where (r.itens ->> p_pergunta_id::text)::numeric >= 9) as prom,
           count(*) filter (where (r.itens ->> p_pergunta_id::text)::numeric <= 6) as det
    from public.pesquisa_respostas r
    where r.pesquisa_id = p_pesquisa_id and jsonb_typeof(r.itens -> p_pergunta_id::text) = 'number'
    group by 1
    order by 2
  loop
    if g.valor = '' or g.n < 5 then
      v_outros_n := v_outros_n + g.n; v_outros_soma := v_outros_soma + g.soma;
      v_outros_prom := v_outros_prom + g.prom; v_outros_det := v_outros_det + g.det;
    else
      v_visiveis := v_visiveis || jsonb_build_array(jsonb_build_object('valor', g.valor, 'n', g.n, 'soma', g.soma, 'prom', g.prom, 'det', g.det));
    end if;
  end loop;

  -- "Outros" com 1 a 4 respostas: junta o menor grupo visível até passar de 5.
  while v_outros_n between 1 and 4 and jsonb_array_length(v_visiveis) > 0 loop
    select x into v_menor from jsonb_array_elements(v_visiveis) x order by (x ->> 'n')::int, x ->> 'valor' limit 1;
    v_outros_n := v_outros_n + (v_menor ->> 'n')::int; v_outros_soma := v_outros_soma + (v_menor ->> 'soma')::numeric;
    v_outros_prom := v_outros_prom + (v_menor ->> 'prom')::int; v_outros_det := v_outros_det + (v_menor ->> 'det')::int;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_visiveis from jsonb_array_elements(v_visiveis) x where x <> v_menor;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'valor', x ->> 'valor', 'n', (x ->> 'n')::int,
           'media', round((x ->> 'soma')::numeric / (x ->> 'n')::int, 2),
           'nps', case when v_tipo = 'nps' then round(((x ->> 'prom')::int - (x ->> 'det')::int) * 100.0 / (x ->> 'n')::int) end
         ) order by x ->> 'valor'), '[]'::jsonb)
    into v_lista
  from jsonb_array_elements(v_visiveis) x;

  if v_outros_n >= 5 then
    v_lista := v_lista || jsonb_build_array(jsonb_build_object(
      'valor', null, 'n', v_outros_n, 'media', round(v_outros_soma / v_outros_n, 2),
      'nps', case when v_tipo = 'nps' then round((v_outros_prom - v_outros_det) * 100.0 / v_outros_n) end
    ));
  end if;
  return v_lista;
end;
$$;

-- ── Permissões ───────────────────────────────────────────────────────────────

revoke all on function public.pesquisa_resposta_no_filtro(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.pesquisa_filtro_vazio(jsonb) from public, anon;
revoke all on function public.pesquisa_exigir_admin(uuid) from public, anon, authenticated;
revoke all on function public.pesquisa_respostas_filtradas(uuid, jsonb) from public, anon;
revoke all on function public.pesquisa_opcoes_filtro(uuid) from public, anon;
revoke all on function public.pesquisa_metricas_por_segmento(uuid, uuid, text) from public, anon;
grant execute on function public.pesquisa_resposta_no_filtro(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.pesquisa_filtro_vazio(jsonb) to authenticated;
grant execute on function public.pesquisa_respostas_filtradas(uuid, jsonb) to authenticated;
grant execute on function public.pesquisa_opcoes_filtro(uuid) to authenticated;
grant execute on function public.pesquisa_metricas_por_segmento(uuid, uuid, text) to authenticated;

-- Conferência:
-- select privilege_type, column_name from information_schema.column_privileges
--  where table_name = 'pesquisa_respostas' and grantee = 'authenticated' order by 2;  -- sem "segmento"

-- DESFAZER:
-- grant select on public.pesquisa_respostas to authenticated;
-- drop function public.pesquisa_metricas_por_segmento(uuid, uuid, text);
-- drop function public.pesquisa_opcoes_filtro(uuid);
-- drop function public.pesquisa_respostas_filtradas(uuid, jsonb);
-- drop function public.pesquisa_exigir_admin(uuid);
-- drop function public.pesquisa_filtro_vazio(jsonb);
-- drop function public.pesquisa_resposta_no_filtro(jsonb, jsonb, jsonb);
