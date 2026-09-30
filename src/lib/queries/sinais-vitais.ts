import { createClient } from '@/lib/supabase/client'

export async function getSinaisVitais(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('sinais_vitais')
    .select(`
      id, titulo, valor_inicial, valor_atual, meta, tipo_valor,
      objetivo_id, kr_id, responsavel_id, setor_id, client_id, created_at, removido_em,
      funcionarios!responsavel_id(full_name),
      setores!setor_id(name),
      objetivos!objetivo_id(titulo),
      krs!kr_id(titulo)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
}

export async function createSinalVital(payload: {
  titulo: string
  client_id: string
  objetivo_id?: string
  kr_id?: string
  responsavel_id?: string
  setor_id?: string
  valor_inicial?: number
  meta?: number
  tipo_valor?: string
}) {
  const supabase = createClient()
  return supabase.from('sinais_vitais').insert(payload).select().single()
}

export async function updateSinalVital(
  id: string,
  payload: {
    titulo?: string
    objetivo_id?: string | null
    kr_id?: string | null
    responsavel_id?: string | null
    setor_id?: string | null
    valor_inicial?: number
    meta?: number
    tipo_valor?: string
  }
) {
  const supabase = createClient()
  return supabase.from('sinais_vitais').update(payload).eq('id', id).select().single()
}

// Lista enxuta de KRs para vincular/filtrar sinais vitais.
export async function getKrsParaVinculo(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('krs')
    .select('id, titulo, objetivo_id, concluido')
    .eq('client_id', clientId)
    .order('titulo', { ascending: true })
}

// Removidos (aguardando validação): null restaura o sinal vital.
export async function marcarSinalVitalRemovido(id: string, removido: boolean) {
  const supabase = createClient()
  return supabase
    .from('sinais_vitais')
    .update({ removido_em: removido ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
}

export async function deleteSinalVital(id: string) {
  const supabase = createClient()
  return supabase.from('sinais_vitais').delete().eq('id', id)
}

export async function createSvLancamento(payload: {
  sinal_vital_id: string
  responsavel_id?: string
  valor: number
  data_lancamento: string
  comentario?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sinais_vitais_lancamentos')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error }

  await recalcularValorAtualSv(payload.sinal_vital_id)

  return { data, error: null }
}

export async function getSvLancamentos(sinalVitalId: string) {
  const supabase = createClient()
  return supabase
    .from('sinais_vitais_lancamentos')
    .select('id, valor, data_lancamento, comentario, created_at')
    .eq('sinal_vital_id', sinalVitalId)
    .order('data_lancamento', { ascending: true })
}

export async function deleteSvLancamento(id: string, sinalVitalId: string) {
  const supabase = createClient()
  const res = await supabase.from('sinais_vitais_lancamentos').delete().eq('id', id)
  if (!res.error) await recalcularValorAtualSv(sinalVitalId)
  return res
}

// Pente fino (A5/A6): valor_atual é sempre o lançamento de data mais recente
// (um lançamento retroativo não passa na frente; excluir volta ao anterior ou
// ao valor inicial).
export async function recalcularValorAtualSv(sinalVitalId: string) {
  const supabase = createClient()
  const [{ data: ultimo }, { data: sv }] = await Promise.all([
    supabase
      .from('sinais_vitais_lancamentos')
      .select('valor')
      .eq('sinal_vital_id', sinalVitalId)
      .order('data_lancamento', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('sinais_vitais').select('valor_inicial').eq('id', sinalVitalId).maybeSingle(),
  ])
  return supabase
    .from('sinais_vitais')
    .update({ valor_atual: ultimo?.valor ?? sv?.valor_inicial ?? null })
    .eq('id', sinalVitalId)
}