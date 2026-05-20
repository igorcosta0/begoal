'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ModalFinalizarKrProps {
  open: boolean
  kr: {
    id: string
    titulo: string
    meta?: number
    tipo_valor?: string
  } | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalFinalizarKr({
  open,
  kr,
  onClose,
  onSuccess,
}: ModalFinalizarKrProps) {
  const [resultado, setResultado] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kr) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const valor = parseFloat(resultado)

      // Atualiza o KR como concluído e atualiza valor_atual
      const { error: krError } = await supabase
        .from('krs')
        .update({
          concluido: true,
          valor_atual: valor,
        })
        .eq('id', kr.id)

      if (krError) throw krError

      // Registra o lançamento final
      await supabase.from('kr_lancamentos').insert({
        kr_id: kr.id,
        valor,
        data_lancamento: new Date().toISOString().split('T')[0],
        is_final_result: true,
        comentario: 'Resultado final',
      })

      setResultado('')
      onSuccess()
      onClose()
    } catch (err) {
      setError('Erro ao finalizar KR. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">

        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🏁</span>
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Finalizar Key Result
          </h2>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {kr.titulo}
          </p>
        </div>

        <div className="bg-secondary rounded-md px-3 py-2 text-xs text-muted-foreground mb-4 text-center">
          Meta: <span className="font-medium text-foreground">
            {kr.meta ?? 0} {kr.tipo_valor}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">
              Resultado final {kr.tipo_valor ? `(${kr.tipo_valor})` : ''}
            </label>
            <input
              type="number"
              step="any"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              required
              placeholder="0"
              autoFocus
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            ℹ️ O KR será marcado como finalizado. Você pode reativá-lo a qualquer momento pelo menu de opções.
          </p>

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
              disabled={loading || !resultado}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Finalizando...' : 'Finalizar KR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}