-- Pedido (21/09/2026): dentro da aba "Gráficos" da Avaliação, mostrar qual foi
-- a pergunta (pilar cultural ou critério técnico) com a MAIOR e a MENOR nota
-- média, separado por vertical — hoje os gráficos só mostram médias gerais
-- (Cultural x Performance), sem granularidade de pergunta.
--
-- Devolve uma linha por (avaliação, pilar) ou (avaliação, critério técnico) —
-- a agregação por vertical/pergunta é feita no front-end (GraficosAvaliacao),
-- igual já acontece com dadosMedias ali. `nota` é a mesma cascata "nota final
-- conhecida até agora" usada em todo o resto do módulo (calibragem quando
-- existe, senão a do avaliador) — nunca a autoavaliação, que não é uma nota
-- "final" de ninguém.
--
-- Mascaramento de coluna igual a get_avaliacoes_por_ciclo (migration
-- 20260827000000_calibragem_ctz_restrita, que é a versão vigente de
-- pode_ver_lado_calibragem): nota_gestor só quando pode_ver_lado_gestor,
-- nota_calibragem só quando pode_ver_lado_calibragem. Não é SECURITY DEFINER
-- — RLS de avaliacoes_cultural/avaliacoes_tecnica (pode_acessar_avaliacao)
-- continua valendo por trás, decidindo quem vê a LINHA; esta função só
-- mascara a COLUNA de nota por cima disso, mesmo padrão de todas as outras
-- funções de leitura do módulo.
--
-- Só avaliação comum (tipo='padrao') entra — pares não tem os 4 pilares
-- completos nem critério técnico (é só Alinhamento Cultural), então misturar
-- quebraria a comparação "pergunta com maior/menor nota" dentro da mesma
-- vertical.

create or replace function public.get_detalhamento_perguntas_ciclo(p_ciclo_id uuid)
returns table (
  vertical text,
  tipo text,
  pilar smallint,
  criterio_key text,
  nota numeric
)
language sql
stable
as $func$
  select
    a.vertical,
    'cultural'::text as tipo,
    ac.pilar,
    null::text as criterio_key,
    coalesce(
      case when public.pode_ver_lado_calibragem(a.ciclo_id) then ac.nota_calibragem end,
      case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then ac.nota_gestor end
    )::numeric as nota
  from public.avaliacoes a
  join public.avaliacoes_cultural ac on ac.avaliacao_id = a.id
  where a.ciclo_id = p_ciclo_id
    and a.tipo = 'padrao'
    and a.vertical is not null

  union all

  select
    a.vertical,
    'tecnica'::text as tipo,
    null::smallint as pilar,
    t.criterio_key,
    coalesce(
      case when public.pode_ver_lado_calibragem(a.ciclo_id) then t.nota_calibragem end,
      case when public.pode_ver_lado_gestor(a.ciclo_id, a.funcionario_id, a.avaliador_id, a.revelado) then t.nota_gestor end
    )::numeric as nota
  from public.avaliacoes a
  join public.avaliacoes_tecnica t on t.avaliacao_id = a.id
  where a.ciclo_id = p_ciclo_id
    and a.tipo = 'padrao'
    and a.vertical is not null;
$func$;
