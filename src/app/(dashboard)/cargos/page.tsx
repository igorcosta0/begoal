'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import { getCargosPerfil, type CargoPerfilCompleto } from '@/lib/queries/cargosPerfil'
import { Briefcase, ChevronDown, Search, Target, Clock, GraduationCap, CheckCircle2, Layers } from 'lucide-react'

// Aba "Cargos" (pedido 09/09/2026) — catálogo de perfis de cargo importado da
// planilha "Cargos Concretize.xlsx" (mesma fonte usada em 01/09/2026 pro
// cruzamento cargo x Eneagrama do Autoconhecimento, ver
// PENDENTE_20260901000000_cargos_perfil_eneagrama.sql). Diferente daquela
// tela: aqui é só o catálogo puro de referência, sem cruzar com Eneagrama
// nem com nome de pessoa nenhuma.
//
// Acesso (confirmado com o usuário via AskUserQuestion): só CTZ, e só quem
// já tem acesso a coisa sensível hoje — administrador de verdade da empresa
// OU o piloto do Autoconhecimento (Igor/Priscila). RLS de cargos_perfil
// (migration PENDENTE_20260909010000_cargos_perfil_acesso_admin) trava por
// trás mesmo que esta checagem no front erre.
//
// Redesenho (pedido 10/09/2026, "melhorar o design pra ficar mais bonito"):
// trocou a lista em accordion de largura cheia por um grid de cards com cor
// por área (mesma área do funcionário na planilha), sumário em destaque,
// autonomia/experiência/formação como mini-tiles com ícone, e competências
// como chips em vez de bullets soltos — sem mudar nenhuma regra de acesso
// nem a fonte dos dados, só a apresentação.

interface CargoAgrupado {
  area: string
  cargoBase: string
  niveis: CargoPerfilCompleto[]
}

const ORDEM_NIVEL: Record<string, number> = { 'Júnior': 0, 'Pleno': 1, 'Sênior': 2 }

