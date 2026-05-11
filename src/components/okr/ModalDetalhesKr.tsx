'use client'

import { useEffect, useState } from 'react'
import { getKrChartData } from '@/lib/queries/okr'
import KrChart from './KrChart'
import { formatPercent, getProgressColor, getProgressStatus, cn } from '@/lib/utils'
import { X, User, Building2, Target, BarChart2, List } from 'lucide-react'

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
  const [visualizacao, setVisualizacao] = useState<'grafico' | 'linhas'>('grafico')

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
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
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

        {/* Progresso */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              kr.concluido ? 'bg-gray-100 text-gray-600'
                : progresso >= 70 ? 'bg-green-100 text-green-700'
                : progresso >= 40 ? 'bg-yellow-100 text-yellow-700'
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

        {/* Responsável e setor */}
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
              {kr.setor.nome ?? kr.setor.name}
            </span>
          )}
        </div>

        {/* Evolução histórica */}
        <div className="border border-border rounded-md p-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-foreground">Evolução histórica</p>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setVisualizacao('grafico')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  visualizacao === 'grafico'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <BarChart2 className="w-3 h-3" />
                Gráfico
              </button>
              <button
                onClick={() => setVisualizacao('linhas')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  visualizacao === 'linhas'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-3 h-3" />
                Linhas
              </button>
            </div>
          </div>

          {loadingChart ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Carregando...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-24 flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Nenhum lançamento registrado ainda.</p>
            </div>
          ) : visualizacao === 'grafico' ? (
            <KrChart
              data={chartData}
              valorMeta={kr.meta}
              unidade={kr.tipo_valor}
            />
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {/* Cabeçalho */}
              <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                <span>Data</span>
                <span className="text-center">Valor</span>
                <span className="text-right">% Meta</span>
              </div>
              {chartData.map((item, idx) => {
                const porcentagem = item.porcentagem ?? item.percentagem ?? 0
                const cor = porcentagem >= 70 ? 'text-emerald-600' : porcentagem >= 40 ? 'text-amber-600' : 'text-red-600'
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-3 px-3 py-2 text-xs rounded-lg hover:bg-accent/40 transition-colors"
                  >
                    <span className="text-muted-foreground font-medium">
                      {item.texto_exibicao ?? item.data_real ?? '—'}
                    </span>
                    <span className="text-center font-semibold text-foreground">
                      {Number(item.valor).toLocaleString('pt-BR')}
                    </span>
                    <span className={`text-right font-bold ${cor}`}>
                      {formatPercent(porcentagem)}
                    </span>
                  </div>
                )
              })}
            </div>
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