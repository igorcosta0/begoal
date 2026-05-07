'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { getSinaisVitais } from '@/lib/queries/sinais-vitais'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Edit2, Check, X, ArrowRight, TrendingUp, Activity, Plus } from 'lucide-react'
import Link from 'next/link'

const HUMOR_EMOJIS = [
  { valor: 1, emoji: '😔', label: 'Muito mal' },
  { valor: 2, emoji: '🥲', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '🙂', label: 'Bem' },
  { valor: 5, emoji: '🤩', label: 'Ótimo' },
]

interface EditableBlockProps {
  campo: string
  label?: string
  sublabel?: string
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
  campo, label, sublabel, placeholder, multiline = false,
  value, editando, onEdit, onChange, onSalvar, onCancelar,
}: EditableBlockProps) {
  const isEditing = editando === campo
  return (
    <div className="group relative h-full">
      {label && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        </div>
      )}
      {!label && !isEditing && (
        <button onClick={() => onEdit(campo)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent z-10">
          <Edit2 className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      {label && !isEditing && (
        <button onClick={() => onEdit(campo)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
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
  const [periodo, setPeriodo] = useState('')

  useEffect(() => {
    const agora = new Date()
    const h = agora.getHours()
    if (h < 12) setHora('Bom dia')
    else if (h < 18) setHora('Boa tarde')
    else setHora('Boa noite')
    const trimestre = Math.ceil((agora.getMonth() + 1) / 3)
    setPeriodo(`Q${trimestre} · ${agora.getFullYear()}`)
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

  const statusBadge = (prog: number) => {
    if (prog >= 70) return { label: 'No prazo', class: 'bg-green-100 text-green-700' }
    if (prog >= 40) return { label: 'Em risco', class: 'bg-yellow-100 text-yellow-700' }
    if (prog > 100) return { label: 'Acima da meta', class: 'bg-blue-100 text-blue-700' }
    return { label: 'Atrasado', class: 'bg-red-100 text-red-700' }
  }

  const sinalStatus = (sv: any) => {
    const prog = sv.meta > 0 ? Math.max(0, ((sv.valor_atual - sv.valor_inicial) / (sv.meta - sv.valor_inicial)) * 100) : 0
    if (prog >= 70) return { cor: 'bg-green-500', texto: 'text-green-600', label: 'Saudável' }
    if (prog >= 40) return { cor: 'bg-yellow-500', texto: 'text-yellow-600', label: 'Atenção' }
    return { cor: 'bg-red-500', texto: 'text-red-600', label: 'Crítico' }
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-6 w-48 bg-secondary rounded" />
        <div className="h-32 bg-secondary rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Breadcrumb + período */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-foreground font-medium">Visão geral</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {periodo}
        </span>
      </div>

      {/* Hero */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">{hora} 👋</p>
        <h1 className="text-3xl font-bold text-foreground mb-2">{empresa?.company_name}</h1>
        <div className="group relative max-w-xl">
          {editando === 'visao_futuro' ? (
            <div className="space-y-2">
              <textarea
                value={formIdentidade.visao_futuro}
                onChange={(e) => handleChange('visao_futuro', e.target.value)}
                rows={2} placeholder="Qual é o norte de longo prazo da empresa?"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => handleSalvar('visao_futuro')} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium">
                  <Check className="w-3 h-3" /> Salvar
                </button>
                <button onClick={handleCancelar} className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground">
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm leading-relaxed ${formIdentidade.visao_futuro ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'}`}>
                {formIdentidade.visao_futuro || 'Adicione a visão de futuro da empresa...'}
              </p>
              <button onClick={() => handleEdit('visao_futuro')} className="absolute -top-1 -right-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Progresso geral</p>
          <p className="text-2xl font-bold text-foreground">{formatPercent(progressoGeral)}</p>
          <p className="text-xs text-muted-foreground mt-1">{objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">KRs ativos</p>
          <p className="text-2xl font-bold text-foreground">{krsAtivos}</p>
          <p className="text-xs text-muted-foreground mt-1">{objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Sinais vitais</p>
          <p className="text-2xl font-bold text-foreground">{svs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{svs.length === 0 ? 'Aguardando' : 'monitorados'}</p>
        </div>
      </div>

      {/* Pulso + Identidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Pulso do time */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-foreground mb-1">Pulso do time</p>
          <p className="text-xs text-muted-foreground mb-4">Como você está hoje?</p>
          {humorHoje ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.emoji}</span>
                <div>
                  <p className="text-xs font-medium text-foreground">Hoje</p>
                  <p className="text-xs text-muted-foreground">{HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.label}</p>
                </div>
              </div>
              {mediaHumor && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Média do time</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">
                    {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Hoje</p>
              <div className="flex gap-1">
                {HUMOR_EMOJIS.map((h) => (
                  <button key={h.valor} onClick={() => handleHumor(h.valor)}
                    className="flex-1 flex flex-col items-center p-2 rounded-lg hover:bg-accent transition-colors" title={h.label}>
                    <span className="text-xl">{h.emoji}</span>
                  </button>
                ))}
              </div>
              {mediaHumor && (
                <div className="pt-3 mt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Média do time{' '}
                    <span className="font-medium text-foreground">
                      {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mercado */}
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="mercado_posicionamento"
            label="Mercado e posicionamento"
            sublabel="Onde atuamos"
            placeholder="Onde atuamos e qual nosso diferencial competitivo?"
            multiline value={formIdentidade.mercado_posicionamento}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
        </div>

        {/* Valores */}
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="valores"
            label="Nossos valores"
            sublabel="Princípios"
            placeholder="Ex: Foco no Cliente, Inovação, Integridade..."
            multiline value={formIdentidade.valores}
            editando={editando} onEdit={handleEdit} onChange={handleChange}
            onSalvar={handleSalvar} onCancelar={handleCancelar}
          />
        </div>
      </div>

      {/* Campanha */}
      {(formIdentidade.campanha_titulo || formIdentidade.campanha_descricao) ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span>📢</span>
            </div>
            <div className="flex-1 space-y-2">
              <EditableBlock
                campo="campanha_titulo" label="Campanha ativa"
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
        <button
          onClick={() => handleEdit('campanha_titulo')}
          className="w-full border border-dashed border-border rounded-xl p-4 hover:border-primary hover:bg-accent/30 transition-colors group"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Adicionar campanha ativa</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Inicie um novo movimento estratégico</p>
        </button>
      )}

      {/* OKRs + Sinais Vitais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* OKRs */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">OKRs</p>
            </div>
            <Link href="/okr" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''} · {krs.length} key result{krs.length !== 1 ? 's' : ''}
          </p>

          <div className="space-y-4">
            {objetivosComKrs.map((obj) => {
              const badge = statusBadge(obj.progresso)
              return (
                <div key={obj.id}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{obj.titulo}</p>
                      <p className="text-xs text-muted-foreground">{obj.krs.length} key result{obj.krs.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-foreground">{formatPercent(obj.progresso)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.class}`}>{badge.label}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${obj.progresso >= 70 ? 'bg-green-500' : obj.progresso >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(obj.progresso, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {objetivosComKrs.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground mb-2">Nenhum objetivo cadastrado.</p>
                <Link href="/okr" className="text-xs text-primary hover:underline">Criar primeiro objetivo →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sinais Vitais */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Sinais Vitais</p>
            </div>
            <Link href="/sinais-vitais" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Indicadores em tempo real</p>

          {svs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-foreground mb-1">Nenhum sinal vital cadastrado</p>
              <p className="text-xs text-muted-foreground mb-4">Configure indicadores chave para monitorar a saúde do negócio.</p>
              <Link href="/sinais-vitais"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-3 h-3" />
                Criar primeiro sinal vital
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {svs.slice(0, 6).map((sv) => {
                const status = sinalStatus(sv)
                return (
                  <div key={sv.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${status.cor}`} />
                      <p className="text-xs font-medium text-foreground truncate">{sv.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}</p>
                      <p className={`text-xs font-medium ${status.texto}`}>{status.label}</p>
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