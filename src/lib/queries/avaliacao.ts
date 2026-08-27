import { createClient } from '@/lib/supabase/client'

// ── Sugestão de vertical por setor/gestor ───────────────────────────────────
// Usado só como pré-preenchimento na hora de montar um ciclo — a vertical
// continua editável por avaliação, então nunca trava nada, só erra o palpite.

// "Concretize" não entra aqui porque foi dividida em duas equipes com metas
// próprias — ver verticalDoFuncionario abaixo.
export const SETOR_PARA_VERTICAL: Record<string, string> = {
  'CSC': 'csc_financeiro',
  'Novos negocios': 'novos_negocios',
  'Loteamentos': 'loteadora',
  'Investimento': 'investimentos',
}

// Dentro do setor "Concretize", quem é o próprio Felipe Ross ou responde a ele
// entra na Equipe Comercial; os demais — incluindo o próprio Felipe Marques —
// ficam na Equipe Técnica (pedido de ago/2026).
export function verticalDoFuncionario(
  setorName: string | undefined | null,
  nomeFuncionario?: string | null,
  nomeGestor?: string | null
): string | undefined {
  if (!setorName) return undefined
  if (setorName === 'Concretize') {
    const ehRoss = (nomeFuncionario ?? '').toLowerCase().includes('ross')
    const respondeRoss = (nomeGestor ?? '').toLowerCase().includes('ross')
    return ehRoss || respondeRoss ? 'concretize_comercial' : 'concretize_tecnica'
  }
  return SETOR_PARA_VERTICAL[setorName]
}

// ── Avaliação de Pares (líderes avaliando líderes) ──────────────────────────
// "Líder" já foi tentativa por heurística (cargo/organograma), mas isso
// incluía gente que não deveria (ex.: CEO) e ficava sempre desatualizado. Hoje
// é uma marcação manual e explícita: funcionarios.lider_avaliacao, ligada pelo
// administrador na tela "Gerenciar Líderes" dentro de Avaliação.

export async function getCiclosAvaliacao(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('ciclos_avaliacao')
    .select('id, nome, periodo, ano, status, oculto, created_at')
    .eq('client_id', clientId)
    .order('ano', { ascending: false })
    .order('periodo', { ascending: false })
}

export async function createCicloAvaliacao(payload: {
  client_id: string
  nome: string
  periodo: number
  ano: number
}) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').insert(payload).select().single()
}

export async function updateCiclo(
  id: string,
  payload: { nome?: string; periodo?: number; ano?: number; oculto?: boolean }
) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').update(payload).eq('id', id)
}

// Calibragem (pedido ago/2026): etapa ciclo-inteira, acesso restrito (ver
// souGestorDaCalibragem em avaliacao/page.tsx — na CTZ é só Igor e Filippe
// Réus, nas demais empresas é qualquer administrador) — avança/fecha TODAS
// as avaliações comuns (tipo='padrao') elegíveis do ciclo de uma vez, em vez
// de uma por uma. Pares fica de fora (nunca tem autoavaliação, então nunca
// "está pronta" pra calibragem). Iniciar não exige mais que TODO mundo do
// ciclo esteja pronto — só avança quem já estiver em gestor_concluida,
// deixando o resto pra trás sem travar (pedido ago/2026).
export async function iniciarCalibragemCiclo(cicloId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes')
    .update({ status: 'calibragem' })
    .eq('ciclo_id', cicloId)
    .eq('tipo', 'padrao')
    .eq('status', 'gestor_concluida')
}

export async function finalizarCalibragemCiclo(cicloId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes')
    .update({ status: 'finalizada' })
    .eq('ciclo_id', cicloId)
    .eq('tipo', 'padrao')
    .eq('status', 'calibragem')
}

