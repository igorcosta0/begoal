'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { Heart, Edit2, Check, X, Plus, Send, Sparkles, Compass, Target, Layers, ChevronDown, CircleCheck, CircleX } from 'lucide-react'
import { getFotosPerfilPorEmpresa } from '@/lib/queries/perfilPublico'
import Avatar from '@/components/Avatar'
import BotaoExcluirConfirmando from '@/components/BotaoExcluirConfirmando'
import { cn, mensagemErroGravacao } from '@/lib/utils'
import { PILARES_CULTURAIS } from '@/lib/pilaresCulturais'

function toRoman(num: number) {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let n = num, out = ''
  for (const [v, s] of map) { while (n >= v) { out += s; n -= v } }
  return out
}

// Valores cadastrados já com o numeral ("I. Excelência...") apareciam com o número duas vezes.
function semNumeral(texto: string) {
  return texto.replace(/^\s*[IVXLCDM]+\s*[.)–-]\s*/, '')
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Detalhamento do valor (como se vive / como não se vive), achado pelo título.
// Só existe para os valores da CTZ; outro texto fica sem detalhamento.
function detalheDoValor(texto: string) {
  const t = normalizar(semNumeral(texto))
  return PILARES_CULTURAIS.find((p) => {
    const titulo = normalizar(p.titulo)
    return t.includes(titulo) || titulo.includes(t)
  })
}

// "Faz A. Faz B." → ["Faz A.", "Faz B."]
const frases = (texto: string) =>
  texto.split(/\.\s+/).filter(Boolean).map((f, i, todas) => (i < todas.length - 1 ? `${f}.` : f))

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Título de seção: selo pequeno + título + descrição, com ação opcional à direita. */
function TituloSecao({ icon: Icon, eyebrow, titulo, descricao, acao }: {
  icon: typeof Heart
  eyebrow: string
  titulo: string
  descricao?: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-primary">
          <Icon className="w-3.5 h-3.5" />
          <p className="text-[10px] font-bold uppercase tracking-widest">{eyebrow}</p>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground tracking-tight mt-1">{titulo}</h2>
        {descricao && <p className="text-xs text-muted-foreground mt-1">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

// ── Verticais (antes "Mercado": só uma lista de nomes) ─────────────────────
// Guardadas em empresa_identidade.mercado_posicionamento (jsonb). Itens antigos
// são texto puro; os novos são { nome, descricao, foco }. Os dois formatos são lidos.

type Vertical = { nome: string; descricao?: string; foco?: string }

function paraVerticais(val: unknown): Vertical[] {
  let lista: unknown = val
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista) } catch { lista = [lista] }
  }
  if (!Array.isArray(lista)) return []
  return lista
    .map((item): Vertical | null => {
      if (typeof item === 'string') return { nome: item }
      if (item && typeof item === 'object' && typeof (item as any).nome === 'string') {
        const v = item as any
        return { nome: v.nome, descricao: v.descricao || undefined, foco: v.foco || undefined }
      }
      return null
    })
    .filter((v): v is Vertical => v !== null)
}

// Uma cor por posição, só para diferenciar os cartões (não carrega significado).
const TONS_VERTICAL = [
  { barra: 'bg-blue-500', suave: 'bg-blue-500/10', texto: 'text-blue-600' },
  { barra: 'bg-emerald-500', suave: 'bg-emerald-500/10', texto: 'text-emerald-600' },
  { barra: 'bg-amber-500', suave: 'bg-amber-500/10', texto: 'text-amber-600' },
  { barra: 'bg-violet-500', suave: 'bg-violet-500/10', texto: 'text-violet-600' },
  { barra: 'bg-slate-500', suave: 'bg-slate-500/10', texto: 'text-slate-600' },
  { barra: 'bg-rose-500', suave: 'bg-rose-500/10', texto: 'text-rose-600' },
]

