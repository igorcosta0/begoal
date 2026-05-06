'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { getSinaisVitais } from '@/lib/queries/sinais-vitais'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Target, TrendingUp, Edit2, Check, X } from 'lucide-react'

const HUMOR_EMOJIS = [
  { valor: 1, emoji: '😔', label: 'Muito mal' },
  { valor: 2, emoji: '😟', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Neutro' },
  { valor: 4, emoji: '😊', label: 'Bem' },
  { valor: 5, emoji: '😄', label: 'Muito bem' },
]

export default function InicioPage() {
  const { empresa } = useEmpresaStore()

  const [identidade, setIdentidade] = useState<any>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [formIdentidade, setFormIdentidade] = useState({
    visao_futuro: '',
    mercado_posicionamento: '',
    valores: '',
    campanha_titulo: '',
    campanha_descricao: '',
  })

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [svs, setSvs] = useState<any[]>([])
  const [humorHoje, setHumorHoje] = useState<number | null>(null)
  const [mediaHumor, setMediaHumor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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
    ] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).single(),
      getObjetivos(empresa.id),
      getKrsByEmpresa(empresa.id),
      getSinaisVitais(empresa.id),
      supabase.from('humor_registro').select('humor').eq('client_id', empresa.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('humor_registro').select('humor').eq('client_id', empresa.id)
        .eq('user_id', user?.id ?? '')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .limit(1),
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

    if (humorData && humorData.length > 0) {
      const media = humorData.reduce((acc: number, h: any) => acc + h.humor, 0) / humorData.length
      setMediaHumor(Math.round(media))
    }
    if (humorHojeData && humorHojeData.length > 0) {
      setHumorHoje(humorHojeData[0].humor)
    }

    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSalvarIdentidade(campo: string) {
    if (!empresa) return
    const supabase = createClient()
    if (identidade) {
      await supabase.from('empresa_identidade')
        .update({ [campo]: (formIdentidade as any)[campo], updated_at: new Date().toISOString() })
        .eq('client_id', empresa.id)
    } else {
      await supabase.from('empresa_identidade')
        .insert({ client_id: empresa.id, [campo]: (formIdentidade as any)[campo] })
    }
    setEditando(null)
    fetchData()
  }

  async function handleHumor(valor: number) {
    if (!empresa) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_registro').insert({
      client_id: empresa.id,
      user_id: user?.id,
      humor: valor,
    })
    setHumorHoje(valor)
    fetchData()
  }

  // Agrupar KRs por objetivo
  const objetivosComKrs = objetivos.map((obj) => ({
    ...obj,
    krs: krs
      .filter((kr) => kr.objetivo_id === obj.id)
      .map((kr) => ({
        ...kr,
        progresso: kr.meta > 0
          ? Math.max(0, ((kr.valor_atual - kr.valor_inicial) / (kr.meta - kr.valor_inicial)) * 100)
          : 0,
      })),
  })).map((obj) => ({
    ...obj,
    progresso: obj.krs.length > 0
      ? obj.krs.reduce((acc: number, kr: any) => acc + (kr.progresso ?? 0), 0) / obj.krs.length
      : 0,
  }))

  const sinalStatus = (sv: any) => {
    const prog = sv.meta > 0
      ? Math.max(0, ((sv.valor_atual - sv.valor_inicial) / (sv.meta - sv.valor_inicial)) * 100)
      : 0
    if (prog >= 70) return { cor: 'bg-green-500', label: 'Saudável' }
    if (prog >= 40) return { cor: 'bg-yellow-500', label: 'Atenção' }
    return { cor: 'bg-red-500', label: 'Crítico' }
  }

  const EditableBlock = ({ campo, label, placeholder, multiline = false }: {
    campo: keyof typeof formIdentidade
    label: string
    placeholder: string
    multiline?: boolean
  }) => (
    <div className="group relative">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        {editando !== campo && (
          <button
            onClick={() => setEditando(campo)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
          >
            <Edit2 className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {editando === campo ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={formIdentidade[campo]}
              onChange={(e) => setFormIdentidade({ ...formIdentidade, [campo]: e.target.value })}
              rows={4}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={formIdentidade[campo]}
              onChange={(e) => setFormIdentidade({ ...formIdentidade, [campo]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleSalvarIdentidade(campo)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90"
            >
              <Check className="w-3 h-3" />
              Salvar
            </button>
            <button
              onClick={() => setEditando(null)}
              className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:bg-accent"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-sm ${formIdentidade[campo] ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {formIdentidade[campo] || placeholder}
        </p>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-secondary animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Início</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {empresa?.company_name} — Nosso Jeito de Ser
        </p>
      </div>

      {/* Seção 1 — Identidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Visão de Futuro */}
        <div className="md:col-span-1 bg-primary rounded-xl p-5 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-3">Visão de Futuro</p>
          {editando === 'visao_futuro' ? (
            <div className="space-y-2">
              <textarea
                value={formIdentidade.visao_futuro}
                onChange={(e) => setFormIdentidade({ ...formIdentidade, visao_futuro: e.target.value })}
                rows={4}
                placeholder="Qual é o norte de longo prazo da empresa?"
                className="w-full px-3 py-2 text-sm rounded-md border border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSalvarIdentidade('visao_futuro')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-primary rounded-md text-xs font-medium hover:opacity-90"
                >
                  <Check className="w-3 h-3" />
                  Salvar
                </button>
                <button
                  onClick={() => setEditando(null)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-white/30 rounded-md text-xs text-white/70 hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className={`text-base font-semibold leading-snug ${formIdentidade.visao_futuro ? '' : 'opacity-50 italic text-sm font-normal'}`}>
                {formIdentidade.visao_futuro || 'Clique no lápis para adicionar a visão de futuro da empresa'}
              </p>
              <button
                onClick={() => setEditando('visao_futuro')}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Mercado e Posicionamento */}
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="mercado_posicionamento"
            label="Mercado e Posicionamento"
            placeholder="Onde atuamos e qual nosso diferencial?"
            multiline
          />
        </div>

        {/* Valores */}
        <div className="bg-card border border-border rounded-xl p-5">
          <EditableBlock
            campo="valores"
            label="Nossos Valores"
            placeholder="Ex: Foco no Cliente, Inovação, Integridade..."
            multiline
          />
        </div>
      </div>

      {/* Seção 2 — Engajamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Widget de Humor */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Como você está hoje?</p>
          {humorHoje ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Você registrou: {HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.emoji} {HUMOR_EMOJIS.find(h => h.valor === humorHoje)?.label}
              </p>
              {mediaHumor && (
                <p className="text-xs text-muted-foreground">
                  Média do time esta semana: {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji} {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.label}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3 mt-2">
                {HUMOR_EMOJIS.map((h) => (
                  <button
                    key={h.valor}
                    onClick={() => handleHumor(h.valor)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors group"
                    title={h.label}
                  >
                    <span className="text-2xl">{h.emoji}</span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{h.label}</span>
                  </button>
                ))}
              </div>
              {mediaHumor && (
                <p className="text-xs text-muted-foreground">
                  Média do time esta semana: {HUMOR_EMOJIS.find(h => h.valor === mediaHumor)?.emoji}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Campanha */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campanha Ativa</p>
          </div>
          <EditableBlock
            campo="campanha_titulo"
            label=""
            placeholder="Título da campanha"
          />
          <EditableBlock
            campo="campanha_descricao"
            label=""
            placeholder="Descrição da campanha ou ação de endomarketing..."
            multiline
          />
        </div>
      </div>

      {/* Seção 3 — Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* OKRs */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OKRs</p>
            <a href="/okr" className="text-xs text-primary hover:underline">Ver tudo</a>
          </div>
          <div className="space-y-4">
            {objetivosComKrs.slice(0, 3).map((obj) => (
              <div key={obj.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-foreground truncate flex-1 mr-2">{obj.titulo}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{formatPercent(obj.progresso)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      obj.progresso >= 70 ? 'bg-green-500' : obj.progresso >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(obj.progresso, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{obj.krs.length} KRs</p>
              </div>
            ))}
            {objetivosComKrs.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum objetivo cadastrado.</p>
            )}
          </div>
        </div>

        {/* Sinais Vitais */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sinais Vitais</p>
            <a href="/sinais-vitais" className="text-xs text-primary hover:underline">Ver tudo</a>
          </div>
          <div className="space-y-3">
            {svs.slice(0, 5).map((sv) => {
              const status = sinalStatus(sv)
              return (
                <div key={sv.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.cor}`} />
                    <p className="text-xs font-medium text-foreground truncate">{sv.titulo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">
                      {formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                  </div>
                </div>
              )
            })}
            {svs.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum sinal vital cadastrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}