'use client'

import { useState, useEffect } from 'react'
import { updateObjetivo } from '@/lib/queries/okr'

interface ModalEditarObjetivoProps {
  open: boolean
  objetivo: any | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalEditarObjetivo({
  open,
  objetivo,
  onClose,
  onSuccess,
}: ModalEditarObjetivoProps) {
  const [titulo, setTitulo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!objetivo) return
    setTitulo(objetivo.titulo ?? '')
  }, [objetivo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!objetivo) return
    setLoading(true)
    await updateObjetivo(objetivo.id, { titulo })
    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !objetivo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Editar Objetivo
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}