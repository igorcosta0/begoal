import { createClient } from '@/lib/supabase/client'

// ==================== OBJETIVOS ====================

export async function getObjetivos(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('objetivos')
    .select('id, titulo, descricao, start_date, end_date, concluido')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
}

export async function createObjetivo(payload: {
  titulo: string
  client_id: string
  setor_ids?: string[]
}) {
  const supabase = createClient()
  const { setor_ids, ...data } = payload
  const { data: objetivo, error } = await supabase
    .from('objetivos')
    .insert(data)
    .select()
    .single()
  if (error) return { data: null, error }
  if (setor_ids && setor_ids.length > 0) {
    await supabase.rpc('link_objective_sectors', {
      p_objetivo_id: objetivo.id,
      p_setor_ids: setor_ids,
    })
  }
  return { data: objetivo, error: null }
}

export async function updateObjetivo(
  id: string,
  payload: { titulo?: string; setor_ids?: string[] }
) {
  const supabase = createClient()
  const { setor_ids, ...data } = payload
  if (Object.keys(data).length > 0) {
    await supabase.from('objetivos').update(data).eq('id', id)
  }
  if (setor_ids) {
    await supabase.rpc('link_objective_sectors', {
      p_objetivo_id: id,
      p_setor_ids: setor_ids,
    })
  }
}

export async function deleteObjetivo(id: string) {
  const supabase = createClient()
  return supabase.rpc('delete_objective_cascade', { p_objetivo_id: id })
}

// ==================== KRs ====================

export async function getKrsByEmpresa(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('krs')
    .select(`
      id, titulo, valor_inicial, valor_atual, meta, tipo_valor,
      concluido, objetivo_id, responsavel_id, setor_id, client_id,
      funcionarios!responsavel_id(full_name),
      setores!setor_id(name),
      objetivos!objetivo_id(titulo)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [], error }

  const krIds = data.map((kr: any) => kr.id)
  const { data: lancamentos } = await supabase
    .from('kr_lancamentos')
    .select('kr_id, data_lancamento')
    .in('kr_id', krIds)
    .order('data_lancamento', { ascending: false })

  const ultimoLancamento: Record<string, string> = {}
  lancamentos?.forEach((l: any) => {
    if (!ultimoLancamento[l.kr_id]) {
      ultimoLancamento[l.kr_id] = l.data_lancamento
    }
  })

  return {
    data: data.map((kr: any) => ({
      ...kr,
      data_ultimo_lancamento: ultimoLancamento[kr.id] ?? null,
    })),
    error: null,
  }
}

export async function createKr(payload: {
  titulo: string
  objetivo_id: string
  responsavel_id: string
  setor_id?: string
  client_id: string
  valor_inicial?: number
  meta?: number
  tipo_valor?: string
}) {
  const supabase = createClient()
  return supabase.from('krs').insert(payload).select().single()
}

export async function updateKr(
  id: string,
  payload: {
    titulo?: string
    responsavel_id?: string
    setor_id?: string
    valor_inicial?: number
    meta?: number
    tipo_valor?: string
  }
) {
  const supabase = createClient()
  return supabase.from('krs').update(payload).eq('id', id).select().single()
}

export async function deleteKr(id: string) {
  const supabase = createClient()
  return supabase.from('krs').delete().eq('id', id)
}

export async function finalizarKr(krId: string, resultado: number) {
  const supabase = createClient()
  return supabase.rpc('finalize_kr_result', {
    p_kr_id: krId,
    p_resultado: resultado,
  })
}

export async function reativarKr(id: string) {
  const supabase = createClient()
  return supabase
    .from('krs')
    .update({ concluido: false })
    .eq('id', id)
}

export async function getKrChartData(krId: string) {
  const supabase = createClient()
  return supabase.rpc('get_kr_chart_data', { p_kr_id: krId })
}

// ==================== LANÇAMENTOS ====================

export async function createKrLancamento(payload: {
  kr_id: string
  valor: number
  data_lancamento: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kr_lancamentos')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error }

  await supabase
    .from('krs')
    .update({ valor_atual: payload.valor })
    .eq('id', payload.kr_id)

  return { data, error: null }
}

export async function deleteKrLancamento(id: string) {
  const supabase = createClient()
  return supabase.from('kr_lancamentos').delete().eq('id', id)
}

// ==================== AUXILIARES ====================

export async function getSetoresByEmpresa(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('setores')
    .select('id, name')
    .eq('client_id', clientId)
    .order('name')
}

export async function getFuncionariosByEmpresa(clientId: string) {
  const supabase = createClient()
  return supabase
    .from('funcionarios')
    .select('id, full_name')
    .eq('client_id', clientId)
    .order('full_name')
}