const CAMPO_FORM = 'w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function FormVertical({ inicial, onSalvar, onCancelar }: {
  inicial: Vertical
  onSalvar: (v: Vertical) => Promise<void>
  onCancelar: () => void
}) {
  const [form, setForm] = useState({ nome: inicial.nome, descricao: inicial.descricao ?? '', foco: inicial.foco ?? '' })
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    await onSalvar({ nome: form.nome.trim(), descricao: form.descricao.trim() || undefined, foco: form.foco.trim() || undefined })
    setSalvando(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da vertical" autoFocus required className={cn(CAMPO_FORM, 'font-semibold')} />
      <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Propósito: o que essa vertical faz" rows={3} className={cn(CAMPO_FORM, 'resize-none')} />
      <textarea value={form.foco} onChange={(e) => setForm({ ...form, foco: e.target.value })} placeholder="Foco do ano (opcional)" rows={2} className={cn(CAMPO_FORM, 'resize-none')} />
      <div className="flex gap-2">
        <button type="submit" disabled={salvando || !form.nome.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Check className="w-3 h-3" /> {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors">
          <X className="w-3 h-3" /> Cancelar
        </button>
      </div>
    </form>
  )
}

function Verticais({ itens, onSalvar }: { itens: Vertical[]; onSalvar: (itens: Vertical[]) => Promise<boolean> }) {
  const [editando, setEditando] = useState<number | 'nova' | null>(null)

  async function salvar(idx: number | 'nova', v: Vertical) {
    const novos = idx === 'nova' ? [...itens, v] : itens.map((item, i) => (i === idx ? v : item))
    if (await onSalvar(novos)) setEditando(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {itens.map((v, idx) => {
        const tom = TONS_VERTICAL[idx % TONS_VERTICAL.length]
        return (
          <article key={idx} className="group relative glass-panel rounded-2xl overflow-hidden flex flex-col">
            <div className={cn('h-1 w-full', tom.barra)} />
            <div className="p-5 flex-1 flex flex-col">
              {editando === idx ? (
                <FormVertical inicial={v} onSalvar={(nv) => salvar(idx, nv)} onCancelar={() => setEditando(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0', tom.suave, tom.texto)}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-display text-base font-bold text-foreground tracking-tight truncate">{v.nome}</h3>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setEditando(idx)} className="p-1 rounded-md hover:bg-accent transition-colors" aria-label={`Editar ${v.nome}`}>
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <BotaoExcluirConfirmando onConfirmar={async () => { await onSalvar(itens.filter((_, i) => i !== idx)) }} className="p-1" iconClassName="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {v.descricao ? (
                    <p className="text-sm text-foreground/80 leading-relaxed mt-3">{v.descricao}</p>
                  ) : (
                    <button onClick={() => setEditando(idx)} className="text-xs text-muted-foreground/60 italic mt-3 text-left hover:text-primary transition-colors">
                      + Descrever o propósito desta vertical
                    </button>
                  )}

                  {v.foco && (
                    <div className="mt-auto pt-4">
                      <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', tom.texto)}>Foco do ano</p>
                        <p className="text-xs text-foreground/80 leading-relaxed mt-1">{v.foco}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        )
      })}

      {editando === 'nova' ? (
        <div className="glass-panel rounded-2xl p-5">
          <FormVertical inicial={{ nome: '' }} onSalvar={(v) => salvar('nova', v)} onCancelar={() => setEditando(null)} />
        </div>
      ) : (
        <button onClick={() => setEditando('nova')}
          className="min-h-[140px] rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Plus className="w-4 h-4" /> Adicionar vertical
        </button>
      )}
    </div>
  )
}

/** Missão: a última nota do mural, em destaque, com a conversa recolhível.
 *  Grava com campo='mercado_posicionamento' por herança do nome antigo — trocar a
 *  chave esconderia as notas já gravadas. */
function Missao({ campo, clientId, userId, nomeUsuario, fotosPorUserId }: { campo: string; clientId: string; userId: string; nomeUsuario: string; fotosPorUserId: Record<string, string> }) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandido, setExpandido] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const fetchComentarios = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('empresa_identidade_comentarios').select('*').eq('client_id', clientId).eq('campo', campo).order('created_at', { ascending: true })
    setComentarios(data ?? [])
  }, [clientId, campo])

  useEffect(() => { fetchComentarios() }, [fetchComentarios])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim()) return
    setLoading(true)
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.from('empresa_identidade_comentarios').insert({ client_id: clientId, campo, comentario: novoComentario.trim(), autor_nome: nomeUsuario || 'Usuário', user_id: userId })
    const msg = mensagemErroGravacao(error)
    if (msg) { setErro(msg); setLoading(false); return }
    setNovoComentario('')
    await fetchComentarios()
    setLoading(false)
  }

  async function handleExcluir(id: string) {
    setErro(null)
    const supabase = createClient()
    const { data, error } = await supabase.from('empresa_identidade_comentarios').delete().eq('id', id).select('id')
    const msg = mensagemErroGravacao(error, data?.length)
    if (msg) { setErro(msg); return }
    await fetchComentarios()
  }

  const ultimo = comentarios[comentarios.length - 1]
  // A nota costuma começar com "Missão:", redundante sob o título.
  const textoMissao = ultimo ? String(ultimo.comentario).replace(/^\s*miss[aã]o\s*:\s*/i, '') : ''

  return (
    <div className="flex flex-col h-full">
      {ultimo ? (
        <>
          <p className="font-display text-lg md:text-xl font-semibold text-foreground leading-snug tracking-tight">{textoMissao}</p>
          <div className="flex items-center gap-2 mt-4">
            <Avatar
              nome={ultimo.autor_nome ?? 'U'}
              fotoUrl={fotosPorUserId[ultimo.user_id]}
              sizeClassName="w-5 h-5 text-[10px] font-bold"
              corClassName="bg-primary/10 text-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              {ultimo.autor_nome} · {formatDataHora(ultimo.created_at)}
            </p>
            {/* Pente fino (A16): a nota mais recente não tinha botão de excluir. */}
            {ultimo.user_id === userId && (
              <BotaoExcluirConfirmando onConfirmar={() => handleExcluir(ultimo.id)} className="shrink-0" iconClassName="w-3 h-3" />
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground/60 italic">Nenhuma missão registrada ainda.</p>
      )}

      <button onClick={() => setExpandido(!expandido)} className="mt-3 self-start text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
        {expandido ? 'Ocultar histórico' : ultimo ? `Histórico e notas${comentarios.length > 1 ? ` (${comentarios.length})` : ''} →` : '+ Registrar missão'}
      </button>

      {expandido && (
        <div className="mt-3 pt-3 border-t border-border space-y-2.5">
          {comentarios.length > 1 && (
            <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
              {comentarios.slice(0, -1).map((c) => (
                <div key={c.id} className="flex items-start gap-1.5">
                  <Avatar
                    nome={c.autor_nome ?? 'U'}
                    fotoUrl={fotosPorUserId[c.user_id]}
                    sizeClassName="w-5 h-5 text-[10px] font-bold mt-0.5"
                    corClassName="bg-primary/10 text-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-foreground">{c.autor_nome} <span className="text-muted-foreground font-normal">{formatDataHora(c.created_at)}</span></p>
                    <p className="text-xs text-foreground">{c.comentario}</p>
                  </div>
                  {c.user_id === userId && (
                    <BotaoExcluirConfirmando onConfirmar={() => handleExcluir(c.id)} className="shrink-0" iconClassName="w-2.5 h-2.5" />
                  )}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleEnviar} className="flex gap-1.5">
            <input type="text" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Escrever nota..." className="flex-1 px-2.5 py-1.5 text-xs rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            <button type="submit" disabled={loading || !novoComentario.trim()} className="p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"><Send className="w-3 h-3" /></button>
          </form>
          {erro && <p className="text-[11px] text-destructive">{erro}</p>}
        </div>
      )}
    </div>
  )
}

export default function ObjetivoPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [formIdentidade, setFormIdentidade] = useState({ visao_futuro: '' })
  const [verticais, setVerticais] = useState<Vertical[]>([])
  const [editando, setEditando] = useState<string | null>(null)

  const [valores, setValores] = useState<any[]>([])
  const [modalValor, setModalValor] = useState<{ open: boolean; valor: any | null }>({ open: false, valor: null })
  const [textoValor, setTextoValor] = useState('')
  const [salvandoValor, setSalvandoValor] = useState(false)
  // Detalhamento de cada valor: fechado até a pessoa abrir.
  const [valoresAbertos, setValoresAbertos] = useState<Record<string, boolean>>({})

  const [loading, setLoading] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')
  const [fotosPorUserId, setFotosPorUserId] = useState<Record<string, string>>({})
  // Pente fino (A10): gravações recusadas pelo banco pareciam ter dado certo.
  const [erro, setErro] = useState<string | null>(null)

  const nomeEmpresa = empresa?.company_name ? `da ${empresa.company_name}` : 'da empresa'

  const fetchValores = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const { data } = await supabase.from('empresa_valores').select('*').eq('client_id', empresa.id).order('ordem')
    setValores(data ?? [])
  }, [empresa])

  const fetchFotos = useCallback(async () => {
    if (!empresa) return
    const { porUserId } = await getFotosPerfilPorEmpresa(empresa.id)
    setFotosPorUserId(porUserId)
  }, [empresa])

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const [{ data: identidadeData }, { data: funcData }] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).maybeSingle(),
      supabase.from('funcionarios').select('full_name').eq('user_id', user?.id ?? '').eq('client_id', empresa.id).maybeSingle(),
    ])

    setIdentidade(identidadeData)
    if (identidadeData) {
      setFormIdentidade({ visao_futuro: identidadeData.visao_futuro ?? '' })
      setVerticais(paraVerticais(identidadeData.mercado_posicionamento))
    }
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData(); fetchValores(); fetchFotos() }, [fetchData, fetchValores, fetchFotos])

  // Devolve a mensagem de erro (ou null) — update quando a linha já existe,
  // insert quando é o primeiro preenchimento da empresa.
  const gravarIdentidade = useCallback(async (campo: string, valor: unknown): Promise<string | null> => {
    if (!empresa) return null
    setErro(null)
    const supabase = createClient()
    const { data, error } = identidade
      ? await supabase.from('empresa_identidade').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('client_id', empresa.id).select('client_id')
      : await supabase.from('empresa_identidade').insert({ client_id: empresa.id, [campo]: valor }).select('client_id')
    return mensagemErroGravacao(error, data?.length)
  }, [empresa, identidade])

  const handleSalvarVisao = useCallback(async () => {
    const msg = await gravarIdentidade('visao_futuro', formIdentidade.visao_futuro)
    if (msg) { setErro(msg); return }
    setEditando(null); fetchData()
  }, [gravarIdentidade, formIdentidade, fetchData])

  const handleSalvarVerticais = useCallback(async (novas: Vertical[]): Promise<boolean> => {
    const msg = await gravarIdentidade('mercado_posicionamento', novas)
    if (msg) { setErro(msg); return false }
    setVerticais(novas)
    fetchData()
    return true
  }, [gravarIdentidade, fetchData])

  async function handleSalvarValor(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa || !textoValor.trim()) return
    setSalvandoValor(true)
    setErro(null)
    const supabase = createClient()
    const { data, error } = modalValor.valor
      ? await supabase.from('empresa_valores').update({ texto: textoValor.trim(), updated_at: new Date().toISOString() }).eq('id', modalValor.valor.id).select('id')
      : await supabase.from('empresa_valores').insert({ client_id: empresa.id, texto: textoValor.trim(), ordem: valores.length }).select('id')
    setSalvandoValor(false)
    const msg = mensagemErroGravacao(error, data?.length)
    if (msg) { setErro(msg); return }
    setModalValor({ open: false, valor: null })
    setTextoValor('')
    fetchValores()
  }

  async function handleExcluirValor(id: string) {
    setErro(null)
    const supabase = createClient()
    const { data, error } = await supabase.from('empresa_valores').delete().eq('id', id).select('id')
    const msg = mensagemErroGravacao(error, data?.length)
    if (msg) setErro(msg)
    fetchValores()
  }

  function handleAbrirModalValor(valor?: any) {
    setModalValor({ open: true, valor: valor ?? null })
    setTextoValor(valor?.texto ?? '')
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-secondary" />
        <div className="h-56 rounded-3xl bg-secondary" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 rounded-2xl bg-secondary" />
          <div className="h-44 rounded-2xl bg-secondary" />
          <div className="h-44 rounded-2xl bg-secondary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Nosso jeito de ser</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Por que existimos, aonde vamos, como nos organizamos e o que nos guia
          </p>
        </div>
      </div>

      {erro && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">{erro}</p>
      )}

      {/* MISSÃO + VISÃO — abertura da página */}
      <section className="relative glass-panel rounded-3xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(120% 90% at 0% 0%, hsl(var(--primary) / 0.12), transparent 60%), radial-gradient(90% 90% at 100% 100%, hsl(var(--primary) / 0.07), transparent 60%)' }} />
        <div className="relative grid grid-cols-1 md:grid-cols-2">

          <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/70">
            <div className="flex items-center gap-1.5 text-primary mb-4">
              <Target className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Missão · Por que existimos</p>
            </div>
            {empresa && <Missao campo="mercado_posicionamento" clientId={empresa.id} userId={userId} nomeUsuario={nomeUsuario} fotosPorUserId={fotosPorUserId} />}
          </div>

          <div data-tour="tour-visao-futuro" className="group p-6 md:p-8">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1.5 text-primary">
                <Compass className="w-3.5 h-3.5" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Visão de futuro · Aonde vamos</p>
              </div>
              {editando !== 'visao_futuro' && (
                <button onClick={() => setEditando('visao_futuro')} className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent shrink-0" aria-label="Editar visão de futuro">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {editando === 'visao_futuro' ? (
              <div className="space-y-2">
                <textarea value={formIdentidade.visao_futuro} onChange={(e) => setFormIdentidade({ visao_futuro: e.target.value })} rows={4}
                  placeholder="Qual é o norte de longo prazo da empresa?"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" autoFocus />
                <div className="flex gap-2">
                  <button onClick={handleSalvarVisao} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"><Check className="w-3 h-3" /> Salvar</button>
                  <button onClick={() => setEditando(null)} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"><X className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            ) : (
              <p className={cn(
                'leading-snug',
                formIdentidade.visao_futuro
                  ? 'font-display text-lg md:text-xl font-semibold text-foreground tracking-tight'
                  : 'text-sm text-muted-foreground/60 italic'
              )}>
                {formIdentidade.visao_futuro || 'Clique no lápis para adicionar a visão de futuro...'}
              </p>
            )}
          </div>

        </div>
      </section>

      {/* VERTICAIS */}
      <section data-tour="tour-mercado" className="space-y-4">
        <TituloSecao
          icon={Layers}
          eyebrow="Como nos organizamos"
          titulo="Nossas verticais"
          descricao={`As frentes de negócio ${nomeEmpresa} e o propósito de cada uma.`}
        />
        <Verticais itens={verticais} onSalvar={handleSalvarVerticais} />
      </section>

      {/* VALORES */}
      <section data-tour="tour-valores" className="space-y-4">
        <TituloSecao
          icon={Sparkles}
          eyebrow="Cultura"
          titulo="Nossos valores"
          descricao={`O que guia as decisões ${nomeEmpresa} no dia a dia.`}
          acao={
            <button onClick={() => handleAbrirModalValor()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Adicionar valor
            </button>
          }
        />
        {valores.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic">Nenhum valor cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {valores.map((valor, idx) => {
              const detalhe = detalheDoValor(valor.texto)
              const aberto = !!valoresAbertos[valor.id]
              return (
              <div key={valor.id} className="group relative glass-panel rounded-2xl p-5 flex flex-col gap-3 min-h-[140px]">
                <span className="font-display text-3xl font-bold text-primary/25 leading-none tabular-nums">{toRoman(idx + 1)}</span>
                <p className="text-sm font-semibold text-foreground leading-snug">{semNumeral(valor.texto)}</p>
                {detalhe && (
                  <div className="mt-auto pt-1">
                    <button
                      onClick={() => setValoresAbertos((prev) => ({ ...prev, [valor.id]: !aberto }))}
                      aria-expanded={aberto}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {aberto ? 'Ocultar' : 'Como se aplica'}
                      <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', aberto && 'rotate-180')} />
                    </button>
                    {aberto && (
                      <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                        <div>
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 mb-1.5">
                            <CircleCheck className="w-3.5 h-3.5" /> Como se vive
                          </p>
                          <ul className="space-y-1">
                            {frases(detalhe.como_se_vive).map((f) => (
                              <li key={f} className="text-xs text-foreground/90 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1 before:h-1 before:rounded-full before:bg-emerald-500">
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600 mb-1.5">
                            <CircleX className="w-3.5 h-3.5" /> Como não se vive
                          </p>
                          <p className="text-xs text-foreground/90 leading-relaxed">{detalhe.como_nao_se_vive}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute right-3 top-3 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button onClick={() => handleAbrirModalValor(valor)} className="p-1 rounded-md hover:bg-accent transition-colors" aria-label="Editar valor">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <BotaoExcluirConfirmando onConfirmar={() => handleExcluirValor(valor.id)} className="p-1" iconClassName="w-3.5 h-3.5" />
                </div>
              </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal Cadastrar/Editar Valor */}
      {modalValor.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setModalValor({ open: false, valor: null }); setTextoValor('') }} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {modalValor.valor ? 'Editar Valor' : 'Cadastrar Valor'}
            </h2>
            <form onSubmit={handleSalvarValor} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Valor da empresa</label>
                <textarea
                  value={textoValor}
                  onChange={(e) => setTextoValor(e.target.value)}
                  rows={3}
                  placeholder="Ex: Foco no cliente, Integridade, Inovação..."
                  required autoFocus
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setModalValor({ open: false, valor: null }); setTextoValor('') }}
                  className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoValor || !textoValor.trim()}
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {salvandoValor ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
