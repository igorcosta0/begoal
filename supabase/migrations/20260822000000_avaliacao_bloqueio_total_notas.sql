-- Pedido (ago/2026): remove as duas exceções da migration
-- 20260821_avaliacao_mascara_notas — agora cada usuário só vê a nota que ELE
-- deu, nunca a que recebeu, sem exceção nenhuma:
--   - antes: o avaliador passava a ver a autoavaliação do colaborador a
--     partir da Calibragem. Agora: nunca vê (só quem preencheu e o
--     administrador de verdade da empresa).
--   - antes: o colaborador passava a ver a nota do gestor/calibragem depois
--     que o gestor marcasse "revelar" (avaliacoes.revelado). Agora: nunca vê.
--
-- e_admin_do_ciclo continua sendo bypass incondicional nas duas funções — só
-- o administrador de verdade da empresa segue enxergando os dois lados
-- sempre, como auditor (front-end espelha isso com a prop souAdministrador
-- em ModalAvaliacao, separada do papel avaliador/avaliado desta avaliação).
--
-- Assinatura das duas funções continua igual de propósito (mesmos 4
-- parâmetros) pra não precisar tocar em get_avaliacao_cultural/tecnica,
-- get_avaliacoes_por_ciclo, get_minhas_avaliacoes,
-- get_avaliacoes_para_avaliar — elas só chamam essas duas por baixo.

create or replace function public.pode_ver_lado_auto(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_status text)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_avaliado(p_funcionario_id);
$func$;

create or replace function public.pode_ver_lado_gestor(p_ciclo_id uuid, p_funcionario_id uuid, p_avaliador_id uuid, p_revelado boolean)
returns boolean
language sql
stable
as $func$
  select
    public.e_admin_do_ciclo(p_ciclo_id)
    or public.e_gestor_do_funcionario(p_funcionario_id)
    or public.e_avaliador_designado(p_avaliador_id);
$func$;
