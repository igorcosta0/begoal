import { createClient } from '@/lib/supabase/client'

export async function getCiclosAvaliacao(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('ciclos_avaliacao')
    .select('id, nome, periodo, ano, status, created_at')
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

export async function updateCicloStatus(id: string, status: string) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').update({ status }).eq('id', id).select().single()
}

export async function deleteCicloAvaliacao(id: string) {
  const supabase = createClient()
  return supabase.from('ciclos_avaliacao').delete().eq('id', id)
}

export async function getAvaliacoesByCiclo(cicloId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes')
    .select(`
      id, status, vertical, revelado, media_cultural_auto, media_cultural_gestor, media_cultural_calibragem,
      media_tecnica_auto, media_tecnica_gestor, media_tecnica_calibragem,
      evidencias_culturais, observacoes_gerais,
      funcionario:funcionarios!funcionario_id(id, full_name, cargo),
      avaliador:funcionarios!avaliador_id(id, full_name)
    `)
    .eq('ciclo_id', cicloId)
    .order('created_at')
}

export async function getMinhasAvaliacoes(funcionarioId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes')
    .select(`
      id, status, vertical, revelado, media_cultural_auto, media_cultural_gestor, media_cultural_calibragem,
      media_tecnica_auto, media_tecnica_gestor, media_tecnica_calibragem,
      ciclo:ciclos_avaliacao!ciclo_id(id, nome, periodo, ano, status)
    `)
    .eq('funcionario_id', funcionarioId)
    .order('created_at', { ascending: false })
}

export async function createAvaliacao(payload: {
  ciclo_id: string
  funcionario_id: string
  avaliador_id?: string
  vertical?: string
}) {
  const supabase = createClient()
  return supabase.from('avaliacoes').insert(payload).select().single()
}

export async function updateAvaliacao(
  id: string,
  payload: {
    status?: string
    vertical?: string | null
    avaliador_id?: string
    revelado?: boolean
    evidencias_culturais?: string | null
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
  return supabase.from('avaliacoes').update(payload).eq('id', id).select().single()
}

export async function deleteAvaliacao(id: string) {
  const supabase = createClient()
  return supabase.from('avaliacoes').delete().eq('id', id)
}

export async function getAvaliacaoCultural(avaliacaoId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_cultural')
    .select('id, pilar, nota_auto, nota_gestor, nota_calibragem')
    .eq('avaliacao_id', avaliacaoId)
}

export async function upsertAvaliacaoCultural(
  avaliacaoId: string,
  pilar: number,
  notaAuto: number | null,
  notaGestor: number | null,
  notaCalibragem: number | null
) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_cultural')
    .upsert(
      { avaliacao_id: avaliacaoId, pilar, nota_auto: notaAuto, nota_gestor: notaGestor, nota_calibragem: notaCalibragem },
      { onConflict: 'avaliacao_id,pilar' }
    )
}

export async function getAvaliacaoTecnica(avaliacaoId: string) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_tecnica')
    .select('id, criterio_key, nota_auto, nota_gestor, nota_calibragem, observacoes')
    .eq('avaliacao_id', avaliacaoId)
}

export async function upsertAvaliacaoTecnica(
  avaliacaoId: string,
  criterioKey: string,
  notaAuto: number | null,
  notaGestor: number | null,
  notaCalibragem: number | null,
  observacoes?: string | null
) {
  const supabase = createClient()
  return supabase
    .from('avaliacoes_tecnica')
    .upsert(
      {
        avaliacao_id: avaliacaoId,
        criterio_key: criterioKey,
        nota_auto: notaAuto,
        nota_gestor: notaGestor,
        nota_calibragem: notaCalibragem,
        observacoes: observacoes ?? null,
      },
      { onConflict: 'avaliacao_id,criterio_key' }
    )
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
