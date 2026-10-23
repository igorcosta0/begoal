import { createClient } from '@/lib/supabase/client'

// Módulo de Pesquisa (pedido 05/10/2026). Tabelas e regras em
// supabase/migrations/PENDENTE_20261005000000_pesquisas.sql:
// - interna = anônima (a resposta não guarda quem respondeu);
// - externa = um link público por pesquisa (identificação opcional);
// - lista = participantes importados de planilha, cada um com link próprio
//   (etapa 3 do guia do Miro, PENDENTE_20261023020000_pesquisa_etapa3_envio.sql);
// - só administrador cria, publica, encerra e vê resultados.

export type PublicoPesquisa = 'interna' | 'lista' | 'externa'
// 'pausada' (F42): ninguém responde, mas volta a abrir de onde parou.
export type StatusPesquisa = 'rascunho' | 'aberta' | 'pausada' | 'encerrada'
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

// Vazio = todos. F36–F39: empresa inteira, por área, por cargo, por cliente.
export interface FiltroPublico {
  setores?: string[]
  cargos?: string[]
  clientes?: string[]
}

// Como a pesquisa chega às pessoas (passo "Envio" do assistente).
export interface ConfigEnvio {
  publico: PublicoPesquisa
  filtro: FiltroPublico
  pede_identificacao: boolean
  repetir_meses: number | null
  convite_assunto: string | null
  convite_mensagem: string | null
}

export interface Pesquisa extends ConfigEnvio {
  id: string
  client_id: string
  titulo: string
  descricao: string | null
  modelo: ModeloPesquisa
  status: StatusPesquisa
  token: string
  origem_id: string | null
  created_at: string
  publicada_em: string | null
  encerrada_em: string | null
}

export interface ParticipanteRascunho {
  nome: string
  email: string
  setor: string | null
  cargo: string | null
  tempo_empresa: string | null
  estado: string | null
  cliente: string | null
}

export interface Participante extends ParticipanteRascunho {
  id: string
  token: string
  convidado_em: string | null
  respondeu_em: string | null
}

export function noFiltro(f: FiltroPublico, pessoa: { setor?: string | null; cargo?: string | null; cliente?: string | null }): boolean {
  const ok = (lista: string[] | undefined, v: string | null | undefined) => !lista?.length || lista.includes(v ?? '')
  return ok(f.setores, pessoa.setor) && ok(f.cargos, pessoa.cargo) && ok(f.clientes, pessoa.cliente)
}

export function filtroVazio(f: FiltroPublico): boolean {
  return !f.setores?.length && !f.cargos?.length && !f.clientes?.length
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
  segmento: Record<string, string>
}

// Múltipla com várias opções responde uma lista de textos.
export type ValorResposta = number | string | string[]
export type Respostas = Record<string, ValorResposta>

const CAMPOS_PESQUISA =
  'id, client_id, titulo, descricao, publico, modelo, status, token, filtro, pede_identificacao, repetir_meses, ' +
  'origem_id, convite_assunto, convite_mensagem, created_at, publicada_em, encerrada_em'

export function linkPublicoPesquisa(token: string): string {
  return `${window.location.origin}/responder/${token}`
}

export function linkConvite(token: string): string {
  return `${window.location.origin}/responder/convite/${token}`
}

