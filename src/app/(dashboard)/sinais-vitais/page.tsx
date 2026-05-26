'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { getSinaisVitais, deleteSinalVital } from '@/lib/queries/sinais-vitais'
import SvCard from '@/components/sinais-vitais/SvCard'
import ModalCriarSv from '@/components/sinais-vitais/ModalCriarSv'
import ModalEditarSv from '@/components/sinais-vitais/ModalEditarSv'
import ModalLancarSv from '@/components/sinais-vitais/ModalLancarSv'
import ModalHistoricoSv from '@/components/sinais-vitais/ModalHistoricoSv'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'

export default function SinaisVitaisPage() {
  const { empresa } = useEmpresaStore()

  const [svs, setSvs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalLancar, setModalLancar] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalHistorico, setModalHistorico] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; sv: any | null; loading: boolean }>({ open: false, sv: null, loading: false })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const { data } = await getSinaisVitais(empresa.id)
    setSvs(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const svsFiltrados = svs
    .filter((sv) => !busca || sv.titulo.toLowerCase().includes(busca.toLowerCase()))
    .map((sv) => ({
      ...sv,
      responsavel: sv.funcionarios,
      setor: sv.setores ? { name: sv.setores.name } : null,
      objetivo: sv.objetivos ? { titulo: sv.objetivos.titulo } : null,
    }))

  async function handleExcluir() {
    if (!modalExcluir.sv) return
    setModalExcluir((prev) => ({ ...prev, loading: true }))
    await deleteSinalVital(modalExcluir.sv.id)
    setModalExcluir({ open: false, sv: null, loading: false })
    fetchData()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sinais Vitais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.company_name} — KPIs contínuos da empresa
          </p>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Novo Sinal Vital
        </button>
      </div>

      {/* Busca */}
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar sinal vital..."
        className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : svsFiltrados.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            {busca ? 'Nenhum resultado para a busca.' : 'Nenhum sinal vital cadastrado ainda.'}
          </p>
          {!busca && (
            <button
              onClick={() => setModalCriar(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Criar primeiro sinal vital
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {svsFiltrados.map((sv) => (
            <SvCard
              key={sv.id}
              sv={sv}
              onLancar={(sv) => setModalLancar({ open: true, sv })}
              onEditar={(sv) => setModalEditar({ open: true, sv })}
              onExcluir={(sv) => setModalExcluir({ open: true, sv, loading: false })}
              onVerHistorico={(sv) => setModalHistorico({ open: true, sv })}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <ModalCriarSv
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        onSuccess={fetchData}
      />
      <ModalEditarSv
        open={modalEditar.open}
        sv={modalEditar.sv}
        onClose={() => setModalEditar({ open: false, sv: null })}
        onSuccess={fetchData}
      />
      <ModalLancarSv
        open={modalLancar.open}
        sv={modalLancar.sv}
        onClose={() => setModalLancar({ open: false, sv: null })}
        onSuccess={fetchData}
      />
      <ModalHistoricoSv
        open={modalHistorico.open}
        sv={modalHistorico.sv}
        onClose={() => setModalHistorico({ open: false, sv: null })}
        onLancar={(sv) => setModalLancar({ open: true, sv })}
      />
      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir Sinal Vital"
        descricao="Todos os lançamentos deste sinal vital também serão excluídos."
        loading={modalExcluir.loading}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, sv: null, loading: false })}
      />
    </div>
  )
}