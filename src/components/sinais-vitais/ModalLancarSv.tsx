'use client'

import { useState } from 'react'
import { createSvLancamento } from '@/lib/queries/sinais-vitais'
import { formatNumber } from '@/lib/utils'

interface ModalLancarSvProps {
  open: boolean
  sv: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    tipo_valor?: string
  } | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalLancarSv({ open, sv, onClose, onSuccess }: ModalLancarSvProps) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sv) return
    setLoading(true)
    setError(null)

    const { error } = await createSvLancamento({
      sinal_vital_id: sv.id,
      valor: parseFloat(valor),
      data_lancamento: data,
      comentario: comentario || undefined,
    })

    if (error) {
      setError('Erro ao lançar valor. Tente novamente.')
      setLoading(false)
      return
    }

    setValor('')
    setComentario('')
    setData(new Date().toISOString().split('T')[0])
    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !sv) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">Lançar valor</h2>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{sv.titulo}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 bg-secondary rounded-md px-3 py-2">
          <span>Atual: <span className="font-medium text-foreground">{formatNumber(sv.valor_atual ?? 0)} {sv.tipo_valor}</span></span>
          <span>Meta: <span className="font-medium text-foreground">{formatNumber(sv.meta ?? 0)} {sv.tipo_valor}</span></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">
              Novo valor {sv.tipo_valor ? `(${sv.tipo_valor})` : ''}
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
            <label className="text-xs font-medium text-foreground">Data do lançamento</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Comentário (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Observações sobre este lançamento..."
              rows={2}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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