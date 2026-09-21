'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { Heart, Edit2, Check, X, Plus, Trash2, MapPin, MessageCircle, Send, Sparkles, Quote, Compass } from 'lucide-react'

type Tom = { grad: string; dot: string; texto: string }

const TOM_AZUL: Tom = { grad: 'rgba(59,130,246,0.14)', dot: 'rgba(59,130,246,0.35)', texto: 'text-blue-600' }
const TOM_AMBAR: Tom = { grad: 'rgba(245,158,11,0.14)', dot: 'rgba(245,158,11,0.35)', texto: 'text-amber-600' }
const TOM_VIOLETA: Tom = { grad: 'rgba(139,92,246,0.14)', dot: 'rgba(139,92,246,0.35)', texto: 'text-violet-600' }

/** Cabeçalho colorido reutilizado nas 4 seções da página — mesmo padrão visual (faixa em
 *  degradê + textura de pontos + selo/título/descrição), só muda o tom por seção. */
function CabecalhoSecao({ icon: Icon, eyebrow, titulo, descricao, tom }: {
  icon: typeof MapPin
  eyebrow: string
  titulo: string
  descricao: string
  tom: Tom
}) {
  return (
    <div className="relative px-5 py-5 border-b border-border shrink-0 overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${tom.grad}, transparent 70%)` }}>
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${tom.dot} 1px, transparent 0)`,
          backgroundSize: '16px 16px',
          maskImage: 'linear-gradient(180deg, black, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, black, transparent)',
        }} />
      <div className={`relative flex items-center gap-1.5 ${tom.texto}`}>
        <Icon className="w-3 h-3" />
        <p className="text-[9.5px] font-bold uppercase tracking-widest">{eyebrow}</p>
      </div>
      <p className="relative font-display text-lg font-bold text-foreground mt-1 tracking-tight">{titulo}</p>
      <p className="relative text-[11px] text-muted-foreground mt-1 leading-relaxed">{descricao}</p>
    </div>
  )
}

function toRoman(num: number) {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let n = num, out = ''
  for (const [v, s] of map) { while (n >= v) { out += s; n -= v } }
  return out
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Lista de tags editável (chips) — usada para o posicionamento de mercado. */
function ChipList({ campo, itens, placeholder, onSalvar }: { campo: string; itens: string[]; placeholder: string; onSalvar: (campo: string, itens: string[]) => Promise<void> }) {
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [novoItem, setNovoItem] = useState('')

  async function handleEditarSalvar(idx: number) {
    if (!textoEdicao.trim()) return
    const novos = [...itens]; novos[idx] = textoEdicao.trim()
    await onSalvar(campo, novos); setEditandoIdx(null)
  }

  async function handleExcluir(idx: number) {
    await onSalvar(campo, itens.filter((_, i) => i !== idx))
  }

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoItem.trim()) return
    await onSalvar(campo, [...itens, novoItem.trim()])
    setNovoItem(''); setAdicionando(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {itens.length === 0 && !adicionando && (
        <p className="text-xs text-muted-foreground/60 italic">{placeholder}</p>
      )}

      {itens.map((item, idx) =>
        editandoIdx === idx ? (
          <div key={idx} className="flex items-center gap-1">
            <input
              type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)} autoFocus
              className="px-3 py-1.5 text-xs rounded-full border border-primary/40 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditarSalvar(idx); if (e.key === 'Escape') setEditandoIdx(null) }}
            />
            <button onClick={() => handleEditarSalvar(idx)} className="p-1 rounded-full bg-primary text-primary-foreground"><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditandoIdx(null)} className="p-1 rounded-full border border-border text-muted-foreground"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div key={idx} className="group/chip flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold bg-primary/[0.07] text-primary border border-primary/[0.16] transition-colors hover:bg-primary/[0.12]">
            <span>{item}</span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover/chip:opacity-100 transition-opacity">
              <button onClick={() => { setEditandoIdx(idx); setTextoEdicao(item) }} className="p-0.5 rounded-full hover:bg-primary/10"><Edit2 className="w-2.5 h-2.5" /></button>
              <button onClick={() => handleExcluir(idx)} className="p-0.5 rounded-full hover:bg-primary/10"><X className="w-2.5 h-2.5" /></button>
            </span>
          </div>
        )
      )}

      {adicionando ? (
        <form onSubmit={handleAdicionar} className="flex items-center gap-1">
          <input type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item..." autoFocus
            className="px-3 py-1.5 text-xs rounded-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => { if (e.key === 'Escape') setAdicionando(false) }} />
          <button type="submit" disabled={!novoItem.trim()} className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Check className="w-3 h-3" /></button>
          <button type="button" onClick={() => setAdicionando(false)} className="p-1.5 rounded-full border border-border text-muted-foreground"><X className="w-3 h-3" /></button>
        </form>
      ) : (
        <button onClick={() => setAdicionando(true)} className="flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground border border-dashed border-border hover:border-primary/40 hover:text-primary transition-colors">
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      )}
    </div>
  )
}

/** Bloco de nota/comentários fixado — mostra o último registro e permite expandir a conversa. */
function NotaFixada({ campo, clientId, userId, nomeUsuario }: { campo: string; clientId: string; userId: string; nomeUsuario: string }) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandido, setExpandido] = useState(false)

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
    const supabase = createClient()
    await supabase.from('empresa_identidade_comentarios').insert({ client_id: clientId, campo, comentario: novoComentario.trim(), autor_nome: nomeUsuario || 'Usuário', user_id: userId })
    setNovoComentario('')
    await fetchComentarios()
    setLoading(false)
  }

  async function handleExcluir(id: string) {
    const supabase = createClient()
    await supabase.from('empresa_identidade_comentarios').delete().eq('id', id)
    await fetchComentarios()
  }

  const ultimo = comentarios[comentarios.length - 1]

  return (
    <div className="flex-1 flex flex-col">
      {ultimo ? (
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-violet-500/15 text-violet-600 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-px">
            {(ultimo.autor_nome ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-foreground">
              {ultimo.autor_nome} <span className="font-normal text-muted-foreground">{formatDataHora(ultimo.created_at)}</span>
            </p>
            <p className="text-xs leading-snug mt-0.5 text-foreground/90">{ultimo.comentario}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">Nenhuma nota registrada ainda.</p>
      )}

      <button onClick={() => setExpandido(!expandido)} className="mt-2.5 self-start text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
        {expandido ? 'Ocultar conversa' : ultimo ? `Ver conversa${comentarios.length > 1 ? ` (${comentarios.length})` : ''} →` : '+ Adicionar nota'}
      </button>

      {expandido && (
        <div className="mt-3 pt-3 border-t border-border space-y-2.5">
          {comentarios.length > 1 && (
            <div className="max-h-24 overflow-y-auto space-y-2 pr-1">
              {comentarios.slice(0, -1).map((c) => (
                <div key={c.id} className="group/comment flex items-start gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">{(c.autor_nome ?? 'U').charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-foreground">{c.autor_nome} <span className="text-muted-foreground font-normal">{formatDataHora(c.created_at)}</span></p>
                    <p className="text-xs text-foreground">{c.comentario}</p>
                  </div>
                  {c.user_id === userId && (
                    <button onClick={() => handleExcluir(c.id)} className="opacity-0 group-hover/comment:opacity-100 p-0.5 rounded shrink-0">
                      <Trash2 className="w-2.5 h-2.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleEnviar} className="flex gap-1.5">
            <input type="text" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Escrever nota..." className="flex-1 px-2.5 py-1.5 text-xs rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            <button type="submit" disabled={loading || !novoComentario.trim()} className="p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"><Send className="w-3 h-3" /></button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function ObjetivoPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [formIdentidade, setFormIdentidade] = useState({ visao_futuro: '' })
  const [mercadoItens, setMercadoItens] = useState<string[]>([])
  const [editando, setEditando] = useState<string | null>(null)

  const [valores, setValores] = useState<any[]>([])
  const [modalValor, setModalValor] = useState<{ open: boolean; valor: any | null }>({ open: false, valor: null })
  const [textoValor, setTextoValor] = useState('')
  const [salvandoValor, setSalvandoValor] = useState(false)

  const [loading, setLoading] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')

  const fetchValores = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const { data } = await supabase.from('empresa_valores').select('*').eq('client_id', empresa.id).order('ordem')
    setValores(data ?? [])
  }, [empresa])

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const [{ data: identidadeData }, { data: funcData }] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).maybeSingle(),
      supabase.from('funcionarios').select('full_name').eq('user_id', user?.id ?? '').maybeSingle(),
    ])

    setIdentidade(identidadeData)
    if (identidadeData) {
      setFormIdentidade({ visao_futuro: identidadeData.visao_futuro ?? '' })
      const parseLista = (val: any): string[] => {
        if (!val) return []
        if (Array.isArray(val)) return val
        try { return JSON.parse(val) } catch { return [String(val)] }
      }
      setMercadoItens(parseLista(identidadeData.mercado_posicionamento))
    }
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData(); fetchValores() }, [fetchData, fetchValores])

  const handleChange = useCallback((campo: string, valor: string) => { setFormIdentidade((prev) => ({ ...prev, [campo]: valor })) }, [])
  const handleEdit = useCallback((campo: string) => { setEditando(campo) }, [])
  const handleCancelar = useCallback(() => { setEditando(null) }, [])

  const handleSalvarTexto = useCallback(async (campo: string) => {
    if (!empresa) return
    const supabase = createClient()
    const valor = (formIdentidade as any)[campo]
    if (identidade) {
      await supabase.from('empresa_identidade').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('client_id', empresa.id)
    } else {
      await supabase.from('empresa_identidade').insert({ client_id: empresa.id, [campo]: valor })
    }
    setEditando(null); fetchData()
  }, [empresa, formIdentidade, identidade, fetchData])

  const handleSalvarLista = useCallback(async (campo: string, novosItens: string[]) => {
    if (!empresa) return
    const supabase = createClient()
    if (identidade) {
      await supabase.from('empresa_identidade').update({ [campo]: novosItens, updated_at: new Date().toISOString() }).eq('client_id', empresa.id)
    } else {
      await supabase.from('empresa_identidade').insert({ client_id: empresa.id, [campo]: novosItens })
    }
    if (campo === 'mercado_posicionamento') setMercadoItens(novosItens)
    fetchData()
  }, [empresa, identidade, fetchData])

  async function handleSalvarValor(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa || !textoValor.trim()) return
    setSalvandoValor(true)
    const supabase = createClient()
    if (modalValor.valor) {
      await supabase.from('empresa_valores').update({ texto: textoValor.trim(), updated_at: new Date().toISOString() }).eq('id', modalValor.valor.id)
    } else {
      await supabase.from('empresa_valores').insert({ client_id: empresa.id, texto: textoValor.trim(), ordem: valores.length })
    }
    setSalvandoValor(false)
    setModalValor({ open: false, valor: null })
    setTextoValor('')
    fetchValores()
  }

  async function handleExcluirValor(id: string) {
    const supabase = createClient()
    await supabase.from('empresa_valores').delete().eq('id', id)
    fetchValores()
  }

  function handleAbrirModalValor(valor?: any) {
    setModalValor({ open: true, valor: valor ?? null })
    setTextoValor(valor?.texto ?? '')
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-secondary" />
        <div className="h-40 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-secondary" />
          <div className="h-64 rounded-2xl bg-secondary" />
          <div className="h-64 rounded-2xl bg-secondary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Nosso jeito de ser</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {empresa?.company_name} — cultura, mercado e visão de futuro
          </p>
        </div>
      </div>

      {/* VISÃO DE FUTURO — banner de abertura, largura cheia */}
      <div data-tour="tour-visao-futuro" className="glass-panel rounded-2xl overflow-hidden">
        <CabecalhoSecao
          icon={Compass}
          eyebrow="Rumo"
          titulo="Visão de Futuro"
          descricao={`O norte de longo prazo ${empresa?.company_name ? `da ${empresa.company_name}` : 'da empresa'}.`}
          tom={TOM_AZUL}
        />
        <div className="relative p-5 md:p-6">
          <Quote className="absolute top-4 right-5 w-12 h-12 text-primary/[0.08] pointer-events-none -scale-x-100" />
          <div className="group relative">
            {editando === 'visao_futuro' ? (
              <div className="space-y-2 max-w-2xl">
                <textarea value={formIdentidade.visao_futuro} onChange={(e) => handleChange('visao_futuro', e.target.value)} rows={3}
                  placeholder="Qual é o norte de longo prazo da empresa?"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => handleSalvarTexto('visao_futuro')} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"><Check className="w-3 h-3" /> Salvar</button>
                  <button onClick={handleCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"><X className="w-3 h-3" /> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="relative flex items-start gap-3 max-w-2xl">
                <div className="flex-1">
                  <p className={`text-base md:text-lg font-medium leading-relaxed ${formIdentidade.visao_futuro ? 'text-foreground' : 'text-muted-foreground/50 italic text-sm'}`}>
                    {formIdentidade.visao_futuro || 'Clique no lápis para adicionar a visão de futuro...'}
                  </p>
                </div>
                <button onClick={() => handleEdit('visao_futuro')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent shrink-0">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MERCADO · NOTA FIXADA · VALORES — 3 seções lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* MERCADO */}
        <div data-tour="tour-mercado" className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <CabecalhoSecao icon={MapPin} eyebrow="Posicionamento" titulo="Mercado" descricao="Onde a empresa atua." tom={TOM_AZUL} />
          <div className="p-4 md:p-5">
            <ChipList campo="mercado_posicionamento" itens={mercadoItens} placeholder="Adicione onde atuamos..." onSalvar={handleSalvarLista} />
          </div>
        </div>

        {/* NOTA FIXADA */}
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <CabecalhoSecao icon={MessageCircle} eyebrow="Mural" titulo="Nota fixada" descricao="Recado da equipe, sempre à vista." tom={TOM_AMBAR} />
          <div className="p-4 md:p-5 flex-1 flex flex-col">
            {empresa && <NotaFixada campo="mercado_posicionamento" clientId={empresa.id} userId={userId} nomeUsuario={nomeUsuario} />}
          </div>
        </div>

        {/* VALORES */}
        <div data-tour="tour-valores" className="glass-panel rounded-2xl overflow-hidden flex flex-col">
          <CabecalhoSecao
            icon={Sparkles}
            eyebrow="Cultura"
            titulo="Valores"
            descricao={`O que guia as decisões ${empresa?.company_name ? `da ${empresa.company_name}` : 'da empresa'} no dia a dia.`}
            tom={TOM_VIOLETA}
          />

          <div className="flex-1 overflow-y-auto p-2">
            {valores.length === 0 && (
              <p className="text-xs text-muted-foreground/60 italic px-3 py-3">Nenhum valor cadastrado ainda.</p>
            )}
            {valores.map((valor, idx) => (
              <div key={valor.id} className="group relative flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-accent/60 transition-colors border-b border-border/60 last:border-b-0">
                <span className="text-xs font-extrabold text-violet-600 w-5 shrink-0 tabular-nums">{toRoman(idx + 1)}</span>
                <p className="flex-1 text-xs font-semibold text-foreground leading-snug pr-8">{valor.texto}</p>
                <div className="absolute right-2 top-2.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleAbrirModalValor(valor)} className="p-1 rounded-md hover:bg-accent transition-colors">
                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleExcluirValor(valor.id)} className="p-1 rounded-md hover:bg-accent transition-colors">
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => handleAbrirModalValor()}
            className="mx-3 mb-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold shrink-0">
            <Plus className="w-3.5 h-3.5" /> Adicionar valor
          </button>
        </div>

      </div>

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
