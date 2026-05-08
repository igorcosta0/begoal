'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { getSinaisVitais } from '@/lib/queries/sinais-vitais'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Edit2, Check, X, ArrowRight, TrendingUp, Activity, Heart, Megaphone, Target, Plus, Send, Trash2 } from 'lucide-react'
import Link from 'next/link'

const HUMOR_EMOJIS = [
  { valor: 1, emoji: '😔', label: 'Muito mal' },
  { valor: 2, emoji: '😟', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '😊', label: 'Bem' },
  { valor: 5, emoji: '😄', label: 'Ótimo' },
]

function ComentariosBlock({ campo, clientId, userId, nomeUsuario }: { campo: string; clientId: string; userId: string; nomeUsuario: string }) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrar, setMostrar] = useState(false)

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

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button onClick={() => setMostrar(!mostrar)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
        <span>💬</span>
        {mostrar ? 'Ocultar' : `Comentários${comentarios.length > 0 ? ` (${comentarios.length})` : ''}`}
      </button>
      {mostrar && (
        <div className="mt-2 space-y-2">
          {comentarios.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>}
          {comentarios.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 group/comment">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary">{(c.autor_nome ?? 'U').charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground">{c.autor_nome} <span className="text-muted-foreground font-normal">{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></p>
                <p className="text-xs text-foreground">{c.comentario}</p>
              </div>
              {c.user_id === userId && (
                <button onClick={() => handleExcluir(c.id)} className="opacity-0 group-hover/comment:opacity-100 p-0.5 rounded shrink-0">
                  <Trash2 className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={handleEnviar} className="flex gap-1.5">
            <input type="text" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Comentar..." className="flex-1 px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            <button type="submit" disabled={loading || !novoComentario.trim()} className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"><Send className="w-3 h-3" /></button>
          </form>
        </div>
      )}
    </div>
  )
}

function ListaItens({ campo, itens, placeholder, onSalvar }: { campo: string; itens: string[]; placeholder: string; onSalvar: (campo: string, itens: string[]) => Promise<void> }) {
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [novoItem, setNovoItem] = useState('')
  const [adicionando, setAdicionando] = useState(false)

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
    <div className="space-y-1">
      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
        {itens.length === 0 && !adicionando && <p className="text-xs text-muted-foreground/50 italic">{placeholder}</p>}
        {itens.map((item, idx) => (
          <div key={idx} className="group/item flex items-start gap-1.5">
            {editandoIdx === idx ? (
              <div className="flex-1 flex gap-1">
                <input type="text" value={textoEdicao} onChange={(e) => setTextoEdicao(e.target.value)}
                  className="flex-1 px-2 py-0.5 text-xs rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditarSalvar(idx); if (e.key === 'Escape') setEditandoIdx(null) }} />
                <button onClick={() => handleEditarSalvar(idx)} className="p-0.5 rounded bg-primary text-primary-foreground"><Check className="w-3 h-3" /></button>
                <button onClick={() => setEditandoIdx(null)} className="p-0.5 rounded border border-border text-muted-foreground"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <>
                <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                <p className="flex-1 text-xs text-foreground leading-snug">{item}</p>
                <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0">
                  <button onClick={() => { setEditandoIdx(idx); setTextoEdicao(item) }} className="p-0.5 rounded hover:bg-accent"><Edit2 className="w-2.5 h-2.5 text-muted-foreground" /></button>
                  <button onClick={() => handleExcluir(idx)} className="p-0.5 rounded hover:bg-accent"><Trash2 className="w-2.5 h-2.5 text-muted-foreground" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {adicionando ? (
        <form onSubmit={handleAdicionar} className="flex gap-1 mt-1">
          <input type="text" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item..." autoFocus
            className="flex-1 px-2 py-1 text-xs rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => { if (e.key === 'Escape') setAdicionando(false) }} />
          <button type="submit" disabled={!novoItem.trim()} className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-50"><Check className="w-3 h-3" /></button>
          <button type="button" onClick={() => setAdicionando(false)} className="p-1 rounded border border-border text-muted-foreground"><X className="w-3 h-3" /></button>
        </form>
      ) : (
        <button onClick={() => setAdicionando(true)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1">
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      )}
    </div>
  )
}

export default function InicioPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [formIdentidade, setFormIdentidade] = useState({ visao_futuro: '', campanha_titulo: '', campanha_descricao: '' })
  const [mercadoItens, setMercadoItens] = useState<string[]>([])
  const [valoresItens, setValoresItens] = useState<string[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [verCampanha, setVerCampanha] = useState(false)
  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [svs, setSvs] = useState<any[]>([])
  const [humorHoje, setHumorHoje] = useState<number | null>(null)
  const [mediaHumor, setMediaHumor] = useState<number | null>(null)
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

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const [
      { data: identidadeData }, { data: objs }, { data: krsData }, { data: svsData },
      { data: humorData }, { data: humorHojeData }, { data: funcData },
    ] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).maybeSingle(),
      getObjetivos(empresa.id), getKrsByEmpresa(empresa.id), getSinaisVitais(empresa.id),
      supabase.from('humor_registro').select('humor').eq('client_id', empresa.id).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('humor_registro').select('humor').eq('client_id', empresa.id).eq('user_id', user?.id ?? '').gte('created_at', new Date().toISOString().split('T')[0]).limit(1),
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
      setValoresItens(parseLista(identidadeData.valores))
    }
    setObjetivos(objs ?? []); setKrs(krsData ?? []); setSvs(svsData ?? [])
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')
    if (humorData && humorData.length > 0) setMediaHumor(Math.round(humorData.reduce((a: number, h: any) => a + h.humor, 0) / humorData.length))
    if (humorHojeData && humorHojeData.length > 0) setHumorHoje(humorHojeData[0].humor)
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

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
    if (campo === 'valores') setValoresItens(novosItens)
    fetchData()
  }, [empresa, identidade, fetchData])

  const handleHumor = useCallback(async (valor: number) => {
    if (!empresa) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_registro').insert({ client_id: empresa.id, user_id: user?.id, humor: valor })
    setHumorHoje(valor); fetchData()
  }, [empresa, fetchData])

  const objetivosComKrs = objetivos.map((obj) => ({
    ...obj,
    krs: krs.filter((kr) => kr.objetivo_id === obj.id).map((kr) => ({
      ...kr,
      progresso: kr.meta > 0 ? Math.max(0, ((kr.valor_atual - kr.valor_inicial) / (kr.meta - kr.valor_inicial)) * 100) : 0,
    })),
  })).map((obj) => ({
    ...obj,
    progresso: obj.krs.length > 0 ? obj.krs.reduce((a: number, kr: any) => a + (kr.progresso ?? 0), 0) / obj.krs.length : 0,
  }))

  const progressoGeral = objetivosComKrs.length > 0 ? objetivosComKrs.reduce((a, obj) => a + obj.progresso, 0) / objetivosComKrs.length : 0
  const krsAtivos = krs.filter((kr) => !kr.concluido).length
  const temCampanha = !!(formIdentidade.campanha_titulo || formIdentidade.campanha_descricao)

  const sinalStatus = (sv: any) => {
    const prog = sv.meta > 0 ? Math.max(0, ((sv.valor_atual - sv.valor_inicial) / (sv.meta - sv.valor_inicial)) * 100) : 0
    if (prog >= 70) return { cor: 'bg-emerald-500', borda: 'border-emerald-200', texto: 'text-emerald-600', label: 'Saudável', prog }
    if (prog >= 40) return { cor: 'bg-amber-500', borda: 'border-amber-200', texto: 'text-amber-600', label: 'Atenção', prog }
    return { cor: 'bg-red-500', borda: 'border-red-200', texto: 'text-red-600', label: 'Crítico', prog }
  }

  if (loading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-48px)] animate-pulse">
        <div className="flex-1 space-y-4">
          <div className="h-40 rounded-2xl bg-secondary" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-secondary" />)}
          </div>
          <div className="h-36 rounded-2xl bg-secondary" />
        </div>
        <div className="w-64 rounded-2xl bg-secondary" />
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
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 40%, #1a4a7a 100%)' }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
            <div className="relative z-10 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-200/60 text-[10px] font-medium uppercase tracking-widest capitalize">{dataHoje}</p>
                  <p className="text-white/90 text-base font-medium mt-0.5">{hora}{nomeUsuario ? `, ${nomeUsuario}` : ''} 👋</p>
                </div>
                <div className="flex items-center gap-2">
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
                    <p className="text-lg font-bold text-white">{krsAtivos}</p>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider">KRs ativos</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white">{formatPercent(progressoGeral)}</p>
                    <p className="text-[9px] text-white/50 uppercase tracking-wider">Progresso</p>
                  </div>
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-none mb-4">
                {nomeUsuario || empresa?.company_name}
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

        {/* IDENTIDADE */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100">
                <Target className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Mercado</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Posicionamento</p>
              </div>
            </div>
            <div className="flex-1">
              <ListaItens campo="mercado_posicionamento" itens={mercadoItens} placeholder="Adicione onde atuamos..." onSalvar={handleSalvarLista} />
            </div>
            {empresa && <ComentariosBlock campo="mercado_posicionamento" clientId={empresa.id} userId={userId} nomeUsuario={nomeUsuario} />}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center border border-violet-100">
                <Heart className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Valores</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Princípios</p>
              </div>
            </div>
            <div className="flex-1">
              <ListaItens campo="valores" itens={valoresItens} placeholder="Adicione os princípios..." onSalvar={handleSalvarLista} />
            </div>
            {empresa && <ComentariosBlock campo="valores" clientId={empresa.id} userId={userId} nomeUsuario={nomeUsuario} />}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <span className="text-xs">💚</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Pulso do time</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Como você está?</p>
              </div>
            </div>
            {humorHoje ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.label}</p>
                    <p className="text-[10px] text-muted-foreground">Registrado hoje</p>
                  </div>
                </div>
                {mediaHumor && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Média do time</p>
                    <p className="text-xs font-medium text-foreground">{HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Como está se sentindo hoje?</p>
                <div className="flex gap-1">
                  {HUMOR_EMOJIS.map((h) => (
                    <button key={h.valor} onClick={() => handleHumor(h.valor)} className="flex-1 flex flex-col items-center py-1.5 rounded-lg hover:bg-accent transition-all hover:scale-105" title={h.label}>
                      <span className="text-lg">{h.emoji}</span>
                    </button>
                  ))}
                </div>
                {mediaHumor && <p className="text-[10px] text-muted-foreground mt-2">Média: {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}</p>}
              </div>
            )}
          </div>
        </div>

        {/* ═══ OKRs — GRÁFICO DE COLUNAS CORRIGIDO ═══ */}
        <div className="bg-card border border-border rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">OKRs</p>
                <p className="text-[9px] text-muted-foreground">
                  {objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''} · {krs.length} KRs
                </p>
              </div>
            </div>
            <Link href="/okr" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 flex items-end justify-around gap-4 pb-2 px-2">
            {objetivosComKrs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center mb-8">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Nenhum objetivo cadastrado.</p>
                  <Link href="/okr" className="text-xs text-primary hover:underline">Criar primeiro objetivo →</Link>
                </div>
              </div>
            ) : (
              objetivosComKrs.slice(0, 5).map((obj) => {
                const progresso = Math.min(obj.progresso, 100);
                const corBarra = progresso >= 70 ? 'bg-emerald-500' : progresso >= 40 ? 'bg-amber-500' : 'bg-red-500';
                const corTexto = progresso >= 70 ? 'text-emerald-600' : progresso >= 40 ? 'text-amber-600' : 'text-red-600';

                return (
                  <div key={obj.id} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <span className={`text-[10px] font-bold mb-2 ${corTexto}`}>
                      {formatPercent(progresso)}
                    </span>

                    {/* Container da Barra */}
                    <div className="w-full max-w-[40px] bg-secondary/30 rounded-t-lg relative flex items-end overflow-hidden h-[120px]">
                      <div
                        className={`w-full ${corBarra} transition-all duration-500 ease-out rounded-t-sm`}
                        style={{ height: `${Math.max(progresso, 4)}%` }}
                      />
                    </div>

                    <p className="text-[9px] text-muted-foreground text-center mt-3 leading-tight line-clamp-2 h-6 w-full">
                      {obj.titulo}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ COLUNA DIREITA — SINAIS VITAIS ═══ */}
      <div className="w-64 shrink-0 bg-card border border-border rounded-2xl p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Sinais Vitais</p>
              <p className="text-[9px] text-muted-foreground">Saúde do negócio</p>
            </div>
          </div>
          <Link href="/sinais-vitais" className="text-[10px] text-primary hover:underline font-medium">Ver tudo</Link>
        </div>

        {svs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">Nenhum indicador</p>
            <p className="text-[10px] text-muted-foreground mb-3">Configure KPIs para monitorar a saúde do negócio.</p>
            <Link href="/sinais-vitais" className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90">
              <Plus className="w-3 h-3" /> Criar
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {svs.map((sv) => {
              const status = sinalStatus(sv)
              return (
                <div key={sv.id} className={`p-3 rounded-xl border ${status.borda} bg-card hover:shadow-sm transition-shadow`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[11px] font-medium text-foreground leading-snug flex-1">{sv.titulo}</p>
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${status.cor}`} />
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-base font-bold text-foreground leading-none">{formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}</p>
                      <p className={`text-[10px] font-medium mt-0.5 ${status.texto}`}>{status.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground">Meta</p>
                      <p className="text-xs font-semibold text-foreground">{formatNumber(sv.meta ?? 0)}</p>
                    </div>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${status.cor}`} style={{ width: `${Math.min(status.prog, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}