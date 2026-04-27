'use client'

import { useState, useEffect } from 'react'
import { createObjetivo, getSetoresByEmpresa } from '@/lib/queries/okr'
import { useEmpresaStore } from '@/store/useEmpresaStore'

interface ModalCriarObjetivoProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ModalCriarObjetivo({
  open,
  onClose,
  onSuccess,
}: ModalCriarObjetivoProps) {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setores, setSetores] = useState<any[]>([])
  const [titulo, setTitulo] = useState('')
  const [setorIds, setSetorIds] = useState<string[]>([])

  useEffect(() => {
    if (!open || !empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
  }, [open, empresa])

  function toggleSetor(id: string) {
    setSetorIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    setLoading(true)
    setError(null)

    const { error } = await createObjetivo({
      titulo,
      client_id: empresa.id,
      setor_ids: setorIds,
    })

    if (error) {
      setError('Erro ao criar objetivo. Tente novamente.')
      setLoading(false)
      return
    }

    setTitulo('')
    setSetorIds([])
    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Criar Objetivo
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">
              Título do objetivo
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex: Aumentar satisfação dos clientes"
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {setores.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground">
                Setores vinculados
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {setores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSetor(s.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      setorIds.includes(s.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {s.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar objetivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}