'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { useOkrStore } from '@/store/useOkrStore'
import {
  getObjetivos,
  getKrsByEmpresa,
  deleteKr,
  deleteObjetivo,
  getSetoresByEmpresa,
  getFuncionariosByEmpresa,
  reativarKr,
} from '@/lib/queries/okr'
import { createClient } from '@/lib/supabase/client'
import ObjetivoCard from '@/components/okr/ObjetivoCard'
import ModalCriarKr from '@/components/okr/ModalCriarKr'
import ModalEditarKr from '@/components/okr/ModalEditarKr'
import ModalLancarKr from '@/components/okr/ModalLancarKr'
import ModalFinalizarKr from '@/components/okr/ModalFinalizarKr'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import ModalDetalhesKr from '@/components/okr/ModalDetalhesKr'
import ModalCriarObjetivo from '@/components/okr/ModalCriarObjetivo'
import ModalEditarObjetivo from '@/components/okr/ModalEditarObjetivo'
import ModalTaticasKr from '@/components/okr/ModalTaticasKr'
import ModalEditarLancamentos from '@/components/okr/ModalEditarLancamentos'
import { Archive, ArchiveRestore, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPercent, cn } from '@/lib/utils'

export default function OkrPage() {
  const { empresa } = useEmpresaStore()
  const { filters, setFiltroObjetivo, setFiltroResponsavel, setFiltroSetor, clearFilters } = useOkrStore()

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [verFinalizados, setVerFinalizados] = useState(false)
  const [expandidosFinalizados, setExpandidosFinalizados] = useState<Record<string, boolean>>({})

  const [modalCriarObjetivo, setModalCriarObjetivo] = useState(false)
  const [modalEditarObjetivo, setModalEditarObjetivo] = useState<{ open: boolean; objetivo: any | null }>({ open: false, objetivo: null })
  const [modalCriarKr, setModalCriarKr] = useState<{ open: boolean; objetivo: any | null }>({ open: false, objetivo: null })
  const [modalEditarKr, setModalEditarKr] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalLancarKr, setModalLancarKr] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalFinalizarKr, setModalFinalizarKr] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalDetalhesKr, setModalDetalhesKr] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalTaticasKr, setModalTaticasKr] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalEditarLancamentos, setModalEditarLancamentos] = useState<{ open: boolean; kr: any | null }>({ open: false, kr: null })
  const [modalExcluirKr, setModalExcluirKr] = useState<{ open: boolean; kr: any | null; loading: boolean }>({ open: false, kr: null, loading: false })
  const [modalExcluirObjetivo, setModalExcluirObjetivo] = useState<{ open: boolean; objetivo: any | null; loading: boolean }>({ open: false, objetivo: null, loading: false })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const [{ data: objs }, { data: krsData }] = await Promise.all([
      getObjetivos(empresa.id),
      getKrsByEmpresa(empresa.id),
    ])
    setObjetivos(objs ?? [])
    setKrs(krsData ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
  }, [empresa])

  function calcularProgresso(kr: any) {
    const atual = kr.valor_atual ?? kr.valor_inicial ?? 0
    const inicial = kr.valor_inicial ?? 0
    const meta = kr.meta ?? 0
    if (meta === inicial) return 0
    if (meta < inicial) return Math.min(100, Math.max(0, ((inicial - atual) / (inicial - meta)) * 100))
    return Math.min(100, Math.max(0, ((atual - inicial) / (meta - inicial)) * 100))
  }

  function mapearKr(kr: any) {
    return {
      ...kr,
      responsavel: kr.funcionarios,
      setor: setores.find((s: any) => s.id === kr.setor_id) ? { nome: setores.find((s: any) => s.id === kr.setor_id).name } : null,
      objetivo: kr.objetivos,
      progresso: calcularProgresso(kr),
    }
  }

  // Objetivos ATIVOS
  const objetivosAtivos = objetivos
    .filter((obj) => !obj.concluido)
    .filter((obj) => !filters.objetivoId || obj.id === filters.objetivoId)
    .map((obj) => ({
      ...obj,
      krs: krs
        .filter((kr) => {
          if (kr.objetivo_id !== obj.id) return false
          if (filters.responsavelId && kr.responsavel_id !== filters.responsavelId) return false
          if (filters.setorId && kr.setor_id !== filters.setorId) return false
          return true
        })
        .map(mapearKr),
    }))
    .filter((obj) => {
      if (!filters.setorId && !filters.responsavelId) return true
      return obj.krs.length > 0
    })
    .map((obj) => ({
      ...obj,
      progresso: obj.krs.length > 0
        ? obj.krs.reduce((acc: number, kr: any) => acc + (kr.progresso ?? 0), 0) / obj.krs.length
        : 0,
    }))

  // Objetivos FINALIZADOS
  const objetivosFinalizados = objetivos
    .filter((obj) => obj.concluido)
    .map((obj) => ({
      ...obj,
      krs: krs.filter((kr) => kr.objetivo_id === obj.id).map(mapearKr),
    }))
    .map((obj) => ({
      ...obj,
      progresso: obj.krs.length > 0
        ? obj.krs.reduce((acc: number, kr: any) => acc + (kr.progresso ?? 0), 0) / obj.krs.length
        : 0,
    }))

  // KRs finalizados dentro de objetivos ativos
  const krsFinalizadosEmAtivos = objetivosAtivos
    .map((obj) => ({ ...obj, krs: obj.krs.filter((kr: any) => kr.concluido) }))
    .filter((obj) => obj.krs.length > 0)

  async function handleExcluirKr() {
    if (!modalExcluirKr.kr) return
    setModalExcluirKr((prev) => ({ ...prev, loading: true }))
    await deleteKr(modalExcluirKr.kr.id)
    setModalExcluirKr({ open: false, kr: null, loading: false })
    fetchData()
  }

  async function handleExcluirObjetivo() {
    if (!modalExcluirObjetivo.objetivo) return
    setModalExcluirObjetivo((prev) => ({ ...prev, loading: true }))
    await deleteObjetivo(modalExcluirObjetivo.objetivo.id)
    setModalExcluirObjetivo({ open: false, objetivo: null, loading: false })
    fetchData()
  }

  async function handleReativarKr(kr: any) {
    await reativarKr(kr.id)
    fetchData()
  }

  async function handleFinalizarObjetivo(obj: any) {
    const supabase = createClient()
    await supabase.from('objetivos').update({ concluido: true }).eq('id', obj.id)
    fetchData()
  }

  async function handleReativarObjetivo(obj: any) {
    const supabase = createClient()
    await supabase.from('objetivos').update({ concluido: false }).eq('id', obj.id)
    fetchData()
  }

  const temFiltros = filters.objetivoId || filters.responsavelId || filters.setorId
  const totalFinalizados = objetivosFinalizados.length +
    krsFinalizadosEmAtivos.reduce((a, obj) => a + obj.krs.length, 0)

  const propsModais = {
    onCriarKr: (obj: any) => setModalCriarKr({ open: true, objetivo: obj }),
    onEditarObjetivo: (obj: any) => setModalEditarObjetivo({ open: true, objetivo: obj }),
    onExcluirObjetivo: (obj: any) => setModalExcluirObjetivo({ open: true, objetivo: obj, loading: false }),
    onFinalizarObjetivo: handleFinalizarObjetivo,
    onLancarKr: (kr: any) => setModalLancarKr({ open: true, kr }),
    onEditarKr: (kr: any) => setModalEditarKr({ open: true, kr }),
    onFinalizarKr: (kr: any) => setModalFinalizarKr({ open: true, kr }),
    onExcluirKr: (kr: any) => setModalExcluirKr({ open: true, kr, loading: false }),
    onVerGraficoKr: (kr: any) => setModalDetalhesKr({ open: true, kr }),
    onReativarKr: handleReativarKr,
    onVerTaticasKr: (kr: any) => setModalTaticasKr({ open: true, kr }),
    onEditarLancamentosKr: (kr: any) => setModalEditarLancamentos({ open: true, kr }),
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OKRs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.company_name} — Gerencie seus objetivos e Key Results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVerFinalizados(!verFinalizados)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors',
              verFinalizados
                ? 'bg-secondary text-foreground border-border'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Archive className="w-4 h-4" />
            Finalizados
            {totalFinalizados > 0 && (
              <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                {totalFinalizados}
              </span>
            )}
          </button>
          <button
            onClick={() => setModalCriarObjetivo(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Novo Objetivo
          </button>
        </div>
      </div>

      {/* VISÃO ATIVA */}
      {!verFinalizados && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filters.objetivoId ?? ''} onChange={(e) => setFiltroObjetivo(e.target.value || null)}
              className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos os objetivos</option>
              {objetivos.filter(o => !o.concluido).map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.titulo}</option>
              ))}
            </select>
            <select value={filters.responsavelId ?? ''} onChange={(e) => setFiltroResponsavel(e.target.value || null)}
              className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos os responsáveis</option>
              {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
            <select value={filters.setorId ?? ''} onChange={(e) => setFiltroSetor(e.target.value || null)}
              className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos os setores</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {temFiltros && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
                Limpar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : objetivosAtivos.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground text-sm mb-3">
                {temFiltros ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhum objetivo ativo.'}
              </p>
              {!temFiltros && (
                <button onClick={() => setModalCriarObjetivo(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90">
                  + Criar primeiro objetivo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {objetivosAtivos.map((objetivo) => (
                <ObjetivoCard
                  key={objetivo.id}
                  objetivo={objetivo}
                  {...propsModais}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* VISÃO FINALIZADOS */}
      {verFinalizados && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <Archive className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Finalizados</h2>
            <span className="text-xs text-muted-foreground">{totalFinalizados} item{totalFinalizados !== 1 ? 's' : ''}</span>
          </div>

          {totalFinalizados === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Archive className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum objetivo ou KR finalizado ainda.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Objetivos finalizados */}
              {objetivosFinalizados.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Objetivos finalizados ({objetivosFinalizados.length})
                  </p>
                  <div className="space-y-3">
                    {objetivosFinalizados.map((obj) => (
                      <div key={obj.id} className="bg-card border border-border rounded-xl overflow-hidden opacity-80">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                              <Target className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground line-through truncate">{obj.titulo}</h3>
                                <span className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground rounded-full shrink-0">Finalizado</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {obj.krs.length} KR{obj.krs.length !== 1 ? 's' : ''} · {formatPercent(obj.progresso)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleReativarObjetivo(obj)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Reativar
                            </button>
                            <button
                              onClick={() => setExpandidosFinalizados(prev => ({ ...prev, [obj.id]: !prev[obj.id] }))}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                            >
                              {expandidosFinalizados[obj.id]
                                ? <ChevronUp className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />
                              }
                            </button>
                          </div>
                        </div>

                        {expandidosFinalizados[obj.id] && obj.krs.length > 0 && (
                          <div className="border-t border-border p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {obj.krs.map((kr: any) => (
                              <div key={kr.id} className="bg-secondary/40 rounded-lg p-3">
                                <p className="text-xs font-medium text-muted-foreground line-through mb-1">{kr.titulo}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">{formatPercent(kr.progresso)}</span>
                                  <button onClick={() => handleReativarKr(kr)} className="text-[10px] text-primary hover:underline">
                                    Reativar KR
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KRs finalizados em objetivos ativos */}
              {krsFinalizadosEmAtivos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    KRs finalizados em objetivos ativos ({krsFinalizadosEmAtivos.reduce((a, o) => a + o.krs.length, 0)})
                  </p>
                  <div className="space-y-3">
                    {krsFinalizadosEmAtivos.map((obj) => (
                      <div key={obj.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="text-xs font-semibold text-foreground">{obj.titulo}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {obj.krs.map((kr: any) => (
                            <div key={kr.id} className="bg-secondary/40 rounded-lg p-3 opacity-80">
                              <p className="text-xs font-medium text-muted-foreground line-through mb-1">{kr.titulo}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{formatPercent(kr.progresso)}</span>
                                <button onClick={() => handleReativarKr(kr)} className="text-[10px] text-primary hover:underline">
                                  Reativar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAIS */}
      <ModalCriarObjetivo open={modalCriarObjetivo} onClose={() => setModalCriarObjetivo(false)} onSuccess={fetchData} />
      <ModalEditarObjetivo open={modalEditarObjetivo.open} objetivo={modalEditarObjetivo.objetivo} onClose={() => setModalEditarObjetivo({ open: false, objetivo: null })} onSuccess={fetchData} />
      <ModalCriarKr open={modalCriarKr.open} objetivoId={modalCriarKr.objetivo?.id ?? ''} objetivoTitulo={modalCriarKr.objetivo?.titulo} onClose={() => setModalCriarKr({ open: false, objetivo: null })} onSuccess={fetchData} />
      <ModalEditarKr open={modalEditarKr.open} kr={modalEditarKr.kr} onClose={() => setModalEditarKr({ open: false, kr: null })} onSuccess={fetchData} />
      <ModalLancarKr open={modalLancarKr.open} kr={modalLancarKr.kr} onClose={() => setModalLancarKr({ open: false, kr: null })} onSuccess={fetchData} />
      <ModalFinalizarKr open={modalFinalizarKr.open} kr={modalFinalizarKr.kr} onClose={() => setModalFinalizarKr({ open: false, kr: null })} onSuccess={fetchData} />
      <ModalDetalhesKr open={modalDetalhesKr.open} kr={modalDetalhesKr.kr} onClose={() => setModalDetalhesKr({ open: false, kr: null })} onLancar={(kr) => setModalLancarKr({ open: true, kr })} />
      <ModalTaticasKr open={modalTaticasKr.open} kr={modalTaticasKr.kr} onClose={() => setModalTaticasKr({ open: false, kr: null })} />
      <ModalEditarLancamentos open={modalEditarLancamentos.open} kr={modalEditarLancamentos.kr} onClose={() => setModalEditarLancamentos({ open: false, kr: null })} onSuccess={fetchData} />
      <ModalConfirmarExclusao open={modalExcluirKr.open} titulo="Excluir Key Result" descricao="Todos os lançamentos deste KR também serão excluídos." loading={modalExcluirKr.loading} onConfirmar={handleExcluirKr} onClose={() => setModalExcluirKr({ open: false, kr: null, loading: false })} />
      <ModalConfirmarExclusao open={modalExcluirObjetivo.open} titulo="Excluir Objetivo" descricao="Todos os KRs e táticas vinculados também serão excluídos." loading={modalExcluirObjetivo.loading} onConfirmar={handleExcluirObjetivo} onClose={() => setModalExcluirObjetivo({ open: false, objetivo: null, loading: false })} />
    </div>
  )
}