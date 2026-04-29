'use client'

import { useEffect, useState } from 'react'
import { getSvLancamentos, deleteSvLancamento } from '@/lib/queries/sinais-vitais'
import { formatNumber } from '@/lib/utils'
import { X, Trash2 } from 'lucide-react'
import KrChart from '@/components/okr/KrChart'

interface ModalHistoricoSvProps {
  open: boolean
  sv: any | null
  onClose: () => void
  onLancar: (sv: any) => void
}

export default function ModalHistoricoSv({ open, sv, onClose, onLancar }: ModalHistoricoSvProps) {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !sv) return
    setLoading(true)
    getSvLancamentos(sv.id).then(({ data }) => {
      setLancamentos(data ?? [])
      setLoading(false)
    })
  }, [open, sv])

  async function handleDelete(id: string) {
    await deleteSvLancamento(id)
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
  }

  if (!open || !sv) return null

  const chartData = lancamentos.map((l) => ({
    data_lancamento: l.data_lancamento,
    valor: l.valor,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {sv.titulo}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atual: <span className="font-medium text-foreground">
                {formatNumber(sv.valor_atual ?? 0)} {sv.tipo_valor}
              </span>
              {' · '}
              Meta: <span className="font-medium text-foreground">
                {formatNumber(sv.meta ?? 0)} {sv.tipo_valor}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gráfico */}
        <div className="border border-border rounded-md p-3 mb-4">
          <p className="text-xs font-medium text-foreground mb-2">Evolução histórica</p>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <KrChart
              data={chartData}
              valorMeta={sv.meta}
              unidade={sv.tipo_valor}
            />
          )}
        </div>

        {/* Lista de lançamentos */}
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {lancamentos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum lançamento registrado ainda.
            </p>
          ) : (
            lancamentos.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-secondary/50 text-xs"
              >
                <div className="flex-1">
                  <span className="font-medium text-foreground">
                    {formatNumber(l.valor)} {sv.tipo_valor}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(l.data_lancamento).toLocaleDateString('pt-BR')}
                  </span>
                  {l.comentario && (
                    <p className="text-muted-foreground mt-0.5">{l.comentario}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Ação */}
        <button
          onClick={() => { onLancar(sv); onClose() }}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Lançar novo valor
        </button>
      </div>
    </div>
  )
}