// "Finalizar Calibragem" trava avaliação pra sempre (status calibragem →
// finalizada não tem volta pela UI) — diferente de "Iniciar Calibragem" (que,
// desde ago/2026, ativa quem já estiver pronto sem esperar o resto do ciclo),
// aqui não existia nenhuma checagem de que a nota de calibragem foi realmente
// preenchida.
// Sem isso, dava pra clicar "Finalizar" com gente ainda sem nota de
// calibragem e ela ficava travada pra sempre com media_*_calibragem null.
// Esta função confere, avaliação por avaliação (as que estão em
// status='calibragem' agora), se os 4 pilares culturais e todos os
// critérios técnicos da vertical dela já têm nota_calibragem preenchida —
// olha o campo granular (não a média), porque a média já fica não-nula
// mesmo com só 1 de 4 pilares preenchidos (calcMedia ignora null).
export async function getCalibragemPendente(cicloId: string): Promise<{ pendente: boolean; error: { message: string } | null }> {
  const supabase = createClient()
  const { data: avaliacoes, error: erroAvaliacoes } = await supabase
    .from('avaliacoes')
    .select('id')
    .eq('ciclo_id', cicloId)
    .eq('tipo', 'padrao')
    .eq('status', 'calibragem')
  if (erroAvaliacoes) return { pendente: true, error: erroAvaliacoes }
  const ids = (avaliacoes ?? []).map((a) => a.id)
  if (ids.length === 0) return { pendente: false, error: null }

  const [{ data: cultural, error: erroC }, { data: tecnica, error: erroT }] = await Promise.all([
    supabase.from('avaliacoes_cultural').select('avaliacao_id, nota_calibragem').in('avaliacao_id', ids),
    supabase.from('avaliacoes_tecnica').select('avaliacao_id, nota_calibragem').in('avaliacao_id', ids),
  ])
  const erro = erroC || erroT
  if (erro) return { pendente: true, error: erro }

  for (const id of ids) {
    const pilares = (cultural ?? []).filter((c) => c.avaliacao_id === id)
    if (pilares.length < 4 || pilares.some((p) => p.nota_calibragem === null)) return { pendente: true, error: null }
    const criterios = (tecnica ?? []).filter((t) => t.avaliacao_id === id)
    if (criterios.length > 0 && criterios.some((c) => c.nota_calibragem === null)) return { pendente: true, error: null }
  }
  return { pendente: false, error: null }
}

export async function updateCicloStatus(id: string, status: string) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').update({ status }).eq('id', id).select().single()
}

export async function deleteCicloAvaliacao(id: string) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').delete().eq('id', id)
}

// Leituras abaixo passam por funções do banco (get_avaliacoes_por_ciclo,
// get_minhas_avaliacoes, get_avaliacoes_para_avaliar — migration
// 20260821_avaliacao_mascara_notas) em vez de select direto na tabela: a nota
// do lado errado (auto pro avaliador antes da Calibragem, gestor/calibragem
// pro avaliado antes de "revelar") volta null desde o banco, não só escondida
// na tela — RLS de avaliacoes_select continua sendo quem decide se a LINHA
// aparece; essas funções só mascaram COLUNA por cima disso.

export async function getAvaliacoesByCiclo(cicloId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_avaliacoes_por_ciclo', { p_ciclo_id: cicloId })
  if (error || !data) return { data, error }
  const shaped = data.map((row: any) => ({
    id: row.id,
    status: row.status,
    vertical: row.vertical,
    tipo: row.tipo,
    revelado: row.revelado,
    media_cultural_auto: row.media_cultural_auto,
    media_cultural_gestor: row.media_cultural_gestor,
    media_cultural_calibragem: row.media_cultural_calibragem,
    media_tecnica_auto: row.media_tecnica_auto,
    media_tecnica_gestor: row.media_tecnica_gestor,
    media_tecnica_calibragem: row.media_tecnica_calibragem,
    observacoes_gerais: row.observacoes_gerais,
    funcionario: row.funcionario_id ? { id: row.funcionario_id, full_name: row.funcionario_nome, cargo: row.funcionario_cargo } : null,
    avaliador: row.avaliador_id ? { id: row.avaliador_id, full_name: row.avaliador_nome } : null,
  }))
  return { data: shaped, error: null }
}

