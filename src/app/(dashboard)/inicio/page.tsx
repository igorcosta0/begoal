'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { getSinaisVitais } from '@/lib/queries/sinais-vitais'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Edit2, Check, X, ArrowRight, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'

const HUMOR_EMOJIS = [
  { valor: 1, emoji: '😔', label: 'Muito mal' },
  { valor: 2, emoji: '😟', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '😊', label: 'Bem' },
  { valor: 5, emoji: '😄', label: 'Muito bem' },
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
}

function EditableBlock({
  campo, label, placeholder, multiline = false,
  value, editando, onEdit, onChange, onSalvar, onCancelar,
}: EditableBlockProps) {
  const isEditing = editando === campo
  return (
    <div className="group relative">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          {!isEditing && (
            <button onClick={() => onEdit(campo)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
              <Edit2 className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
      {!label && !isEditing && (
        <button onClick={() => onEdit(campo)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent z-10">
          <Edit2 className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea value={value} onChange={(e) => onChange(campo, e.target.value)} rows={4}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" autoFocus />
          ) : (
            <input type="text" value={value} onChange={(e) => onChange(campo, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
          )}
          <div className="flex gap-2">
            <button onClick={() => onSalvar(campo)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium">
              <Check className="w-3 h-3" /> Salvar
            </button>
            <button onClick={onCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground">
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
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
  const [hora, setHora] = useState('')

  useEffect(() => {
    const agora = new Date()
    const h = agora.getHours()
    if (h < 12) setHora('Bom dia')
    else if (h < 18) setHora('Boa tarde')
    else setHora('Boa noite')
  }, [])

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
        .eq('user_id', user?.id ?? '').eq('client_id', empresa.id).single(),
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
    if (prog >= 70) return { cor: 'bg-green-500', texto: 'text-green-600', label: 'Saudável' }
    if (prog >= 40) return { cor: 'bg-yellow-500', texto: 'text-yellow-600', label: 'Atenção' }
    return { cor: 'bg-red-500', texto: 'text-red-600', label: 'Crítico' }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-secondary" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-secondary" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Hero */}
      <div className="relative bg-primary rounded-2xl p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <p className="text-primary-foreground/70 text-sm font-medium mb-1">
              {hora}{nomeUsuario ? `, ${nomeUsuario}` : ''}! 👋
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3 leading-snug">
              {empresa?.company_name}
            </h1>
            <div className="group relative max-w-lg">
              {editando === 'visao_futuro' ? (
                <div className="space-y-2">
                  <textarea
                    value={formIdentidade.visao_futuro}
                    onChange={(e) => handleChange('visao_futuro', e.target.value)}
                    rows={3} placeholder="Qual é o norte de longo prazo da empresa?"
                    className="w-full px-3 py-2 text-sm rounded-md border border-white/30 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none" autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSalvar('visao_futuro')} className="flex items-center gap-1 px-3 py-1.5 bg-white text-primary rounded-md text-xs font-medium">
                      <Check className="w-3 h-3" /> Salvar
                    </button>
                    <button onClick={handleCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-white/30 rounded-md text-xs text-white/70">
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`text-primary-foreground/80 text-sm leading-relaxed ${!formIdentidade.visao_futuro && 'italic opacity-50'}`}>
                    {formIdentidade.visao_futuro || 'Adicione a visão de futuro da empresa...'}
                  </p>
                  <button onClick={() => handleEdit('visao_futuro')} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10">
                    <Edit2 className="w-3 h-3 text-white/60" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 md:flex-col md:gap-2 shrink-0">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center min-w-24">
              <p className="text-2xl font-bold text-white">{formatPercent(progressoGeral)}</p>
              <p className="text-xs text-white/60 mt-0.5">Progresso geral</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center min-w-24">
              <p className="text-2xl font-bold text-white">{krsAtivos}</p>
              <p className="text-xs text-white/60 mt-0.5">KRs ativos</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center min-w-24">
              <p className="text-2xl font-bold text-white">{svs.length}</p>
              <p className="text-xs text-white/60 mt-0.5">Sinais vitais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Identidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="mercado_posicionamento" label="Mercado e Posicionamento"
            placeholder="Onde atuamos e qual nosso diferencial competitivo?"
            multiline value={formIdentidade.mercado_posicionamento}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="valores" label="Nossos Valores"
            placeholder="Ex: Foco no Cliente, Inovação, Integridade..."
            multiline value={formIdentidade.valores}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
        </div>

        {/* Humor */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Como você está hoje?</p>
          {humorHoje ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.label}</p>
                  <p className="text-xs text-muted-foreground">Registrado hoje</p>
                </div>
              </div>
              {mediaHumor && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Média do time esta semana: <span className="text-base">{HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}</span> {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-2">
                {HUMOR_EMOJIS.map((h) => (
                  <button key={h.valor} onClick={() => handleHumor(h.valor)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-accent transition-colors group flex-1" title={h.label}>
                    <span className="text-xl group-hover:scale-125 transition-transform">{h.emoji}</span>
                  </button>
                ))}
              </div>
              {mediaHumor && (
                <p className="text-xs text-muted-foreground mt-2">
                  Média do time: {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Campanha */}
      {(formIdentidade.campanha_titulo || formIdentidade.campanha_descricao) ? (
        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-xl">📢</span>
            </div>
            <div className="flex-1 space-y-2">
              <EditableBlock
                campo="campanha_titulo" label="Campanha Ativa"
                placeholder="Título da campanha"
                value={formIdentidade.campanha_titulo}
                editando={editando} onEdit={handleEdit} onChange={handleChange}
                onSalvar={handleSalvar} onCancelar={handleCancelar}
              />
              <EditableBlock
                campo="campanha_descricao"
                placeholder="Descrição da campanha ou ação de endomarketing..."
                multiline value={formIdentidade.campanha_descricao}
                editando={editando} onEdit={handleEdit} onChange={handleChange}
                onSalvar={handleSalvar} onCancelar={handleCancelar}
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => handleEdit('campanha_titulo')}
          className="w-full border-2 border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span> Adicionar campanha ativa
        </button>
      )}

      {/* OKRs e Sinais Vitais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">OKRs</p>
            </div>
            <Link href="/okr" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {objetivosComKrs.slice(0, 4).map((obj) => (
              <div key={obj.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-foreground truncate flex-1 mr-3">{obj.titulo}</p>
                  <span className={`text-xs font-semibold shrink-0 ${obj.progresso >= 70 ? 'text-green-600' : obj.progresso >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {formatPercent(obj.progresso)}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${obj.progresso >= 70 ? 'bg-green-500' : obj.progresso >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(obj.progresso, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{obj.krs.length} Key Result{obj.krs.length !== 1 ? 's' : ''}</p>
              </div>
            ))}
            {objetivosComKrs.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Nenhum objetivo cadastrado.</p>
                <Link href="/okr" className="text-xs text-primary hover:underline">Criar primeiro objetivo →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sinais Vitais</p>
            </div>
            <Link href="/sinais-vitais" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {svs.slice(0, 5).map((sv) => {
              const status = sinalStatus(sv)
              return (
                <div key={sv.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.cor}`} />
                    <p className="text-xs font-medium text-foreground truncate">{sv.titulo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">{formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}</p>
                    <p className={`text-xs font-medium ${status.texto}`}>{status.label}</p>
                  </div>
                </div>
              )
            })}
            {svs.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Nenhum sinal vital cadastrado.</p>
                <Link href="/sinais-vitais" className="text-xs text-primary hover:underline">Criar primeiro sinal vital →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}