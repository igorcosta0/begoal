'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getKrsByEmpresa } from '@/lib/queries/okr'
import { getCiclosAvaliacao } from '@/lib/queries/avaliacao'
import { formatPercent, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import {
  Edit2, Check, X, ArrowRight, TrendingUp, Megaphone, Plus,
  Sparkles, Library, Compass,
  Heart, Target, Zap, Activity, Users, Briefcase, ClipboardList,
} from 'lucide-react'
import Link from 'next/link'

export default function InicioPage() {
  const { empresa } = useEmpresaStore()
  const [identidade, setIdentidade] = useState<any>(null)
  const [formIdentidade, setFormIdentidade] = useState({ campanha_titulo: '', campanha_descricao: '' })
  const [editando, setEditando] = useState<string | null>(null)
  const [verCampanha, setVerCampanha] = useState(false)

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')
  const [hora, setHora] = useState('')
  const [dataHoje, setDataHoje] = useState('')

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [permissionLevel, setPermissionLevel] = useState('visualizador')
  const [taticasAtivas, setTaticasAtivas] = useState(0)
  const [funcionariosCount, setFuncionariosCount] = useState(0)
  const [alertasSinaisVitais, setAlertasSinaisVitais] = useState(0)
  const [bibliotecaCount, setBibliotecaCount] = useState(0)
  const [cicloAvaliacaoNome, setCicloAvaliacaoNome] = useState<string | null>(null)

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
    if (user) { setUserId(user.id); setUserEmail(user.email ?? null) }

    const ctz = isEmpresaCTZ(empresa.company_name)

    const [
      { data: identidadeData }, { data: objs }, { data: krsData }, { data: funcData },
      { data: roleData }, { count: taticasCount }, { count: funcCount },
      { data: sinaisData }, { count: bibCount }, ciclosRes,
    ] = await Promise.all([
      supabase.from('empresa_identidade').select('*').eq('client_id', empresa.id).maybeSingle(),
      getObjetivos(empresa.id), getKrsByEmpresa(empresa.id),
      supabase.from('funcionarios').select('full_name').eq('user_id', user?.id ?? '').maybeSingle(),
      supabase.from('user_company_roles').select('permission_level').eq('user_id', user?.id ?? '').eq('client_id', empresa.id).maybeSingle(),
      supabase.from('taticas').select('id', { count: 'exact', head: true }).eq('Client_Id', empresa.id).eq('concluida', false),
      supabase.from('funcionarios').select('id', { count: 'exact', head: true }).eq('client_id', empresa.id),
      supabase.from('sinais_vitais').select('valor_inicial, valor_atual, meta').eq('client_id', empresa.id),
      supabase.from('biblioteca_documentos').select('id', { count: 'exact', head: true }).eq('client_id', empresa.id),
      ctz ? getCiclosAvaliacao(empresa.id) : Promise.resolve({ data: [] as any[] }),
    ])

    setIdentidade(identidadeData)
    if (identidadeData) {
      setFormIdentidade({ campanha_titulo: identidadeData.campanha_titulo ?? '', campanha_descricao: identidadeData.campanha_descricao ?? '' })
    }
    setObjetivos(objs ?? []); setKrs(krsData ?? [])
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')
    setPermissionLevel(roleData?.permission_level ?? 'visualizador')
    setTaticasAtivas(taticasCount ?? 0)
    setFuncionariosCount(funcCount ?? 0)
    setBibliotecaCount(bibCount ?? 0)

    const alertas = (sinaisData ?? []).filter((sv: any) => {
      const atual = sv.valor_atual ?? sv.valor_inicial ?? 0
      const inicial = sv.valor_inicial ?? 0
      const meta = sv.meta ?? 0
      if (meta === inicial) return false
      const progresso = meta < inicial
        ? ((inicial - atual) / (inicial - meta)) * 100
        : ((atual - inicial) / (meta - inicial)) * 100
      return progresso < 40
    }).length
    setAlertasSinaisVitais(alertas)

    const ciclos = (ciclosRes as any)?.data ?? []
    const cicloAtivo = ciclos.find((c: any) => c.status === 'ativo') ?? ciclos[0]
    setCicloAvaliacaoNome(cicloAtivo ? `${cicloAtivo.periodo ?? ''} ${cicloAtivo.ano ?? ''}`.trim() : null)

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

  const ctz = isEmpresaCTZ(empresa?.company_name)
  const podeVerCargos = ctz && (permissionLevel === 'administrador' || souPilotoAutoconhecimento(userEmail))

  const modulos = [
    { href: '/objetivo', label: 'Nosso jeito de ser', icon: Heart, cor: 'bg-amber-100 text-amber-700', meta: 'Valores, mercado e visão de futuro' },
    { href: '/okr', label: 'OKRs', icon: Target, cor: 'bg-blue-100 text-blue-700', meta: `${formatPercent(progressoGeral)} de progresso médio` },
    { href: '/taticas', label: 'Táticas', icon: Zap, cor: 'bg-violet-100 text-violet-700', meta: `${taticasAtivas} em execução` },
    { href: '/sinais-vitais', label: 'Sinais Vitais', icon: Activity, cor: 'bg-rose-100 text-rose-700', meta: alertasSinaisVitais > 0 ? `${alertasSinaisVitais} indicador${alertasSinaisVitais > 1 ? 'es' : ''} em alerta` : 'Tudo dentro da meta', alerta: alertasSinaisVitais > 0 },
    { href: '/funcionarios', label: 'Funcionários', icon: Users, cor: 'bg-sky-100 text-sky-700', meta: `${funcionariosCount} pessoas no time` },
    { href: '/avaliacao', label: 'Avaliação', icon: ClipboardList, cor: 'bg-blue-100 text-blue-700', meta: cicloAvaliacaoNome ? `Ciclo ${cicloAvaliacaoNome}` : 'Nenhum ciclo ativo', hidden: !ctz },
    { href: '/cargos', label: 'Cargos', icon: Briefcase, cor: 'bg-amber-100 text-amber-700', meta: 'Perfis de cargo mapeados', hidden: !podeVerCargos },
    { href: '/autoconhecimento', label: 'Autoconhecimento', icon: Sparkles, cor: 'bg-violet-100 text-violet-700', meta: 'Eneagrama da equipe', hidden: !ctz },
    { href: '/biblioteca', label: 'Biblioteca', icon: Library, cor: 'bg-sky-100 text-sky-700', meta: `${bibliotecaCount} materiais` },
  ].filter((m) => !m.hidden)

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="h-64 rounded-3xl bg-secondary" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-secondary" />)}
        </div>
        <div className="h-72 rounded-2xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ═══ HERO ═══ */}
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
          <div data-tour="tour-hero" className="relative rounded-3xl overflow-hidden shrink-0 shadow-glass-lg"
            style={{ background: 'radial-gradient(680px 280px at 88% -15%, rgba(99,132,245,0.35), transparent 60%), linear-gradient(150deg, #0d1330 0%, #1b2c6e 62%, #0d1330 100%)' }}>
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative z-10 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
                <div>
                  <p className="text-blue-300/60 text-[11px] font-semibold uppercase tracking-widest capitalize">{dataHoje}</p>
                  <h1 className="font-display text-2xl md:text-[28px] font-bold text-white tracking-tight leading-tight mt-1">
                    {hora}{nomeUsuario ? <>, <span className="text-blue-300">{nomeUsuario}</span></> : ''}
                  </h1>
                  <p className="text-white/50 text-[13px] mt-1">{empresa?.company_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/guia" className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors">
                    <Compass className="w-3 h-3" /> Guia
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
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-5">
                <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-2.5 min-w-[104px]">
                  <p className="font-mono text-xl font-semibold text-white leading-none">{krsAtivos}</p>
                  <p className="text-[10px] text-white/45 uppercase tracking-wider mt-1.5">KRs ativos</p>
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-2.5 min-w-[104px]">
                  <p className="font-mono text-xl font-semibold text-white leading-none">{formatPercent(progressoGeral)}</p>
                  <p className="text-[10px] text-white/45 uppercase tracking-wider mt-1.5">Progresso médio</p>
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl px-4 py-2.5 min-w-[104px]">
                  <p className={`font-mono text-xl font-semibold leading-none ${alertasSinaisVitais > 0 ? 'text-amber-300' : 'text-white'}`}>{alertasSinaisVitais}</p>
                  <p className="text-[10px] text-white/45 uppercase tracking-wider mt-1.5">Alertas · Sinais Vitais</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MÓDULOS — navegação principal ═══ */}
        <div>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="font-display text-lg font-bold text-foreground tracking-tight">Seus <span className="text-primary">módulos</span></h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {modulos.map((mod) => (
              <Link key={mod.href} href={mod.href}
                className="glass-panel glass-interactive rounded-2xl p-4 flex flex-col gap-2.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.cor}`}>
                  <mod.icon className="w-[18px] h-[18px]" />
                </span>
                <span className="font-display text-[13.5px] font-semibold text-foreground">{mod.label}</span>
                <span className={`text-[11px] leading-snug ${mod.alerta ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>{mod.meta}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ CORPO — ANÁLISE ═══ */}
        <div className="flex flex-col gap-4 min-w-0">

        {/* OKRs — GRÁFICO */}
        <div data-tour="tour-okr-panel" className="glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8 shrink-0 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground tracking-tight">Desempenho de <span className="text-primary">OKRs</span></h2>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{objetivos.length} objetivos estratégicos ativos</p>
            </div>
            <div className="flex items-center gap-5">
              {objetivosComKrs.length > 0 && (
                <div className="text-right">
                  <p className="font-mono text-xl font-semibold text-primary tabular-nums leading-none">{formatPercent(progressoGeral)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Média geral</p>
                </div>
              )}
              <Link href="/okr" className="group flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold transition-all">
                Painel Completo <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[220px] flex items-end justify-around gap-6 px-4 pb-4">
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
    </div>
  )
}