// Cor por área — só estética, puramente decorativa (não representa nenhuma
// hierarquia real entre áreas). Fallback cinza pra qualquer área nova que a
// planilha venha a trazer no futuro sem precisar mexer aqui.
const AREA_STYLES: Record<string, { badge: string; dot: string; borderL: string; icon: string }> = {
  'Liderança': { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', borderL: 'border-l-violet-400', icon: 'bg-violet-100 text-violet-600' },
  'Adm e Finanças': { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', borderL: 'border-l-blue-400', icon: 'bg-blue-100 text-blue-600' },
  'Urbanismo': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', borderL: 'border-l-emerald-400', icon: 'bg-emerald-100 text-emerald-600' },
  'Infraestrutura': { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', borderL: 'border-l-amber-400', icon: 'bg-amber-100 text-amber-600' },
  'Legalização': { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', borderL: 'border-l-rose-400', icon: 'bg-rose-100 text-rose-600' },
  'Agrimensura': { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', borderL: 'border-l-cyan-400', icon: 'bg-cyan-100 text-cyan-600' },
  'Comercial': { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', borderL: 'border-l-orange-400', icon: 'bg-orange-100 text-orange-600' },
}
const AREA_FALLBACK = { badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500', borderL: 'border-l-slate-400', icon: 'bg-slate-100 text-slate-600' }
const areaStyle = (area: string) => AREA_STYLES[area] ?? AREA_FALLBACK

function Bullets({ texto }: { texto: string }) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const todasComMarcador = linhas.length > 0 && linhas.every((l) => l.startsWith('•'))
  if (!todasComMarcador) return <p className="text-foreground whitespace-pre-line">{texto}</p>
  return (
    <ul className="space-y-1.5">
      {linhas.map((l, i) => (
        <li key={i} className="text-foreground flex gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>{l.replace(/^•\s*/, '')}</span>
        </li>
      ))}
    </ul>
  )
}

// Competências (curtas por natureza — "Excel avançado", "Organização" etc.)
// ganham chip em vez de bullet solto: escaneia mais rápido numa lista de
// palavras/expressões curtas do que uma coluna de linhas com marcador.
function Tags({ texto, className }: { texto: string; className: string }) {
  const linhas = texto.split('\n').map((l) => l.trim().replace(/^•\s*/, '')).filter(Boolean)
  if (!linhas.length) return <p className="text-foreground text-sm">—</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {linhas.map((l, i) => (
        <span key={i} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', className)}>
          {l}
        </span>
      ))}
    </div>
  )
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 p-3 flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function CargosPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  const [loading, setLoading] = useState(true)
  const [acessoLiberado, setAcessoLiberado] = useState(false)
  const [cargos, setCargos] = useState<CargoPerfilCompleto[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [areaAtiva, setAreaAtiva] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [nivelPorCargo, setNivelPorCargo] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!ctz) {
      setLoading(false)
      return
    }
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !empresa) {
        setLoading(false)
        return
      }
      const { data: role } = await supabase
        .from('user_company_roles')
        .select('permission_level')
        .eq('user_id', user.id)
        .eq('client_id', empresa.id)
        .maybeSingle()

      const liberado = role?.permission_level === 'administrador' || souPilotoAutoconhecimento(user.email)
      setAcessoLiberado(liberado)
      if (!liberado) {
        setLoading(false)
        return
      }

      const { data, error } = await getCargosPerfil(empresa.id)
      if (error) setErro(error)
      setCargos(data)
      setLoading(false)
    }
    carregar()
  }, [ctz, empresa?.id])

  const areas = useMemo(() => Array.from(new Set(cargos.map((c) => c.area))), [cargos])

  const agrupados = useMemo(() => {
    const mapa = new Map<string, CargoAgrupado>()
    for (const c of cargos) {
      const chave = `${c.area}::${c.cargo_base}`
      let g = mapa.get(chave)
      if (!g) {
        g = { area: c.area, cargoBase: c.cargo_base, niveis: [] }
        mapa.set(chave, g)
      }
      g.niveis.push(c)
    }
    mapa.forEach((g) => {
      g.niveis.sort((a, b) => (ORDEM_NIVEL[a.nivel ?? ''] ?? 99) - (ORDEM_NIVEL[b.nivel ?? ''] ?? 99))
    })
    const buscaNormalizada = busca.trim().toLowerCase()
    return Array.from(mapa.values())
      .filter((g) => !areaAtiva || g.area === areaAtiva)
      .filter((g) => !buscaNormalizada || g.cargoBase.toLowerCase().includes(buscaNormalizada) || g.area.toLowerCase().includes(buscaNormalizada))
      .sort((a, b) => a.area.localeCompare(b.area) || a.cargoBase.localeCompare(b.cargoBase))
  }, [cargos, areaAtiva, busca])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-secondary" />
        <div className="h-40 rounded-2xl bg-secondary" />
      </div>
    )
  }

  // Mesma mensagem genérica de "módulo não disponível" pra empresa fora da
  // CTZ ou pra quem não é admin/piloto — não entrega pista de que existe uma
  // lista restrita por trás (mesmo padrão de avaliacao/autoconhecimento).
  if (!ctz || !acessoLiberado) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Cargos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Perfil de cada cargo da CTZ — sumário, responsabilidades, autonomia e competências esperadas por nível
            </p>
          </div>
        </div>
        {cargos.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-medium text-muted-foreground shrink-0">
            <Layers className="w-3.5 h-3.5" />
            {new Set(cargos.map((c) => `${c.area}::${c.cargo_base}`)).size} cargos · {areas.length} áreas
          </div>
        )}
      </div>

      {erro && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{erro}</div>
      )}

      {cargos.length === 0 && !erro ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <p className="text-muted-foreground text-sm">Nenhum cargo mapeado ainda.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cargo ou área..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAreaAtiva(null)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                areaAtiva === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              Todas as áreas
            </button>
            {areas.map((a) => {
              const style = areaStyle(a)
              const ativo = a === areaAtiva
              return (
                <button
                  key={a}
                  onClick={() => setAreaAtiva(a === areaAtiva ? null : a)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                    ativo ? style.badge : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                  {a}
                </button>
              )
            })}
          </div>

          {agrupados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <p className="text-muted-foreground text-sm">Nenhum cargo encontrado com esse filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {agrupados.map((g) => {
                const chave = `${g.area}::${g.cargoBase}`
                const aberto = expandido === chave
                const nivelAtivo = nivelPorCargo[chave] ?? g.niveis[0]?.nivel ?? ''
                const cargoAtivo = g.niveis.find((n) => n.nivel === nivelAtivo) ?? g.niveis[0]
                const style = areaStyle(g.area)

                return (
                  <div
                    key={chave}
                    className={cn(
                      'bg-card border border-border rounded-2xl overflow-hidden border-l-4 transition-shadow hover:shadow-sm',
                      style.borderL
                    )}
                  >
                    <button
                      onClick={() => setExpandido(aberto ? null : chave)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
                    >
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', style.icon)}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{g.cargoBase}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[11px] px-1.5 py-0 rounded-full font-medium', style.badge)}>{g.area}</span>
                          <span className="text-xs text-muted-foreground">· {g.niveis.length} nível{g.niveis.length > 1 ? 'is' : ''}</span>
                        </div>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', aberto && 'rotate-180')} />
                    </button>

                    {aberto && cargoAtivo && (
                      <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                        {g.niveis.length > 1 && (
                          <div className="flex gap-1 p-1 bg-muted rounded-full w-fit">
                            {g.niveis.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => setNivelPorCargo((prev) => ({ ...prev, [chave]: n.nivel ?? '' }))}
                                className={cn(
                                  'px-3 py-1 text-xs rounded-full font-medium transition-all',
                                  n.nivel === nivelAtivo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {n.nivel}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                          <p className="text-[11px] font-medium text-primary/80 uppercase tracking-wide mb-1">Sumário</p>
                          <p className="text-foreground text-sm leading-relaxed">{cargoAtivo.sumario}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Responsabilidades</p>
                          <Bullets texto={cargoAtivo.responsabilidades} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <StatTile icon={Target} label="Autonomia" value={cargoAtivo.autonomia ?? '—'} />
                          <StatTile icon={Clock} label="Experiência" value={cargoAtivo.experiencia ?? '—'} />
                          <StatTile icon={GraduationCap} label="Formação" value={cargoAtivo.formacao ?? '—'} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Competências técnicas</p>
                            {cargoAtivo.competencias_tecnicas ? (
                              <Tags texto={cargoAtivo.competencias_tecnicas} className="bg-secondary text-secondary-foreground" />
                            ) : (
                              <p className="text-foreground text-sm">—</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Competências comportamentais</p>
                            {cargoAtivo.competencias_comportamentais ? (
                              <Tags texto={cargoAtivo.competencias_comportamentais} className="bg-primary/10 text-primary" />
                            ) : (
                              <p className="text-foreground text-sm">—</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
