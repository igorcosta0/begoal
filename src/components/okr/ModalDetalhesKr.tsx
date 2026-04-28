'use client'

import { useEffect, useState } from 'react'
import { getKrChartData } from '@/lib/queries/okr'
import KrChart from './KrChart'
import { formatPercent, getProgressColor, getProgressStatus, cn } from '@/lib/utils'
import { X, User, Building2, Target } from 'lucide-react'

interface ModalDetalhesKrProps {
  open: boolean
  kr: any | null
  onClose: () => void
  onLancar: (kr: any) => void
}

export default function ModalDetalhesKr({
  open,
  kr,
  onClose,
  onLancar,
}: ModalDetalhesKrProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    if (!open || !kr) return
    setLoadingChart(true)
    getKrChartData(kr.id).then(({ data }) => {
      setChartData(data ?? [])
      setLoadingChart(false)
    })
  }, [open, kr])

  if (!open || !kr) return null

  const progresso = kr.progresso ?? 0
  const status = kr.concluido ? 'Finalizado' : getProgressStatus(progresso)
  const barColor = kr.concluido ? 'bg-gray-400' : getProgressColor(progresso)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6">

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {kr.titulo}
            </h2>
            {kr.objetivo && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {kr.objetivo.titulo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              kr.concluido
                ? 'bg-gray-100 text-gray-600'
                : progresso >= 70
                ? 'bg-green-100 text-green-700'
                : progresso >= 40
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            )}>
              {status}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatPercent(progresso)}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(progresso, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Atual: <span className="font-medium text-foreground">{kr.valor_atual ?? kr.valor_inicial ?? 0} {kr.tipo_valor}</span></span>
            <span>Meta: <span className="font-medium text-foreground">{kr.meta ?? 0} {kr.tipo_valor}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {kr.responsavel && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {kr.responsavel.full_name}
            </span>
          )}
          {kr.setor && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {kr.setor.name}
            </span>
          )}
        </div>

        <div className="border border-border rounded-md p-3 mb-4">
          <p className="text-xs font-medium text-foreground mb-2">
            Evolução histórica
          </p>
          {loadingChart ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <KrChart
              data={chartData}
              valorMeta={kr.meta}
              unidade={kr.tipo_valor}
            />
          )}
        </div>

        {!kr.concluido && (
          <button
            onClick={() => { onLancar(kr); onClose() }}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Lançar novo valor
          </button>
        )}
      </div>
    </div>
  )
}