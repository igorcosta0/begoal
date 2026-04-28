'use client'

import { useState } from 'react'
import { cn, formatPercent } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Calendar } from 'lucide-react'

interface KrCardProps {
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    valor_inicial?: number
    progresso?: number
    tipo_valor?: string
    end_date?: string
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
  const barColor = kr.concluido
    ? 'bg-gray-400'
    : progresso >= 70
    ? 'bg-green-500'
    : progresso >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500'
  const setorNome = kr.setor?.nome ?? kr.setor?.name
  const endDate = kr.end_date
    ? new Date(kr.end_date).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    : null

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header — título + menu */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1">
          {kr.titulo}
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

      {/* Barra de progresso colorida */}
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
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Conquistado</p>
          <p className="text-sm font-semibold text-foreground">
            {kr.valor_atual ?? kr.valor_inicial ?? 0}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
          <p className="text-sm font-semibold text-foreground">
            {kr.meta ?? 0}
          </p>
        </div>
      </div>

      {/* Responsável, Setor e Data */}
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
        {endDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            Referente à {endDate}
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