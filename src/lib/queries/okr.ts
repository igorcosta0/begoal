import { createClient } from '@/lib/supabase/client'
import { mensagemErroGravacao } from '@/lib/utils'
import type { MetaMensalKr } from '@/lib/okrProgresso'

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
    const { data: linhas, error } = await supabase.from('objetivos').update(data).eq('id', id).select('id')
    const erro = mensagemErroGravacao(error, linhas?.length)
    if (erro) return { error: erro }
  }
  if (setor_ids) {
    const { error } = await supabase.rpc('link_objective_sectors', {
      p_objetivo_id: id,
      p_setor_ids: setor_ids,
    })
    if (error) return { error: mensagemErroGravacao(error) }
  }
  return { error: null }
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
      direcao, apuracao,
      concluido, objetivo_id, responsavel_id, setor_id, client_id,
      funcionarios!responsavel_id(full_name),

      objetivos!objetivo_id(titulo)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [], error }

  // Todos os lançamentos (não só a data do último): o progresso depende da
  // forma de apuração (último/soma/média) e o card mostra a série.
  const krIds = data.map((kr: any) => kr.id)
  const { data: lancamentos } = await supabase
    .from('kr_lancamentos')
    .select('kr_id, valor, data_lancamento, is_final_result')
    .in('kr_id', krIds)
    .order('data_lancamento', { ascending: true })

  const porKr: Record<string, any[]> = {}
  lancamentos?.forEach((l: any) => {
    ;(porKr[l.kr_id] ??= []).push(l)
  })

  // Meta de cada mês (opcional; KR sem linhas usa só a meta do KR).
  const { data: metasMensais } = await supabase
    .from('kr_metas_mensais')
    .select('kr_id, mes, meta')
    .in('kr_id', krIds)
    .order('mes', { ascending: true })
  const metasPorKr: Record<string, MetaMensalKr[]> = {}
  metasMensais?.forEach((m: any) => {
    ;(metasPorKr[m.kr_id] ??= []).push({ mes: m.mes, meta: Number(m.meta) })
  })

  return {
    data: data.map((kr: any) => {
      const lista = porKr[kr.id] ?? []
      return {
        ...kr,
        lancamentos: lista,
        metas_mensais: metasPorKr[kr.id] ?? [],
        data_ultimo_lancamento: lista.length > 0 ? lista[lista.length - 1].data_lancamento : null,
        // Pente fino (A14): o card mostra "Referente a mm/aaaa" do KR
        // finalizado, mas krs não guarda data de encerramento — usa a data
        // do lançamento de resultado final.
        end_date: kr.concluido
          ? ([...lista].reverse().find((l: any) => l.is_final_result)?.data_lancamento ?? null)
          : null,
      }
    }),
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
  direcao?: string
  apuracao?: string
}) {
  const supabase = createClient()
  return supabase.from('krs').insert(payload).select().single()
}

export async function updateKr(
  id: string,
  payload: {
    titulo?: string
    responsavel_id?: string | null
    setor_id?: string | null
    valor_inicial?: number
    meta?: number
    tipo_valor?: string
    direcao?: string
    apuracao?: string
  }
) {
  const supabase = createClient()
  return supabase.from('krs').update(payload).eq('id', id).select().single()
}

// Substitui as metas mensais do KR no ano: apaga as do ano e grava as
// preenchidas (mês sem valor = sem meta naquele mês).
export async function salvarMetasMensaisKr(krId: string, ano: number, metas: (number | null)[]) {
  const supabase = createClient()
  const { error: erroApagar } = await supabase
    .from('kr_metas_mensais')
    .delete()
    .eq('kr_id', krId)
    .gte('mes', `${ano}-01-01`)
    .lte('mes', `${ano}-12-01`)
  if (erroApagar) return { error: mensagemErroGravacao(erroApagar) }
  const linhas = metas
    .map((meta, i) => ({ kr_id: krId, mes: `${ano}-${String(i + 1).padStart(2, '0')}-01`, meta }))
    .filter((l) => l.meta !== null && !Number.isNaN(l.meta))
  if (linhas.length === 0) return { error: null }
  const { data, error } = await supabase.from('kr_metas_mensais').insert(linhas).select('kr_id')
  return { error: mensagemErroGravacao(error, data?.length) }
}

export async function deleteKr(id: string) {
  const supabase = createClient()
  return supabase.from('krs').delete().eq('id', id)
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

  await recalcularValorAtualKr(payload.kr_id)

  return { data, error: null }
}

export async function deleteKrLancamento(id: string, krId: string) {
  const supabase = createClient()
  const res = await supabase.from('kr_lancamentos').delete().eq('id', id)
  if (!res.error) await recalcularValorAtualKr(krId)
  return res
}

// Pente fino (A5): valor_atual é sempre o lançamento de data mais recente —
// um lançamento retroativo não sobrescreve um mais novo.
export async function recalcularValorAtualKr(krId: string) {
  const supabase = createClient()
  const [{ data: ultimo }, { data: kr }] = await Promise.all([
    supabase
      .from('kr_lancamentos')
      .select('valor')
      .eq('kr_id', krId)
      .order('data_lancamento', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('krs').select('valor_inicial').eq('id', krId).maybeSingle(),
  ])
  return supabase
    .from('krs')
    .update({ valor_atual: ultimo?.valor ?? kr?.valor_inicial ?? null })
    .eq('id', krId)
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