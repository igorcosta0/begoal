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

interface EditableBlockProps {
  campo: string
  label?: string
  placeholder: string
  multiline?: boolean
  value: string
  editando: string | null
  onEdit: (campo: string) => void
  onChange: (campo: string, valor: string) => void
  onSalvar: (campo: string) => void
  onCancelar: () => void
  dark?: boolean
}

function EditableBlock({
  campo, label, placeholder, multiline = false,
  value, editando, onEdit, onChange, onSalvar, onCancelar, dark = false,
}: EditableBlockProps) {
  const isEditing = editando === campo
  const baseInput = `w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 resize-none`
  const lightInput = `${baseInput} border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring`
  const darkInput = `${baseInput} border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:ring-white/30`

  return (
    <div className="group relative">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>{label}</p>
          {!isEditing && (
            <button onClick={() => onEdit(campo)} className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${dark ? 'hover:bg-white/10' : 'hover:bg-accent'}`}>
              <Edit2 className={`w-3 h-3 ${dark ? 'text-white/50' : 'text-muted-foreground'}`} />
            </button>
          )}
        </div>
      )}
      {!label && !isEditing && (
        <button onClick={() => onEdit(campo)} className={`absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded z-10 ${dark ? 'hover:bg-white/10' : 'hover:bg-accent'}`}>
          <Edit2 className={`w-3 h-3 ${dark ? 'text-white/50' : 'text-muted-foreground'}`} />
        </button>
      )}
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea value={value} onChange={(e) => onChange(campo, e.target.value)} rows={4}
              placeholder={placeholder} className={dark ? darkInput : lightInput} autoFocus />
          ) : (
            <input type="text" value={value} onChange={(e) => onChange(campo, e.target.value)}
              placeholder={placeholder} className={dark ? darkInput.replace('resize-none', '') : lightInput.replace('resize-none', '')} autoFocus />
          )}
          <div className="flex gap-2">
            <button onClick={() => onSalvar(campo)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${dark ? 'bg-white text-gray-900' : 'bg-primary text-primary-foreground'}`}>
              <Check className="w-3 h-3" /> Salvar
            </button>
            <button onClick={onCancelar} className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs ${dark ? 'border-white/20 text-white/60' : 'border-border text-muted-foreground'}`}>
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${value ? (dark ? 'text-white/90' : 'text-foreground') : (dark ? 'text-white/30 italic' : 'text-muted-foreground/50 italic')}`}>
          {value || placeholder}
        </p>
      )}
    </div>
  )
}

interface ComentariosBlockProps {
  campo: string
  clientId: string
  userId: string
  nomeUsuario: string
}

