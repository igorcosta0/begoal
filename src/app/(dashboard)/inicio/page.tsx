'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { formatPercent } from '@/lib/utils'
import {
  Edit2, Check, X, ArrowRight, TrendingUp, Megaphone, Plus, Send, Trash2,
  MapPin, MessageCircle, Sparkles, Library, Compass,
} from 'lucide-react'
import Link from 'next/link'

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

export default function InicioPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [formIdentidade, setFormIdentidade] = useState({ visao_futuro: '', campanha_titulo: '', campanha_descricao: '' })
  const [mercadoItens, setMercadoItens] = useState<string[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [verCampanha, setVerCampanha] = useState(false)

  const [valores, setValores] = useState<any[]>([])
  const [modalValor, setModalValor] = useState<{ open: boolean; valor: any | null }>({ open: false, valor: null })
  const [textoValor, setTextoValor] = useState('')
  const [salvandoValor, setSalvandoValor] = useState(false)

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')
  const [hora, setHora] = useState('')
  const [dataHoje, setDataHoje] = useState('')

  useEffect(() => {
    const agora = new Date()
    const h = agora.getHours()
    if (h < 12) setHora('Bom dia')
    else if (h < 18) setHora('Boa tarde')
    else setHora('Boa noite')
    setDataHoje(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))
  }, [])

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

    const [
      { data: identidadeData }, { data: objs }, { data: krsData }, { data: funcData },
    ] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).maybeSingle(),
      getObjetivos(empresa.id), getKrsByEmpresa(empresa.id),
      supabase.from('funcionarios').select('full_name').eq('user_id', user?.id ?? '').maybeSingle(),
    ])

    setIdentidade(identidadeData)
    if (identidadeData) {
      setFormIdentidade({ visao_futuro: identidadeData.visao_futuro ?? '', campanha_titulo: identidadeData.campanha_titulo ?? '', campanha_descricao: identidadeData.campanha_descricao ?? '' })
      const parseLista = (val: any): string[] => {
        if (!val) return []
        if (Array.isArray(val)) return val
        try { return JSON.parse(val) } catch { return [String(val)] }
      }
      setMercadoItens(parseLista(identidadeData.mercado_posicionamento))
    }
    setObjetivos(objs ?? []); setKrs(krsData ?? [])
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

  const objetivosComKrs = objetivos.map((obj) => ({
    ...obj,
    krs: krs.filter((kr) => kr.objetivo_id === obj.id).map((kr) => ({
      ...kr,
      progresso: (() => {
        const atual = kr.valor_atual ?? kr.valor_inicial ?? 0
        const inicial = kr.valor_inicial ?? 0
        const meta = kr.meta ?? 0
        if (meta === inicial) return 0
        if (meta < inicial) return Math.min(100, Math.max(0, ((inicial - atual) / (inicial - meta)) * 100))
        return Math.min(100, Math.max(0, ((atual - inicial) / (meta - inicial)) * 100))
      })(),
    })),
  })).map((obj) => ({
    ...obj,
    progresso: obj.krs.length > 0 ? obj.krs.reduce((a: number, kr: any) => a + (kr.progresso ?? 0), 0) / obj.krs.length : 0,
  }))

  const progressoGeral = objetivosComKrs.length > 0 ? objetivosComKrs.reduce((a, obj) => a + obj.progresso, 0) / objetivosComKrs.length : 0
  const krsAtivos = krs.filter((kr: any) => !kr.concluido).length
  const temCampanha = !!(formIdentidade.campanha_titulo || formIdentidade.campanha_descricao)

  if (loading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-48px)] animate-pulse">
        <div className="flex-1 space-y-4">
          <div className="h-40 rounded-2xl bg-secondary" />
          <div className="h-24 rounded-2xl bg-secondary" />
          <div className="h-64 rounded-2xl bg-secondary" />
        </div>
        <div className="w-72 rounded-2xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-48px)]">

      {/* ═══ COLUNA ESQUERDA ═══ */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">

        {/* HERO / CAMPANHA */}
        {verCampanha ? (
          <div className="relative rounded-2xl overflow-hidden border border-amber-200/60 shrink-0"
            style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Campanha Ativa</p>
                </div>
                <button onClick={() => { setVerCampanha(false); setEditando(null) }} className="flex items-center gap-1 px-2.5 py-1 border border-amber-300 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition-colors">
                  <X className="w-3 h-3" /> Fechar
                </button>
              </div>
              <div className="group relative mb-2">
                {editando === 'campanha_titulo' ? (
                  <div className="space-y-1.5">
                    <input type="text" value={formIdentidade.campanha_titulo} onChange={(e) => handleChange('campanha_titulo', e.target.value)} placeholder="Título da campanha" autoFocus
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSalvarTexto('campanha_titulo')} className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs"><Check className="w-3 h-3" /> Salvar</button>
                      <button onClick={handleCancelar} className="flex items-center gap-1 px-2.5 py-1 border border-amber-300 rounded-lg text-xs text-amber-700"><X className="w-3 h-3" /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className={`text-xl font-bold ${formIdentidade.campanha_titulo ? 'text-gray-800' : 'text-amber-400 italic text-base font-normal'}`}>{formIdentidade.campanha_titulo || 'Adicionar título...'}</h2>
                    <button onClick={() => handleEdit('campanha_titulo')} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-200"><Edit2 className="w-3 h-3 text-amber-600" /></button>
                  </div>
                )}
              </div>
              <div className="group relative">
                {editando === 'campanha_descricao' ? (
                  <div className="space-y-1.5">
                    <textarea value={formIdentidade.campanha_descricao} onChange={(e) => handleChange('campanha_descricao', e.target.value)} placeholder="Descrição..." rows={2} autoFocus
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSalvarTexto('campanha_descricao')} className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs"><Check className="w-3 h-3" /> Salvar</button>
                      <button onClick={handleCancelar} className="flex items-center gap-1 px-2.5 py-1 border border-amber-300 rounded-lg text-xs text-amber-700"><X className="w-3 h-3" /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className={`text-sm flex-1 ${formIdentidade.campanha_descricao ? 'text-gray-700' : 'text-amber-400 italic'}`}>{formIdentidade.campanha_descricao || 'Adicionar descrição...'}</p>
                    <button onClick={() => handleEdit('campanha_descricao')} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-200 shrink-0"><Edit2 className="w-3 h-3 text-amber-600" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden shrink-0"
            style={{ background: 'radial-gradient(680px 260px at 88% -10%, rgba(96,165,250,0.35), transparent 60%), linear-gradient(135deg, #1e3a5f 0%, #234b7c 45%, #163863 100%)' }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative z-10 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-200/60 text-[10px] font-medium uppercase tracking-widest capitalize">{dataHoje}</p>
                  <p className="text-white/90 text-base font-medium mt-0.5">{hora}{nomeUsuario ? `, ${nomeUsuario}` : ''} 👋</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/guia" className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors">
                    <Compass className="w-3 h-3" /> Guia de Uso
                  </Link>
                  <Link href="/biblioteca" className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors">
                    <Library className="w-3 h-3" /> Biblioteca
                  </Link>
                  {temCampanha ? (
                    <button onClick={() => setVerCampanha(true)} className="flex items-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors">
                      <Megaphone className="w-3 h-3" /> Campanha <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button onClick={() => { setVerCampanha(true); handleEdit('campanha_titulo') }} className="flex items-center gap-1 bg-white/8 hover:bg-white/15 border border-white/15 text-white/50 hover:text-white/80 rounded-xl px-2.5 py-1.5 text-xs transition-colors">
                      <Plus className="w-3 h-3" /> Campanha
                    </button>
                  )}
                  <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white tabular-nums">{krsAtivos}</p>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider">KRs ativos</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white tabular-nums">{formatPercent(progressoGeral)}</p>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider">Progresso</p>
                  </div>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-none mb-4">
                {empresa?.company_name}
              </h1>
              <div className="group relative">
                {editando === 'visao_futuro' ? (
                  <div className="space-y-2">
                    <textarea value={formIdentidade.visao_futuro} onChange={(e) => handleChange('visao_futuro', e.target.value)} rows={2}
                      placeholder="Qual é o norte de longo prazo da empresa?"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => handleSalvarTexto('visao_futuro')} className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-semibold"><Check className="w-3 h-3" /> Salvar</button>
                      <button onClick={handleCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-white/20 rounded-lg text-xs text-white/60"><X className="w-3 h-3" /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative bg-white/8 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-0.5 self-stretch bg-blue-400/60 rounded-full shrink-0" />
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold text-blue-300/70 uppercase tracking-widest mb-0.5">Visão de Futuro</p>
                      <p className={`text-sm font-light leading-relaxed ${formIdentidade.visao_futuro ? 'text-white/90' : 'text-white/25 italic'}`}>
                        {formIdentidade.visao_futuro || 'Clique no lápis para adicionar a visão de futuro...'}
                      </p>
                    </div>
                    <button onClick={() => handleEdit('visao_futuro')} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 shrink-0">
                      <Edit2 className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MERCADO + NOTA — banda única, lado a lado */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shrink-0 grid grid-cols-1 md:grid-cols-[1.3fr_1fr]">
          <div className="p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Mercado</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Onde a empresa atua</p>
              </div>
            </div>
            <ChipList campo="mercado_posicionamento" itens={mercadoItens} placeholder="Adicione onde atuamos..." onSalvar={handleSalvarLista} />
          </div>
          <div className="p-4 md:p-5 border-t md:border-t-0 md:border-l border-border flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center border border-violet-100 shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Nota fixada</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Recado da equipe</p>
              </div>
            </div>
            {empresa && <NotaFixada campo="mercado_posicionamento" clientId={empresa.id} userId={userId} nomeUsuario={nomeUsuario} />}
          </div>
        </div>

        {/* OKRs — GRÁFICO */}
        <div className="bg-card border border-border rounded-2xl p-6 flex-1 min-h-0 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground tracking-tight">Performance de OKRs</p>
                <p className="text-[11px] text-muted-foreground font-medium">{objetivos.length} objetivos estratégicos ativos</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {objetivosComKrs.length > 0 && (
                <div className="text-right">
                  <p className="text-xl font-extrabold text-primary tabular-nums leading-none">{formatPercent(progressoGeral)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Média geral</p>
                </div>
              )}
              <Link href="/okr" className="group flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-all">
                Painel Completo <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="flex-1 relative flex items-end justify-around gap-6 px-4 pb-4">
            <div className="absolute inset-x-4 inset-y-0 flex flex-col justify-between pointer-events-none opacity-[0.03]">
              {[100, 75, 50, 25, 0].map((line) => (
                <div key={line} className="w-full border-t border-foreground flex justify-end">
                  <span className="text-[8px] -mt-2 pr-1">{line}%</span>
                </div>
              ))}
            </div>

            {objetivosComKrs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center mb-10 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Nenhum dado para exibir</p>
                  <Link href="/okr" className="text-xs text-primary hover:underline font-bold">Definir metas agora</Link>
                </div>
              </div>
            ) : (
              objetivosComKrs.slice(0, 5).map((obj) => {
                const progresso = Math.min(obj.progresso, 100)
                const config =
                  progresso >= 70 ? { bg: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20', text: 'text-emerald-600' } :
                  progresso >= 40 ? { bg: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/20', text: 'text-amber-600' } :
                  { bg: 'from-red-400 to-red-600', shadow: 'shadow-red-500/20', text: 'text-red-600' }

                return (
                  <div key={obj.id} className="flex-1 flex flex-col items-center group relative h-full justify-end max-w-[80px]">
                    <div className="absolute -top-2 opacity-0 group-hover:opacity-100 group-hover:-top-6 transition-all duration-300 z-10 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-bold shadow-xl">
                      {formatPercent(progresso)}
                    </div>
                    <span className={`text-[11px] font-black mb-3 tabular-nums transition-colors duration-300 ${config.text}`}>{formatPercent(progresso)}</span>
                    <div className="w-full max-w-[36px] bg-muted/30 backdrop-blur-[2px] rounded-t-xl relative flex items-end overflow-hidden h-[160px] border border-foreground/[0.03] shadow-inner">
                      <div className={`w-full bg-gradient-to-t ${config.bg} ${config.shadow} transition-all duration-1000 ease-out rounded-t-lg group-hover:brightness-110 shadow-lg`}
                        style={{ height: `${Math.max(progresso, 6)}%` }}>
                        <div className="absolute inset-y-0 left-0 w-1/3 bg-white/20 skew-x-[-15deg] translate-x-[-50%]" />
                      </div>
                    </div>
                    <div className="mt-4 h-10 flex items-start justify-center">
                      <p className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground text-center leading-tight line-clamp-2 transition-colors">{obj.titulo}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ COLUNA DIREITA — VALORES DA EMPRESA ═══ */}
      <div className="w-72 shrink-0 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="relative px-5 py-5 border-b border-border shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(139,92,246,0.14), rgba(139,92,246,0.03) 70%)' }}>
          <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.35) 1px, transparent 0)',
              backgroundSize: '16px 16px',
              maskImage: 'linear-gradient(180deg, black, transparent)',
              WebkitMaskImage: 'linear-gradient(180deg, black, transparent)',
            }} />
          <div className="relative flex items-center gap-1.5 text-violet-600">
            <Sparkles className="w-3 h-3" />
            <p className="text-[9.5px] font-bold uppercase tracking-widest">Cultura</p>
          </div>
          <p className="relative text-lg font-extrabold text-foreground mt-1 tracking-tight">Valores</p>
          <p className="relative text-[11px] text-muted-foreground mt-1 leading-relaxed">
            O que guia as decisões {empresa?.company_name ? `da ${empresa.company_name}` : 'da empresa'} no dia a dia.
          </p>
        </div>

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
