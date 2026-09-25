'use client'

import { useEffect, useState } from 'react'
import { getSvLancamentos, deleteSvLancamento } from '@/lib/queries/sinais-vitais'
import { formatNumber, formatValor, formatDate } from '@/lib/utils'
import { X } from 'lucide-react'
import BotaoExcluirConfirmando from '@/components/BotaoExcluirConfirmando'
import KrChart from '@/components/okr/KrChart'

interface ModalHistoricoSvProps {
  open: boolean
  sv: any | null
  onClose: () => void
  onLancar: (sv: any) => void
  onAlterado?: () => void
}

export default function ModalHistoricoSv({ open, sv, onClose, onLancar, onAlterado }: ModalHistoricoSvProps) {
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
    // Pente fino (A6): recalcula o valor atual e atualiza a página.
    const { error } = await deleteSvLancamento(id, sv.id)
    if (error) return
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
    onAlterado?.()
  }

  if (!open || !sv) return null

  const chartData = lancamentos.map((l) => ({
    data_lancamento: l.data_lancamento,
    valor: l.valor,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {sv.titulo}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atual: <span className="font-medium text-foreground">
                {formatValor(sv.valor_atual ?? 0, sv.tipo_valor)}
              </span>
              {' · '}
              Meta: <span className="font-medium text-foreground">
                {formatValor(sv.meta ?? 0, sv.tipo_valor)}
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
                    {formatValor(l.valor, sv.tipo_valor)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {formatDate(l.data_lancamento)}
                  </span>
                  {l.comentario && (
                    <p className="text-muted-foreground mt-0.5">{l.comentario}</p>
                  )}
                </div>
                <BotaoExcluirConfirmando
                  onConfirmar={() => handleDelete(l.id)}
                  className="shrink-0"
                  iconClassName="w-3 h-3"
                />
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