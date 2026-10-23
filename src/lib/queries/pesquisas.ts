import { createClient } from '@/lib/supabase/client'

// Módulo de Pesquisa (pedido 05/10/2026). Tabelas e regras em
// supabase/migrations/PENDENTE_20261005000000_pesquisas.sql:
// - interna = anônima (a resposta não guarda quem respondeu);
// - externa = um link público por pesquisa, com e-mail/nome/empresa;
// - só administrador cria, publica, encerra e vê resultados.

export type PublicoPesquisa = 'interna' | 'externa'
export type StatusPesquisa = 'rascunho' | 'aberta' | 'encerrada'
// 'nota_1_5' é de antes do guia do Miro (23/10/2026): continua valendo nas
// pesquisas que já usam, mas não é mais oferecida na criação (F24).
export type TipoPergunta = 'escala_0_10' | 'nps' | 'texto' | 'multipla' | 'multipla_varias' | 'nota_1_5'
export type ModeloPesquisa = 'clima' | 'pulse' | 'nps' | 'satisfacao' | 'cultura' | 'personalizada'

export const TIPOS_PERGUNTA: { value: TipoPergunta; label: string; ajuda: string }[] = [
  { value: 'escala_0_10', label: 'Escala de 0 a 10', ajuda: 'A pessoa dá uma nota de 0 a 10. O resultado mostra a média.' },
  { value: 'nps', label: 'NPS', ajuda: 'Nota de 0 a 10 sobre recomendar. O resultado calcula a nota NPS (de −100 a 100).' },
  { value: 'texto', label: 'Resposta aberta', ajuda: 'A pessoa escreve o que quiser.' },
  { value: 'multipla', label: 'Múltipla escolha (uma opção)', ajuda: 'A pessoa marca só uma das opções.' },
  { value: 'multipla_varias', label: 'Múltipla escolha (várias opções)', ajuda: 'A pessoa marca quantas opções quiser.' },
]

export const ROTULO_TIPO: Record<TipoPergunta, string> = {
  ...Object.fromEntries(TIPOS_PERGUNTA.map((t) => [t.value, t.label])) as Record<TipoPergunta, string>,
  nota_1_5: 'Nota de 1 a 5 (antigo)',
}

export const tipoComOpcoes = (tipo: TipoPergunta) => tipo === 'multipla' || tipo === 'multipla_varias'

export interface Pergunta {
  id: string
  tipo: TipoPergunta
  enunciado: string
  opcoes: string[]
  obrigatoria: boolean
}

export interface PerguntaRascunho {
  tipo: TipoPergunta
  enunciado: string
  opcoes: string[]
  obrigatoria: boolean
}

export interface Pesquisa {
  id: string
  client_id: string
  titulo: string
  descricao: string | null
  publico: PublicoPesquisa
  modelo: ModeloPesquisa
  status: StatusPesquisa
  token: string
  created_at: string
  publicada_em: string | null
  encerrada_em: string | null
}

export interface PesquisaComContagem extends Pesquisa {
  total_respostas: number
}

export interface RespostaPesquisa {
  id: string
  respondida_em: string
  respondente_email: string | null
  respondente_nome: string | null
  respondente_empresa: string | null
  itens: Respostas
}

// Múltipla com várias opções responde uma lista de textos.
export type ValorResposta = number | string | string[]
export type Respostas = Record<string, ValorResposta>

const CAMPOS_PESQUISA = 'id, client_id, titulo, descricao, publico, modelo, status, token, created_at, publicada_em, encerrada_em'

export function linkPublicoPesquisa(token: string): string {
  return `${window.location.origin}/responder/${token}`
}

// Admin: todas as pesquisas da empresa. Os demais: só as internas publicadas
// (a RLS filtra). A contagem de respostas só vem para o admin.
export async function getPesquisas(clientId: string): Promise<{ data: PesquisaComContagem[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pesquisas')
    .select(`${CAMPOS_PESQUISA}, pesquisa_respostas(count)`)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: error.message }
  type Linha = Pesquisa & { pesquisa_respostas: { count: number }[] | null }
  return {
    data: ((data ?? []) as unknown as Linha[]).map(({ pesquisa_respostas, ...p }) => ({
      ...p,
      total_respostas: pesquisa_respostas?.[0]?.count ?? 0,
    })),
    error: null,
  }
}

export async function getPerguntas(pesquisaId: string): Promise<{ data: Pergunta[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pesquisa_perguntas')
    .select('id, tipo, enunciado, opcoes, obrigatoria')
    .eq('pesquisa_id', pesquisaId)
    .order('ordem')
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as Pergunta[], error: null }
}