export async function getMinhasAvaliacoes(funcionarioId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_minhas_avaliacoes', { p_funcionario_id: funcionarioId })
  if (error || !data) return { data, error }
  const shaped = data.map((row: any) => ({
    id: row.id,
    status: row.status,
    vertical: row.vertical,
    tipo: row.tipo,
    revelado: row.revelado,
    observacoes_gerais: row.observacoes_gerais,
    media_cultural_auto: row.media_cultural_auto,
    media_cultural_gestor: row.media_cultural_gestor,
    media_cultural_calibragem: row.media_cultural_calibragem,
    media_tecnica_auto: row.media_tecnica_auto,
    media_tecnica_gestor: row.media_tecnica_gestor,
    media_tecnica_calibragem: row.media_tecnica_calibragem,
    avaliador: row.avaliador_id ? { id: row.avaliador_id, full_name: row.avaliador_nome } : null,
    ciclo: row.ciclo_id ? { id: row.ciclo_id, nome: row.ciclo_nome, periodo: row.ciclo_periodo, ano: row.ciclo_ano, status: row.ciclo_status } : null,
  }))
  return { data: shaped, error: null }
}

// Avaliações onde a pessoa é a AVALIADORA (não a avaliada) — é daqui que vem a
// lista "Devo Avaliar" de quem recebeu avaliações de pares pra preencher.
export async function getAvaliacoesParaAvaliar(avaliadorFuncionarioId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_avaliacoes_para_avaliar', { p_avaliador_funcionario_id: avaliadorFuncionarioId })
  if (error || !data) return { data, error }
  const shaped = data.map((row: any) => ({
    id: row.id,
    status: row.status,
    vertical: row.vertical,
    tipo: row.tipo,
    revelado: row.revelado,
    observacoes_gerais: row.observacoes_gerais,
    funcionario: row.funcionario_id ? { id: row.funcionario_id, full_name: row.funcionario_nome, cargo: row.funcionario_cargo } : null,
    ciclo: row.ciclo_id ? { id: row.ciclo_id, nome: row.ciclo_nome, periodo: row.ciclo_periodo, ano: row.ciclo_ano, status: row.ciclo_status } : null,
  }))
  return { data: shaped, error: null }
}

export async function createAvaliacao(payload: {
  ciclo_id: string
  funcionario_id: string
  avaliador_id?: string
  vertical?: string
  tipo?: 'padrao' | 'pares'
}) {
  const supabase = createClient()
  // Sem .select() de propósito: quem monta o ciclo (líder) pode não ter
  // permissão de SELECT sobre a linha que acabou de criar — a avaliação é
  // visível só pro avaliador designado, pelo administrador ou pelo próprio
  // avaliado, não pra qualquer líder. Encadear .select() faria o Postgres
  // aplicar a policy de SELECT no retorno do INSERT e devolver erro/vazio
  // mesmo com o insert já confirmado. Os dois call sites (montagem e sorteio
  // de pares) só olham `.error`, então não precisam da linha de volta.
  return supabase.from('avaliacoes').insert(payload)
}

export async function updateAvaliacao(
  id: string,
  payload: {
    status?: string
    vertical?: string | null
    avaliador_id?: string
    revelado?: boolean
    evidencias_culturais?: string | null
    evidencias_tecnicas?: string | null
    observacoes_gerais?: string | null
    media_cultural_auto?: number | null
    media_cultural_gestor?: number | null
    media_cultural_calibragem?: number | null
    media_tecnica_auto?: number | null
    media_tecnica_gestor?: number | null
    media_tecnica_calibragem?: number | null
  }
) {
  const supabase = createClient()
  // Sem .select() de propósito, igual createAvaliacao acima: a resposta crua
  // devolveria a linha inteira sem o mascaramento de get_minhas_avaliacoes/
  // get_avaliacoes_por_ciclo (migration 20260821_avaliacao_mascara_notas), o
  // que vazaria pela aba de rede do navegador a nota que ainda não devia
  // aparecer pro lado errado — e quem chama isso (ModalAvaliacao) só olha
  // `.error` mesmo.
  return supabase.from('avaliacoes').update(payload).eq('id', id)
}

