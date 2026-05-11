'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { useOkrStore } from '@/store/useOkrStore'
import {
  getObjetivos,
  getKrsByEmpresa,
  deleteKr,
  deleteObjetivo,
  updateObjetivo,
  getSetoresByEmpresa,
  getFuncionariosByEmpresa,
  reativarKr,
} from '@/lib/queries/okr'
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

export default function OkrPage() {
  const { empresa } = useEmpresaStore()
  const { filters, setFiltroObjetivo, setFiltroResponsavel, setFiltroSetor, clearFilters } = useOkrStore()

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const objetivosComKrs = objetivos
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
        .map((kr) => ({
          ...kr,
          responsavel: kr.funcionarios,
          setor: kr.setores ? { nome: kr.setores.name } : null,
          objetivo: kr.objetivos,
          progresso: (() => {
            const atual = kr.valor_atual ?? kr.valor_inicial ?? 0
            const inicial = kr.valor_inicial ?? 0
            const meta = kr.meta ?? 0
            if (meta === inicial) return 0
            if (meta < inicial) return Math.min(100, Math.max(0, ((inicial - atual) / (inicial - meta)) * 100))
            return Math.min(100, Math.max(0, ((atual - inicial) / (meta - inicial)) * 100))
          })(),
        })),
    }))

  const objetivosFinais = objetivosComKrs.map((obj) => ({
    ...obj,
    progresso: obj.krs.length > 0
      ? obj.krs.reduce((acc: number, kr: any) => acc + (kr.progresso ?? 0), 0) / obj.krs.length
      : 0,
  }))

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

  const temFiltros = filters.objetivoId || filters.responsavelId || filters.setorId

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OKRs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.company_name} — Gerencie seus objetivos e Key Results
          </p>
        </div>
        <button
          onClick={() => setModalCriarObjetivo(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Novo Objetivo
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.objetivoId ?? ''}
          onChange={(e) => setFiltroObjetivo(e.target.value || null)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os objetivos</option>
          {objetivos.map((obj) => (
            <option key={obj.id} value={obj.id}>{obj.titulo}</option>
          ))}
        </select>

        <select
          value={filters.responsavelId ?? ''}
          onChange={(e) => setFiltroResponsavel(e.target.value || null)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os responsáveis</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>{f.full_name}</option>
          ))}
        </select>

        <select
          value={filters.setorId ?? ''}
          onChange={(e) => setFiltroSetor(e.target.value || null)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {temFiltros && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : objetivosFinais.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            {temFiltros ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhum objetivo cadastrado ainda.'}
          </p>
          {!temFiltros && (
            <button
              onClick={() => setModalCriarObjetivo(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Criar primeiro objetivo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {objetivosFinais.map((objetivo) => (
            <ObjetivoCard
              key={objetivo.id}
              objetivo={objetivo}
              onCriarKr={(obj) => setModalCriarKr({ open: true, objetivo: obj })}
              onEditarObjetivo={(obj) => setModalEditarObjetivo({ open: true, objetivo: obj })}
              onExcluirObjetivo={(obj) => setModalExcluirObjetivo({ open: true, objetivo: obj, loading: false })}
              onLancarKr={(kr) => setModalLancarKr({ open: true, kr })}
              onEditarKr={(kr) => setModalEditarKr({ open: true, kr })}
              onFinalizarKr={(kr) => setModalFinalizarKr({ open: true, kr })}
              onExcluirKr={(kr) => setModalExcluirKr({ open: true, kr, loading: false })}
              onVerGraficoKr={(kr) => setModalDetalhesKr({ open: true, kr })}
              onReativarKr={handleReativarKr}
              onVerTaticasKr={(kr) => setModalTaticasKr({ open: true, kr })}
              onEditarLancamentosKr={(kr) => setModalEditarLancamentos({ open: true, kr })}
            />
          ))}
        </div>
      )}

      <ModalCriarObjetivo
        open={modalCriarObjetivo}
        onClose={() => setModalCriarObjetivo(false)}
        onSuccess={fetchData}
      />
      <ModalEditarObjetivo
        open={modalEditarObjetivo.open}
        objetivo={modalEditarObjetivo.objetivo}
        onClose={() => setModalEditarObjetivo({ open: false, objetivo: null })}
        onSuccess={fetchData}
      />
      <ModalCriarKr
        open={modalCriarKr.open}
        objetivoId={modalCriarKr.objetivo?.id ?? ''}
        objetivoTitulo={modalCriarKr.objetivo?.titulo}
        onClose={() => setModalCriarKr({ open: false, objetivo: null })}
        onSuccess={fetchData}
      />
      <ModalEditarKr
        open={modalEditarKr.open}
        kr={modalEditarKr.kr}
        onClose={() => setModalEditarKr({ open: false, kr: null })}
        onSuccess={fetchData}
      />
      <ModalLancarKr
        open={modalLancarKr.open}
        kr={modalLancarKr.kr}
        onClose={() => setModalLancarKr({ open: false, kr: null })}
        onSuccess={fetchData}
      />
      <ModalFinalizarKr
        open={modalFinalizarKr.open}
        kr={modalFinalizarKr.kr}
        onClose={() => setModalFinalizarKr({ open: false, kr: null })}
        onSuccess={fetchData}
      />
      <ModalDetalhesKr
        open={modalDetalhesKr.open}
        kr={modalDetalhesKr.kr}
        onClose={() => setModalDetalhesKr({ open: false, kr: null })}
        onLancar={(kr) => setModalLancarKr({ open: true, kr })}
      />
      <ModalTaticasKr
        open={modalTaticasKr.open}
        kr={modalTaticasKr.kr}
        onClose={() => setModalTaticasKr({ open: false, kr: null })}
      />
      <ModalEditarLancamentos
        open={modalEditarLancamentos.open}
        kr={modalEditarLancamentos.kr}
        onClose={() => setModalEditarLancamentos({ open: false, kr: null })}
        onSuccess={fetchData}
      />
      <ModalConfirmarExclusao
        open={modalExcluirKr.open}
        titulo="Excluir Key Result"
        descricao="Todos os lançamentos deste KR também serão excluídos."
        loading={modalExcluirKr.loading}
        onConfirmar={handleExcluirKr}
        onClose={() => setModalExcluirKr({ open: false, kr: null, loading: false })}
      />
      <ModalConfirmarExclusao
        open={modalExcluirObjetivo.open}
        titulo="Excluir Objetivo"
        descricao="Todos os KRs e táticas vinculados também serão excluídos."
        loading={modalExcluirObjetivo.loading}
        onConfirmar={handleExcluirObjetivo}
        onClose={() => setModalExcluirObjetivo({ open: false, objetivo: null, loading: false })}
      />
    </div>
  )
}