// Cria ou atualiza a pesquisa (rascunho) e regrava as perguntas inteiras.
export async function salvarPesquisa(params: {
  id: string | null
  clientId: string
  titulo: string
  descricao: string
  publico: PublicoPesquisa
  modelo: ModeloPesquisa
  perguntas: PerguntaRascunho[]
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const campos = {
    titulo: params.titulo.trim(),
    descricao: params.descricao.trim() || null,
    publico: params.publico,
    modelo: params.modelo,
  }

  let id = params.id
  if (id) {
    const { data, error } = await supabase.from('pesquisas').update(campos).eq('id', id).select('id')
    if (error) return { id, error: error.message }
    if (!data?.length) return { id, error: 'Sem permissão para editar esta pesquisa.' }
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('pesquisas')
      .insert({ ...campos, client_id: params.clientId, created_by: user?.id ?? null })
      .select('id')
      .single()
    if (error) return { id: null, error: error.message }
    id = data.id as string
  }

  const { error: erroApagar } = await supabase.from('pesquisa_perguntas').delete().eq('pesquisa_id', id)
  if (erroApagar) return { id, error: erroApagar.message }

  if (params.perguntas.length) {
    const { error } = await supabase.from('pesquisa_perguntas').insert(
      params.perguntas.map((q, i) => ({
        pesquisa_id: id,
        ordem: i,
        tipo: q.tipo,
        enunciado: q.enunciado.trim(),
        opcoes: tipoComOpcoes(q.tipo) ? q.opcoes.map((o) => o.trim()).filter(Boolean) : [],
        obrigatoria: q.obrigatoria,
      }))
    )
    if (error) return { id, error: error.message }
  }
  return { id, error: null }
}

// F27: cópia em rascunho (mesmas perguntas, sem respostas) para reaplicar.
export async function duplicarPesquisa(p: Pesquisa): Promise<{ error: string | null }> {
  const { data: perguntas, error } = await getPerguntas(p.id)
  if (error) return { error }
  const { error: erroSalvar } = await salvarPesquisa({
    id: null,
    clientId: p.client_id,
    titulo: `${p.titulo} (cópia)`,
    descricao: p.descricao ?? '',
    publico: p.publico,
    modelo: p.modelo,
    perguntas: perguntas.map(({ tipo, enunciado, opcoes, obrigatoria }) => ({ tipo, enunciado, opcoes, obrigatoria })),
  })
  return { error: erroSalvar }
}

// F18: a IA sugere perguntas a partir do objetivo da pesquisa (rota
// /api/pesquisa-sugerir-perguntas, que só devolve os tipos permitidos).
export async function sugerirPerguntasIa(params: {
  objetivo: string
  publico: PublicoPesquisa
  empresa: string
  existentes: string[]
}): Promise<{ data: PerguntaRascunho[]; error: string | null }> {
  try {
    const res = await fetch('/api/pesquisa-sugerir-perguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { data: [], error: json.error ?? 'Não foi possível gerar sugestões agora.' }
    return { data: (json.perguntas ?? []) as PerguntaRascunho[], error: null }
  } catch {
    return { data: [], error: 'Não foi possível gerar sugestões agora.' }
  }
}

export async function mudarStatusPesquisa(id: string, status: StatusPesquisa): Promise<{ error: string | null }> {
  const supabase = createClient()
  const agora = new Date().toISOString()
  const extra = status === 'aberta' ? { publicada_em: agora, encerrada_em: null } : status === 'encerrada' ? { encerrada_em: agora } : {}
  const { data, error } = await supabase.from('pesquisas').update({ status, ...extra }).eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'Sem permissão para alterar esta pesquisa.' }
  return { error: null }
}

export async function excluirPesquisa(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.from('pesquisas').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'Sem permissão para excluir esta pesquisa.' }
  return { error: null }
}

export async function getRespostas(pesquisaId: string): Promise<{ data: RespostaPesquisa[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pesquisa_respostas')
    .select('id, respondida_em, respondente_email, respondente_nome, respondente_empresa, itens')
    .eq('pesquisa_id', pesquisaId)
    .order('respondida_em', { ascending: false })
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as RespostaPesquisa[], error: null }
}

// Interna: user_ids de quem já respondeu (admin vê todos; os demais, só o próprio).
export async function getParticipacoes(pesquisaIds: string[]): Promise<Record<string, string[]>> {
  if (!pesquisaIds.length) return {}
  const supabase = createClient()
  const { data } = await supabase
    .from('pesquisa_participacoes')
    .select('pesquisa_id, user_id')
    .in('pesquisa_id', pesquisaIds)
  const mapa: Record<string, string[]> = {}
  for (const r of (data ?? []) as { pesquisa_id: string; user_id: string }[]) {
    ;(mapa[r.pesquisa_id] ??= []).push(r.user_id)
  }
  return mapa
}

export async function responderPesquisaInterna(pesquisaId: string, respostas: Respostas): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('pesquisa_interna_responder', { p_pesquisa_id: pesquisaId, p_respostas: respostas })
  return { error: error?.message ?? null }
}

// ── Externa (página pública, sem login) ─────────────────────────────────────

export interface PesquisaPublica {
  titulo: string
  descricao: string | null
  status: StatusPesquisa
  empresa: string
  perguntas: Pergunta[]
}

export async function getPesquisaPublica(token: string): Promise<{ data: PesquisaPublica | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('pesquisa_publica_obter', { p_token: token })
  if (error) return { data: null, error: error.message }
  return { data: (data as PesquisaPublica | null) ?? null, error: null }
}

export async function emailJaRespondeu(token: string, email: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase.rpc('pesquisa_publica_ja_respondeu', { p_token: token, p_email: email })
  return data === true
}

export async function responderPesquisaPublica(params: {
  token: string
  email: string
  nome: string
  empresa: string
  respostas: Respostas
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('pesquisa_publica_responder', {
    p_token: params.token,
    p_email: params.email,
    p_nome: params.nome,
    p_empresa: params.empresa,
    p_respostas: params.respostas,
  })
  return { error: error?.message ?? null }
}

// Perguntas obrigatórias sem resposta (mesma regra que o banco confere).
export function perguntasFaltando(perguntas: Pergunta[], respostas: Respostas): string[] {
  return perguntas
    .filter((q) => q.obrigatoria)
    .filter((q) => {
      const v = respostas[q.id]
      return v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)
    })
    .map((q) => q.id)
}