function ComentariosBlock({ campo, clientId, userId, nomeUsuario }: ComentariosBlockProps) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrar, setMostrar] = useState(false)

  const fetchComentarios = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('empresa_identidade_comentarios')
      .select('*')
      .eq('client_id', clientId)
      .eq('campo', campo)
      .order('created_at', { ascending: true })
    setComentarios(data ?? [])
  }, [clientId, campo])

  useEffect(() => {
    if (mostrar) fetchComentarios()
  }, [mostrar, fetchComentarios])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('empresa_identidade_comentarios').insert({
      client_id: clientId,
      campo,
      comentario: novoComentario.trim(),
      autor_nome: nomeUsuario || 'Usuário',
      user_id: userId,
    })
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
      <button
        onClick={() => setMostrar(!mostrar)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="text-base">💬</span>
        {mostrar ? 'Ocultar comentários' : `Comentários${comentarios.length > 0 ? ` (${comentarios.length})` : ''}`}
      </button>

      {mostrar && (
        <div className="mt-3 space-y-3">
          {comentarios.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
          )}
          {comentarios.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group/comment">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary">
                {(c.autor_nome ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-foreground">{c.autor_nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{c.comentario}</p>
              </div>
              {c.user_id === userId && (
                <button
                  onClick={() => handleExcluir(c.id)}
                  className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 rounded hover:bg-accent shrink-0"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))}

          <form onSubmit={handleEnviar} className="flex gap-2 mt-2">
            <input
              type="text"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Adicionar comentário..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !novoComentario.trim()}
              className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function InicioPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [formIdentidade, setFormIdentidade] = useState({
    visao_futuro: '', mercado_posicionamento: '', valores: '',
    campanha_titulo: '', campanha_descricao: '',
  })
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
      { data: identidadeData },
      { data: objs },
      { data: krsData },
      { data: svsData },
      { data: humorData },
      { data: humorHojeData },
      { data: funcData },
    ] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).single(),
      getObjetivos(empresa.id),
      getKrsByEmpresa(empresa.id),
      getSinaisVitais(empresa.id),
      supabase.from('humor_registro').select('humor').eq('client_id', empresa.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('humor_registro').select('humor')
        .eq('client_id', empresa.id).eq('user_id', user?.id ?? '')
        .gte('created_at', new Date().toISOString().split('T')[0]).limit(1),
      supabase.from('funcionarios').select('full_name')
        .eq('user_id', user?.id ?? '').limit(1).single(),
    ])

    setIdentidade(identidadeData)
    if (identidadeData) {
      setFormIdentidade({
        visao_futuro: identidadeData.visao_futuro ?? '',
        mercado_posicionamento: identidadeData.mercado_posicionamento ?? '',
        valores: identidadeData.valores ?? '',
        campanha_titulo: identidadeData.campanha_titulo ?? '',
        campanha_descricao: identidadeData.campanha_descricao ?? '',
      })
    }
    setObjetivos(objs ?? [])
    setKrs(krsData ?? [])
    setSvs(svsData ?? [])
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')
    if (humorData && humorData.length > 0) {
      setMediaHumor(Math.round(humorData.reduce((a: number, h: any) => a + h.humor, 0) / humorData.length))
    }
    if (humorHojeData && humorHojeData.length > 0) setHumorHoje(humorHojeData[0].humor)
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChange = useCallback((campo: string, valor: string) => {
    setFormIdentidade((prev) => ({ ...prev, [campo]: valor }))
  }, [])
  const handleEdit = useCallback((campo: string) => { setEditando(campo) }, [])
  const handleCancelar = useCallback(() => { setEditando(null) }, [])
  const handleSalvar = useCallback(async (campo: string) => {
    if (!empresa) return
    const supabase = createClient()
    const valor = (formIdentidade as any)[campo]
    if (identidade) {
      await supabase.from('empresa_identidade').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('client_id', empresa.id)
    } else {
      await supabase.from('empresa_identidade').insert({ client_id: empresa.id, [campo]: valor })
    }
    setEditando(null)
    fetchData()
  }, [empresa, formIdentidade, identidade, fetchData])

  const handleHumor = useCallback(async (valor: number) => {
    if (!empresa) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_registro').insert({ client_id: empresa.id, user_id: user?.id, humor: valor })
    setHumorHoje(valor)
    fetchData()
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

  const progressoGeral = objetivosComKrs.length > 0
    ? objetivosComKrs.reduce((a, obj) => a + obj.progresso, 0) / objetivosComKrs.length : 0
  const krsAtivos = krs.filter((kr) => !kr.concluido).length

  const sinalStatus = (sv: any) => {
    const prog = sv.meta > 0 ? Math.max(0, ((sv.valor_atual - sv.valor_inicial) / (sv.meta - sv.valor_inicial)) * 100) : 0
    if (prog >= 70) return { cor: 'bg-emerald-500', texto: 'text-emerald-600', label: 'Saudável' }
    if (prog >= 40) return { cor: 'bg-amber-500', texto: 'text-amber-600', label: 'Atenção' }
    return { cor: 'bg-red-500', texto: 'text-red-600', label: 'Crítico' }
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-56 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl bg-secondary" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ═══ HERO ═══ */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 40%, #1a4a7a 100%)' }}>
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />

        <div className="relative z-10 p-8 md:p-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-blue-200/60 text-xs font-medium uppercase tracking-widest mb-1 capitalize">{dataHoje}</p>
              <p className="text-white/90 text-lg font-medium">
                {hora}{nomeUsuario ? `, ${nomeUsuario}` : ''} 👋
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-20">
                <p className="text-xl font-bold text-white">{krsAtivos}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">KRs ativos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-20">
                <p className="text-xl font-bold text-white">{formatPercent(progressoGeral)}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">Progresso</p>
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none mb-6">
            {nomeUsuario || empresa?.company_name}
          </h1>

          <div className="group relative">
            {editando === 'visao_futuro' ? (
              <div className="space-y-2">
                <textarea
                  value={formIdentidade.visao_futuro}
                  onChange={(e) => handleChange('visao_futuro', e.target.value)}
                  rows={2} placeholder="Qual é o norte de longo prazo da empresa?"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSalvar('visao_futuro')} className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-semibold">
                    <Check className="w-3 h-3" /> Salvar
                  </button>
                  <button onClick={handleCancelar} className="flex items-center gap-1.5 px-4 py-1.5 border border-white/20 rounded-lg text-xs text-white/60">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="w-1 self-stretch bg-blue-400/60 rounded-full shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-blue-300/70 uppercase tracking-widest mb-1">Visão de Futuro</p>
                  <p className={`text-base font-light leading-relaxed ${formIdentidade.visao_futuro ? 'text-white/90' : 'text-white/25 italic text-sm'}`}>
                    {formIdentidade.visao_futuro || 'Clique no lápis para adicionar a visão de futuro da empresa...'}
                  </p>
                </div>
                <button onClick={() => handleEdit('visao_futuro')} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white/10 shrink-0">
                  <Edit2 className="w-4 h-4 text-white/40" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ IDENTIDADE ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Mercado */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Mercado</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posicionamento</p>
            </div>
          </div>
          <EditableBlock
            campo="mercado_posicionamento"
            placeholder="Onde atuamos e qual nosso diferencial competitivo?"
            multiline value={formIdentidade.mercado_posicionamento}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
          {empresa && (
            <ComentariosBlock
              campo="mercado_posicionamento"
              clientId={empresa.id}
              userId={userId}
              nomeUsuario={nomeUsuario}
            />
          )}
        </div>

        {/* Valores */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center border border-violet-100">
              <Heart className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Valores</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Princípios</p>
            </div>
          </div>
          <EditableBlock
            campo="valores"
            placeholder="Ex: Foco no Cliente, Inovação, Integridade..."
            multiline value={formIdentidade.valores}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
          {empresa && (
            <ComentariosBlock
              campo="valores"
              clientId={empresa.id}
              userId={userId}
              nomeUsuario={nomeUsuario}
            />
          )}
        </div>

        {/* Pulso do time */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <span className="text-sm">💚</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Pulso do time</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Como você está?</p>
            </div>
          </div>
          {humorHoje ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.label}</p>
                  <p className="text-xs text-muted-foreground">Registrado hoje</p>
                </div>
              </div>
              {mediaHumor && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Média do time</p>
                  <p className="text-sm font-medium text-foreground">
                    {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Selecione como está se sentindo hoje</p>
              <div className="flex gap-1.5">
                {HUMOR_EMOJIS.map((h) => (
                  <button key={h.valor} onClick={() => handleHumor(h.valor)}
                    className="flex-1 flex flex-col items-center py-2 rounded-xl hover:bg-accent transition-all hover:scale-105" title={h.label}>
                    <span className="text-xl">{h.emoji}</span>
                  </button>
                ))}
              </div>
              {mediaHumor && (
                <p className="text-xs text-muted-foreground mt-3">
                  Média do time: {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CAMPANHA ═══ */}
      {(
  formIdentidade.campanha_titulo ||
  formIdentidade.campanha_descricao ||
  editando === 'campanha_titulo' ||
  editando === 'campanha_descricao'
) ? (
        <div className="relative rounded-2xl overflow-hidden border border-amber-200/60"
          style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400" />
          <div className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Campanha Ativa</p>
              <EditableBlock
                campo="campanha_titulo"
                placeholder="Título da campanha"
                value={formIdentidade.campanha_titulo}
                editando={editando} onEdit={handleEdit} onChange={handleChange}
                onSalvar={handleSalvar} onCancelar={handleCancelar}
              />
              <EditableBlock
                campo="campanha_descricao"
                placeholder="Descrição da campanha..."
                multiline value={formIdentidade.campanha_descricao}
                editando={editando} onEdit={handleEdit} onChange={handleChange}
                onSalvar={handleSalvar} onCancelar={handleCancelar}
              />
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => handleEdit('campanha_titulo')}
          className="w-full border border-dashed border-border rounded-2xl p-5 hover:border-primary/50 hover:bg-accent/20 transition-all group">
          <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Adicionar campanha ativa</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Comunique iniciativas, treinamentos ou movimentos estratégicos</p>
        </button>
      )}

      {/* ═══ PERFORMANCE ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* OKRs */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">OKRs</p>
                <p className="text-[10px] text-muted-foreground">{objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''} · {krs.length} KRs</p>
              </div>
            </div>
            <Link href="/okr" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {objetivosComKrs.slice(0, 4).map((obj) => (
              <div key={obj.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-foreground truncate flex-1 mr-3">{obj.titulo}</p>
                  <span className={`text-xs font-bold shrink-0 ${obj.progresso >= 70 ? 'text-emerald-600' : obj.progresso >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {formatPercent(obj.progresso)}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${obj.progresso >= 70 ? 'bg-emerald-500' : obj.progresso >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(obj.progresso, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{obj.krs.length} Key Result{obj.krs.length !== 1 ? 's' : ''}</p>
              </div>
            ))}
            {objetivosComKrs.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-2">Nenhum objetivo cadastrado.</p>
                <Link href="/okr" className="text-xs text-primary hover:underline font-medium">Criar primeiro objetivo →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sinais Vitais */}
        <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sinais Vitais</p>
                <p className="text-[10px] text-muted-foreground">Saúde do negócio</p>
              </div>
            </div>
            <Link href="/sinais-vitais" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {svs.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum indicador configurado</p>
              <p className="text-xs text-muted-foreground mb-4">Configure KPIs para monitorar a saúde do negócio.</p>
              <Link href="/sinais-vitais"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:opacity-90">
                <Plus className="w-3 h-3" /> Criar indicador
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {svs.slice(0, 6).map((sv) => {
                const status = sinalStatus(sv)
                return (
                  <div key={sv.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/40 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.cor}`} />
                    <p className="text-xs font-medium text-foreground truncate flex-1">{sv.titulo}</p>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}</p>
                      <p className={`text-[10px] font-medium ${status.texto}`}>{status.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}