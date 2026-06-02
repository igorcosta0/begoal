import { createClient } from '@/lib/supabase/client'

// ─── Quem Somos ───────────────────────────────────────────────
export async function getQuemSomos(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('quem_somos')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  return data
}

export async function upsertQuemSomos(clientId: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const existing = await getQuemSomos(clientId)
  if (existing) {
    const { error } = await supabase
      .from('quem_somos')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
    return error
  } else {
    const { error } = await supabase
      .from('quem_somos')
      .insert({ client_id: clientId, ...payload })
    return error
  }
}

// ─── Competências ─────────────────────────────────────────────
export async function getCompetencias(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('competencias')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function addCompetencia(clientId: string, descricao: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('competencias')
    .insert({ client_id: clientId, descricao })
  return error
}

export async function deleteCompetencia(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('competencias').delete().eq('id', id)
  return error
}

// ─── Clientes Estratégicos ────────────────────────────────────
export async function getClientesEstrategicos(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('clientes_estrategicos')
    .select('*')
    .eq('client_id', clientId)
    .order('faturamento_pct', { ascending: false })
  return data ?? []
}

export async function upsertClienteEstrategico(
  clientId: string,
  payload: {
    id?: string
    nome: string
    segmento: string
    faturamento_pct: number
    tags: string[]
  }
) {
  const supabase = createClient()
  if (payload.id) {
    const { error } = await supabase
      .from('clientes_estrategicos')
      .update({
        nome: payload.nome,
        segmento: payload.segmento,
        faturamento_pct: payload.faturamento_pct,
        tags: payload.tags,
      })
      .eq('id', payload.id)
    return error
  } else {
    const { error } = await supabase
      .from('clientes_estrategicos')
      .insert({ client_id: clientId, ...payload })
    return error
  }
}

export async function deleteClienteEstrategico(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('clientes_estrategicos').delete().eq('id', id)
  return error
}

// ─── Mercados ─────────────────────────────────────────────────
export async function getMercados(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('mercados')
    .select('*')
    .eq('client_id', clientId)
    .order('prioridade', { ascending: false })
  return data ?? []
}

export async function upsertMercado(
  clientId: string,
  payload: {
    id?: string
    nome: string
    potencial?: string
    prioridade?: number
  }
) {
  const supabase = createClient()
  if (payload.id) {
    const { error } = await supabase
      .from('mercados')
      .update({
        nome: payload.nome,
        potencial: payload.potencial,
        prioridade: payload.prioridade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
    return error
  } else {
    const { error } = await supabase
      .from('mercados')
      .insert({ client_id: clientId, ...payload })
    return error
  }
}

export async function deleteMercado(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('mercados').delete().eq('id', id)
  return error
}

export async function criarObjetivoDoMercado(
  clientId: string,
  nomeMercado: string
) {
  const supabase = createClient()
  const hoje = new Date()
  const fimAno = new Date(hoje.getFullYear(), 11, 31)
  const { error } = await supabase.from('objetivos').insert({
    client_id: clientId,
    titulo: `Expandir no mercado: ${nomeMercado}`,
    descricao: `Objetivo gerado a partir do mercado priorizado no módulo de Estratégia.`,
    start_date: hoje.toISOString().split('T')[0],
    end_date: fimAno.toISOString().split('T')[0],
    concluido: false,
  })
  return error
}

// ─── ICP ──────────────────────────────────────────────────────
export async function getICP(clientId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('icp')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  return data
}

export async function upsertICP(clientId: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const existing = await getICP(clientId)
  if (existing) {
    const { error } = await supabase
      .from('icp')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
    return error
  } else {
    const { error } = await supabase
      .from('icp')
      .insert({ client_id: clientId, ...payload })
    return error
  }
}