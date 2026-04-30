import { createClient } from '@/lib/supabase/client'

export async function getSinaisVitais(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('sinais_vitais')
    .select(`
      id, titulo, valor_inicial, valor_atual, meta, tipo_valor,
      objetivo_id, responsavel_id, setor_id, client_id, created_at,
      funcionarios!responsavel_id(full_name),
      setores!setor_id(name)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
}

export async function createSinalVital(payload: {
  titulo: string
  client_id: string
  objetivo_id?: string
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
    objetivo_id?: string
    responsavel_id?: string
    setor_id?: string
    valor_inicial?: number
    meta?: number
    tipo_valor?: string
  }
) {
  const supabase = createClient()
  return supabase.from('sinais_vitais').update(payload).eq('id', id).select().single()
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
  return supabase.from('sinais_vitais_lancamentos').insert(payload).select().single()
}

export async function getSvLancamentos(sinalVitalId: string) {
  const supabase = createClient()
  return supabase
    .from('sinais_vitais_lancamentos')
    .select('id, valor, data_lancamento, comentario, created_at')
    .eq('sinal_vital_id', sinalVitalId)
    .order('data_lancamento', { ascending: true })
}

export async function deleteSvLancamento(id: string) {
  const supabase = createClient()
  return supabase.from('sinais_vitais_lancamentos').delete().eq('id', id)
}