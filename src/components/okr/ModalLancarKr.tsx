'use client'

import { useState } from 'react'
import { createKrLancamento } from '@/lib/queries/okr'

interface ModalLancarKrProps {
  open: boolean
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    valor_meta?: number
    unidade?: string
  } | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalLancarKr({
  open,
  kr,
  onClose,
  onSuccess,
}: ModalLancarKrProps) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kr) return
    setLoading(true)
    setError(null)

    const { error } = await createKrLancamento({
      kr_id: kr.id,
      valor: parseFloat(valor),
      data_lancamento: data,
    })

    if (error) {
      setError('Erro ao lançar valor. Tente novamente.')
      setLoading(false)
      return
    }

    setValor('')
    setData(new Date().toISOString().split('T')[0])
    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">
          Lançar valor
        </h2>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
          {kr.titulo}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 bg-secondary rounded-md px-3 py-2">
          <span>Valor atual: <span className="font-medium text-foreground">{kr.valor_atual ?? 0} {kr.unidade}</span></span>
          <span>Meta: <span className="font-medium text-foreground">{kr.valor_meta ?? 0} {kr.unidade}</span></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">
              Novo valor {kr.unidade ? `(${kr.unidade})` : ''}
            </label>
            <input
              type="number"
              step="any"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              placeholder="0"
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Data do lançamento
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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
              {loading ? 'Lançando...' : 'Lançar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}