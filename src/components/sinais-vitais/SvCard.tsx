'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, getProgressColor } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Target } from 'lucide-react'

interface SvCardProps {
  sv: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    valor_inicial?: number
    tipo_valor?: string
    responsavel?: { full_name: string }
    setor?: { name?: string; nome?: string }
    objetivo?: { titulo: string }
  }
  onLancar?: (sv: any) => void
  onEditar?: (sv: any) => void
  onExcluir?: (sv: any) => void
  onVerHistorico?: (sv: any) => void
}

export default function SvCard({
  sv,
  onLancar,
  onEditar,
  onExcluir,
  onVerHistorico,
}: SvCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const progresso = sv.meta && sv.meta > 0
    ? Math.max(0, ((sv.valor_atual ?? sv.valor_inicial ?? 0) - (sv.valor_inicial ?? 0)) / (sv.meta - (sv.valor_inicial ?? 0)) * 100)
    : 0

  const barColor = progresso >= 70
    ? 'bg-green-500'
    : progresso >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500'

  const setorNome = sv.setor?.nome ?? sv.setor?.name

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1">
          {sv.titulo}
        </p>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
              <button
                onClick={() => { onVerHistorico?.(sv); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-3 h-3" />
                Ver histórico
              </button>
              <button
                onClick={() => { onEditar?.(sv); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => { onExcluir?.(sv); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
              >
                Excluir
              </button>
            </div>
          )}
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

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Inicial</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(sv.valor_inicial ?? 0)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Atual</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(sv.valor_atual ?? sv.valor_inicial ?? 0)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(sv.meta ?? 0)}
          </p>
        </div>
      </div>

      {/* Responsável, Setor e Objetivo */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {sv.responsavel && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            {sv.responsavel.full_name}
          </span>
        )}
        {setorNome && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" />
            {setorNome}
          </span>
        )}
        {sv.objetivo && (
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3 shrink-0" />
            {sv.objetivo.titulo}
          </span>
        )}
      </div>

      {/* Ação */}
      <button
        onClick={() => onLancar?.(sv)}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity mt-1"
      >
        Lançar valor
      </button>
    </div>
  )
}