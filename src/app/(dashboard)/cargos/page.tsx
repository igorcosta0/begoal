'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import { getCargosPerfil, type CargoPerfilCompleto } from '@/lib/queries/cargosPerfil'
import { Briefcase, ChevronDown, Search } from 'lucide-react'

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

interface CargoAgrupado {
  area: string
  cargoBase: string
  niveis: CargoPerfilCompleto[]
}

const ORDEM_NIVEL: Record<string, number> = { 'Júnior': 0, 'Pleno': 1, 'Sênior': 2 }

function Bullets({ texto }: { texto: string }) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const todasComMarcador = linhas.length > 0 && linhas.every((l) => l.startsWith('•'))
  if (!todasComMarcador) return <p className="text-foreground whitespace-pre-line">{texto}</p>
  return (
    <ul className="space-y-1">
      {linhas.map((l, i) => (
        <li key={i} className="text-foreground flex gap-2">
          <span className="text-primary shrink-0">•</span>
          <span>{l.replace(/^•\s*/, '')}</span>
        </li>
      ))}
    </ul>
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
    <div className="max-w-4xl space-y-6">
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
            {areas.map((a) => (
              <button
                key={a}
                onClick={() => setAreaAtiva(a === areaAtiva ? null : a)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                  a === areaAtiva ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {agrupados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                <p className="text-muted-foreground text-sm">Nenhum cargo encontrado com esse filtro.</p>
              </div>
            ) : (
              agrupados.map((g) => {
                const chave = `${g.area}::${g.cargoBase}`
                const aberto = expandido === chave
                const nivelAtivo = nivelPorCargo[chave] ?? g.niveis[0]?.nivel ?? ''
                const cargoAtivo = g.niveis.find((n) => n.nivel === nivelAtivo) ?? g.niveis[0]

                return (
                  <div key={chave} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandido(aberto ? null : chave)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{g.cargoBase}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{g.area} · {g.niveis.length} nível{g.niveis.length > 1 ? 'is' : ''}</p>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', aberto && 'rotate-180')} />
                    </button>

                    {aberto && cargoAtivo && (
                      <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                        {g.niveis.length > 1 && (
                          <div className="flex gap-2">
                            {g.niveis.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => setNivelPorCargo((prev) => ({ ...prev, [chave]: n.nivel ?? '' }))}
                                className={cn(
                                  'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
                                  n.nivel === nivelAtivo ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:bg-accent'
                                )}
                              >
                                {n.nivel}
                              </button>
                            ))}
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Sumário</p>
                          <p className="text-foreground text-sm">{cargoAtivo.sumario}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Responsabilidades</p>
                          <div className="text-sm"><Bullets texto={cargoAtivo.responsabilidades} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Autonomia esperada</p>
                            <p className="text-foreground">{cargoAtivo.autonomia ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Experiência esperada</p>
                            <p className="text-foreground">{cargoAtivo.experiencia ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Formação</p>
                            <p className="text-foreground">{cargoAtivo.formacao ?? '—'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-border/60">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Competências técnicas</p>
                            {cargoAtivo.competencias_tecnicas ? <Bullets texto={cargoAtivo.competencias_tecnicas} /> : <p className="text-foreground">—</p>}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Competências comportamentais</p>
                            {cargoAtivo.competencias_comportamentais ? <Bullets texto={cargoAtivo.competencias_comportamentais} /> : <p className="text-foreground">—</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