export async function deleteAvaliacao(id: string) {
  const supabase = createClient()
  return supabase.from('avaliacoes').delete().eq('id', id)
}

export async function getAvaliacaoCultural(avaliacaoId: string) {
  const supabase = createClient()
  return supabase.rpc('get_avaliacao_cultural', { p_avaliacao_id: avaliacaoId })
}

// `campos` é parcial de propósito: manda só as colunas do lado de quem está
// salvando (auto+observacoes pro avaliado, gestor+calibragem pro
// avaliador/admin). Como a leitura (getAvaliacaoCultural) agora devolve null
// pro lado que a pessoa ainda não pode ver, um upsert que reenviasse TODOS os
// campos (como antes) reescreveria a nota do outro lado com null — upsert só
// toca a coluna que está no objeto, então omitir a chave é o que preserva o
// valor já salvo no banco.
export async function upsertAvaliacaoCultural(
  avaliacaoId: string,
  pilar: number,
  campos: {
    nota_auto?: number | null
    nota_gestor?: number | null
    nota_calibragem?: number | null
    observacoes?: string | null
  }
) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_cultural')
    .upsert({ avaliacao_id: avaliacaoId, pilar, ...campos }, { onConflict: 'avaliacao_id,pilar' })
}

export async function getAvaliacaoTecnica(avaliacaoId: string) {
  const supabase = createClient()
  return supabase.rpc('get_avaliacao_tecnica', { p_avaliacao_id: avaliacaoId })
}

// Mesmo cuidado de upsertAvaliacaoCultural acima: `campos` parcial, só o
// lado de quem está salvando.
export async function upsertAvaliacaoTecnica(
  avaliacaoId: string,
  criterioKey: string,
  campos: {
    nota_auto?: number | null
    nota_gestor?: number | null
    nota_calibragem?: number | null
    observacoes?: string | null
  }
) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_tecnica')
    .upsert({ avaliacao_id: avaliacaoId, criterio_key: criterioKey, ...campos }, { onConflict: 'avaliacao_id,criterio_key' })
}

// ── Painel de Calibragem (ciclo inteiro numa tabela só) ─────────────────────
// Mesma máscara de coluna de getAvaliacaoCultural/Tecnica (pode_ver_lado_
// calibragem, admin-only) — ver comentário na migration 20260826_calibragem_
// painel. Quem não é administrador de verdade recebe null em toda nota
// (inclusive a média de pares), igual já acontece hoje dentro do
// ModalAvaliacao.
export async function getCalibragemCicloCultural(cicloId: string) {
  const supabase = createClient()
  return supabase.rpc('get_calibragem_ciclo_cultural', { p_ciclo_id: cicloId })
}

export async function getCalibragemCicloTecnica(cicloId: string) {
  const supabase = createClient()
  return supabase.rpc('get_calibragem_ciclo_tecnica', { p_ciclo_id: cicloId })
}

export async function getPdiItems(avaliacaoId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_pdi')
    .select('id, acao, indicador_sucesso, prazo, suporte_necessario')
    .eq('avaliacao_id', avaliacaoId)
    .order('created_at')
}

export async function createPdiItem(payload: {
  avaliacao_id: string
  acao: string
  indicador_sucesso?: string
  prazo?: string
  suporte_necessario?: string
}) {
  const supabase = createClient()
  return supabase.from('avaliacoes_pdi').insert(payload).select().single()
}

export async function deletePdiItem(id: string) {
  const supabase = createClient()
  return supabase.from('avaliacoes_pdi').delete().eq('id', id)
}
