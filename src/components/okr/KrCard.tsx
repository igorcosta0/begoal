'use client'

import { useState } from 'react'
import { cn, formatPercent, getProgressColor, getProgressStatus } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, ChevronDown, ChevronUp } from 'lucide-react'

interface KrCardProps {
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    valor_meta?: number
    valor_inicial?: number
    progresso?: number
    unidade?: string
    responsavel?: { full_name: string }
    setor?: { nome: string }
    objetivo?: { titulo: string }
    finalizado?: boolean
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
  const status = kr.finalizado ? 'Finalizado' : getProgressStatus(progresso)
  const barColor = kr.finalizado ? 'bg-gray-400' : getProgressColor(progresso)

  return (
    <div className="relative bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {kr.titulo}
          </p>
          {kr.objetivo && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {kr.objetivo.titulo}
            </p>
          )}
        </div>

        {/* Badge status */}
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
          kr.finalizado
            ? 'bg-gray-100 text-gray-600'
            : progresso >= 70
            ? 'bg-green-100 text-green-700'
            : progresso >= 40
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        )}>
          {status}
        </span>
      </div>

      {/* Progresso */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span className="font-medium text-foreground">
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
          <span>
            Atual: <span className="font-medium text-foreground">
              {kr.valor_atual ?? kr.valor_inicial ?? 0} {kr.unidade}
            </span>
          </span>
          <span>
            Meta: <span className="font-medium text-foreground">
              {kr.valor_meta ?? 0} {kr.unidade}
            </span>
          </span>
        </div>
      </div>

      {/* Responsável e Setor */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {kr.responsavel && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {kr.responsavel.full_name}
          </span>
        )}
        {kr.setor && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {kr.setor.nome}
          </span>
        )}
      </div>

      {/* Ações */}
      {!kr.finalizado && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <button
            onClick={() => onLancar?.(kr)}
            className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Lançar valor
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-8 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
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
                <button
                  onClick={() => { onFinalizar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-blue-600"
                >
                  Finalizar KR
                </button>
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
      )}
    </div>
  )
}