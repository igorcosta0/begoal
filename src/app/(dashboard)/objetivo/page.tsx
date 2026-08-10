'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { getObjetivos, createObjetivo, updateObjetivo, deleteObjetivo } from '@/lib/queries/okr'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { Target, MoreHorizontal, Plus } from 'lucide-react'
import { mensagemErroExclusao } from '@/lib/utils'

export default function ObjetivoPage() {
  const { empresa } = useEmpresaStore()

  const [objetivos, setObjetivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<{ open: boolean; objetivo: any | null }>({ open: false, objetivo: null })
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; objetivo: any | null; loading: boolean; erro: string | null }>({ open: false, objetivo: null, loading: false, erro: null })
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const [formCriar, setFormCriar] = useState({ titulo: '', descricao: '' })
  const [formEditar, setFormEditar] = useState({ titulo: '', descricao: '' })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const { data } = await getObjetivos(empresa.id)
    setObjetivos(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!modalEditar.objetivo) return
    setFormEditar({
      titulo: modalEditar.objetivo.titulo ?? '',
      descricao: modalEditar.objetivo.descricao ?? '',
    })
  }, [modalEditar.objetivo])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    await createObjetivo({
      titulo: formCriar.titulo,
      client_id: empresa.id,
    })
    setFormCriar({ titulo: '', descricao: '' })
    setModalCriar(false)
    fetchData()
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditar.objetivo) return
    await updateObjetivo(modalEditar.objetivo.id, {
      titulo: formEditar.titulo,
    })
    setModalEditar({ open: false, objetivo: null })
    fetchData()
  }

  async function handleExcluir() {
    if (!modalExcluir.objetivo) return
    setModalExcluir((prev) => ({ ...prev, loading: true, erro: null }))
    const { error } = await deleteObjetivo(modalExcluir.objetivo.id)
    if (error) {
      setModalExcluir((prev) => ({ ...prev, loading: false, erro: mensagemErroExclusao(error, 'KRs ou táticas') }))
      return
    }
    setModalExcluir({ open: false, objetivo: null, loading: false, erro: null })
    fetchData()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Objetivos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {empresa?.company_name} — Gerencie os objetivos estratégicos
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Objetivo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : objetivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">
            Nenhum objetivo cadastrado ainda.
          </p>
          <button
            onClick={() => setModalCriar(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> Criar primeiro objetivo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {objetivos.map((objetivo) => (
            <div
              key={objetivo.id}
              className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {objetivo.titulo}
                  </p>
                  {objetivo.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {objetivo.descricao}
                    </p>
                  )}
                  {objetivo.start_date && objetivo.end_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(objetivo.start_date).toLocaleDateString('pt-BR')} →{' '}
                      {new Date(objetivo.end_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen(menuOpen === objetivo.id ? null : objetivo.id)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen === objetivo.id && (
                  <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-lg z-10 min-w-36 py-1">
                    <button
                      onClick={() => { setModalEditar({ open: true, objetivo }); setMenuOpen(null) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setModalExcluir({ open: true, objetivo, loading: false, erro: null }); setMenuOpen(null) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      {modalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalCriar(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Novo Objetivo</h2>
            <form onSubmit={handleCriar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={formCriar.titulo}
                  onChange={(e) => setFormCriar({ ...formCriar, titulo: e.target.value })}
                  required
                  placeholder="Ex: Aumentar satisfação dos clientes"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Descrição (opcional)</label>
                <textarea
                  value={formCriar.descricao}
                  onChange={(e) => setFormCriar({ ...formCriar, descricao: e.target.value })}
                  rows={3}
                  placeholder="Descreva o objetivo..."
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCriar(false)}
                  className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalEditar({ open: false, objetivo: null })} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Editar Objetivo</h2>
            <form onSubmit={handleEditar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={formEditar.titulo}
                  onChange={(e) => setFormEditar({ ...formEditar, titulo: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Descrição (opcional)</label>
                <textarea
                  value={formEditar.descricao}
                  onChange={(e) => setFormEditar({ ...formEditar, descricao: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditar({ open: false, objetivo: null })}
                  className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir Objetivo"
        descricao="Todos os KRs e táticas vinculados também serão excluídos."
        loading={modalExcluir.loading}
        erro={modalExcluir.erro}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, objetivo: null, loading: false, erro: null })}
      />
    </div>
  )
}