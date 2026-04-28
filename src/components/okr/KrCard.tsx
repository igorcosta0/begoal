'use client'

import { useState } from 'react'
import { cn, formatPercent, getProgressColor, getProgressStatus } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2 } from 'lucide-react'

interface KrCardProps {
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    valor_inicial?: number
    progresso?: number
    tipo_valor?: string
    responsavel?: { full_name: string }
    setor?: { nome?: string; name?: string }
    objetivo?: { titulo: string }
    concluido?: boolean
  }
  onLancar?: (kr: any) => void
  onEditar?: (kr: any) => void
  onFinalizar?: (kr: any) => void
  onExcluir?: (kr: any) => void
  onVerGrafico?: (kr: any) => void
}

export default function KrCard({
  kr,
  onLancar,
  onEditar,
  onFinalizar,
  onExcluir,
  onVerGrafico,
}: KrCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const progresso = kr.progresso ?? 0
  const status = kr.concluido ? 'Finalizado' : getProgressStatus(progresso)
  const barColor = kr.concluido ? 'bg-gray-400' : getProgressColor(progresso)
  const setorNome = kr.setor?.nome ?? kr.setor?.name

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header — título + status */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1">
          {kr.titulo}
        </p>
        <div className="flex items-center gap-2 shrink-0">
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
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
                <button
                  onClick={() => { onVerGrafico?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-3 h-3" />
                  Ver gráfico
                </button>
                <button
                  onClick={() => { onEditar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  Editar KR
                </button>
                {!kr.concluido && (
                  <button
                    onClick={() => { onFinalizar?.(kr); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-blue-600"
                  >
                    Finalizar KR
                  </button>
                )}
                <button
                  onClick={() => { onExcluir?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold text-foreground">{formatPercent(progresso)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>
      </div>

      {/* Métricas — 3 colunas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Valor Inicial</p>
          <p className="text-sm font-semibold text-foreground">
            {kr.valor_inicial ?? 0}
          </p>
          {kr.tipo_valor && (
            <p className="text-xs text-muted-foreground">{kr.tipo_valor}</p>
          )}
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Conquistado</p>
          <p className="text-sm font-semibold text-foreground">
            {kr.valor_atual ?? kr.valor_inicial ?? 0}
          </p>
          {kr.tipo_valor && (
            <p className="text-xs text-muted-foreground">{kr.tipo_valor}</p>
          )}
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Alvo</p>
          <p className="text-sm font-semibold text-foreground">
            {kr.meta ?? 0}
          </p>
          {kr.tipo_valor && (
            <p className="text-xs text-muted-foreground">{kr.tipo_valor}</p>
          )}
        </div>
      </div>

      {/* Responsável e Setor */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {kr.responsavel && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            {kr.responsavel.full_name}
          </span>
        )}
        {setorNome && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" />
            {setorNome}
          </span>
        )}
      </div>

      {/* Ação */}
      {!kr.concluido && (
        <button
          onClick={() => onLancar?.(kr)}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity mt-1"
        >
          Lançar valor
        </button>
      )}
    </div>
  )
}