// F40: data da próxima aplicação (a partir da 1ª publicação).
export function proximaAplicacao(p: Pesquisa): Date | null {
  if (!p.repetir_meses || !p.publicada_em) return null
  const d = new Date(p.publicada_em)
  d.setMonth(d.getMonth() + p.repetir_meses)
  return d
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
// Regrava também a lista de participantes (fica vazia fora de 'lista').
export async function salvarPesquisa(params: {
  id: string | null
  clientId: string
  titulo: string
  descricao: string
  modelo: ModeloPesquisa
  envio: ConfigEnvio
  origemId?: string | null
  perguntas: PerguntaRascunho[]
  participantes: ParticipanteRascunho[]
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { envio } = params
  const campos = {
    titulo: params.titulo.trim(),
    descricao: params.descricao.trim() || null,
    modelo: params.modelo,
    publico: envio.publico,
    filtro: envio.filtro,
    pede_identificacao: envio.pede_identificacao,
    repetir_meses: envio.repetir_meses,
    convite_assunto: envio.convite_assunto?.trim() || null,
    convite_mensagem: envio.convite_mensagem?.trim() || null,
    ...(params.origemId !== undefined ? { origem_id: params.origemId } : {}),
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

  const { error: erroApagarPart } = await supabase.from('pesquisa_participantes').delete().eq('pesquisa_id', id)
  if (erroApagarPart) return { id, error: erroApagarPart.message }
  if (envio.publico === 'lista' && params.participantes.length) {
    // Em blocos, para listas grandes não estourarem o tamanho da requisição.
    for (let i = 0; i < params.participantes.length; i += 500) {
      const { error } = await supabase.from('pesquisa_participantes').insert(
        params.participantes.slice(i, i + 500).map((pt) => ({ pesquisa_id: id, ...pt }))
      )
      if (error) return { id, error: error.message }
    }
  }
  return { id, error: null }
}

export async function getParticipantes(pesquisaId: string): Promise<{ data: Participante[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pesquisa_participantes')
    .select('id, nome, email, setor, cargo, tempo_empresa, estado, cliente, token, convidado_em, respondeu_em')
    .eq('pesquisa_id', pesquisaId)
    .order('nome')
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as Participante[], error: null }
}

export async function marcarConvidados(ids: string[]): Promise<{ error: string | null }> {
  if (!ids.length) return { error: null }
  const supabase = createClient()
  const { error } = await supabase.from('pesquisa_participantes').update({ convidado_em: new Date().toISOString() }).in('id', ids)
  return { error: error?.message ?? null }
}

// Áreas e cargos do cadastro de funcionários (passo "Envio" das internas e
// a lista de quem falta responder).
export interface FuncionarioPublico {
  user_id: string | null
  nome: string
  email: string | null
  setor: string | null
  cargo: string | null
}

export async function getFuncionariosPublico(clientId: string): Promise<FuncionarioPublico[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('funcionarios')
    .select('user_id, full_name, email, cargo, status, setor:setores!setor_id(name)')
    .eq('client_id', clientId)
  type Linha = { user_id: string | null; full_name: string; email: string | null; cargo: string | null; status: string | null; setor: { name: string } | null }
  return ((data ?? []) as unknown as Linha[])
    .filter((f) => f.status !== 'Desligado')
    .map((f) => ({ user_id: f.user_id, nome: f.full_name, email: f.email?.trim() || null, setor: f.setor?.name ?? null, cargo: f.cargo?.trim() || null }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

// F27: cópia em rascunho (mesmas perguntas e público, sem respostas).
// `reaplicacao` (F40) mantém o título e liga a cópia à anterior (origem_id).
export async function duplicarPesquisa(p: Pesquisa, reaplicacao = false): Promise<{ error: string | null }> {
  const [{ data: perguntas, error }, part] = await Promise.all([
    getPerguntas(p.id),
    p.publico === 'lista' ? getParticipantes(p.id) : Promise.resolve({ data: [] as Participante[], error: null }),
  ])
  if (error || part.error) return { error: error ?? part.error }
  const { error: erroSalvar } = await salvarPesquisa({
    id: null,
    clientId: p.client_id,
    titulo: reaplicacao ? p.titulo : `${p.titulo} (cópia)`,
    descricao: p.descricao ?? '',
    modelo: p.modelo,
    envio: {
      publico: p.publico, filtro: p.filtro ?? {}, pede_identificacao: p.pede_identificacao, repetir_meses: p.repetir_meses,
      convite_assunto: p.convite_assunto, convite_mensagem: p.convite_mensagem,
    },
    origemId: reaplicacao ? p.id : null,
    perguntas: perguntas.map(({ tipo, enunciado, opcoes, obrigatoria }) => ({ tipo, enunciado, opcoes, obrigatoria })),
    participantes: part.data.map(({ nome, email, setor, cargo, tempo_empresa, estado, cliente }) => ({ nome, email, setor, cargo, tempo_empresa, estado, cliente })),
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

// `publicada_em` só marca a primeira publicação: retomar uma pausada ou
// reabrir uma encerrada não muda a data de abertura.
export async function mudarStatusPesquisa(p: Pesquisa, status: StatusPesquisa): Promise<{ error: string | null }> {
  const supabase = createClient()
  const agora = new Date().toISOString()
  const extra =
    status === 'aberta' ? { encerrada_em: null, ...(p.status === 'rascunho' ? { publicada_em: agora } : {}) }
    : status === 'encerrada' ? { encerrada_em: agora }
    : {}
  const { data, error } = await supabase.from('pesquisas').update({ status, ...extra }).eq('id', p.id).select('id')
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
    .select('id, respondida_em, respondente_email, respondente_nome, respondente_empresa, itens, segmento')
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
  pede_identificacao: boolean
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

// ── Convite da lista (link individual, sem login) ───────────────────────────

export interface ConvitePesquisa {
  titulo: string
  descricao: string | null
  status: StatusPesquisa
  empresa: string
  nome: string
  ja_respondeu: boolean
  no_publico: boolean
  perguntas: Pergunta[]
}

export async function getConvite(token: string): Promise<{ data: ConvitePesquisa | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('pesquisa_convite_obter', { p_token: token })
  if (error) return { data: null, error: error.message }
  return { data: (data as ConvitePesquisa | null) ?? null, error: null }
}

export async function responderConvite(token: string, respostas: Respostas): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('pesquisa_convite_responder', { p_token: token, p_respostas: respostas })
  return { error: error?.message ?? null }
}

// F31: {nome}, {titulo} e {link} no convite.
export const CONVITE_ASSUNTO_PADRAO = 'Sua opinião: {titulo}'
export const CONVITE_MENSAGEM_PADRAO =
  'Olá, {nome}!\n\nQueremos ouvir você na pesquisa "{titulo}". Leva poucos minutos e não precisa de login.\n\n' +
  'Para responder, acesse: {link}\n\nObrigado!'

export function montarConvite(
  p: Pick<Pesquisa, 'titulo' | 'convite_assunto' | 'convite_mensagem'>,
  pessoa: { nome: string; token: string }
): { assunto: string; mensagem: string } {
  const trocar = (t: string) => t
    .split('{nome}').join(pessoa.nome.trim().split(' ')[0])
    .split('{titulo}').join(p.titulo)
    .split('{link}').join(linkConvite(pessoa.token))
  return {
    assunto: trocar(p.convite_assunto || CONVITE_ASSUNTO_PADRAO),
    mensagem: trocar(p.convite_mensagem || CONVITE_MENSAGEM_PADRAO),
  }
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
