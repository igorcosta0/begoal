'use client'

import { useState } from 'react'
import { cn, formatPercent, getProgressColor } from '@/lib/utils'
import { ChevronDown, ChevronUp, MoreHorizontal, Target, Archive } from 'lucide-react'
import KrCard from './KrCard'

interface ObjetivoCardProps {
  objetivo: {
    id: string
    titulo: string
    progresso?: number
    krs?: any[]
  }
  onCriarKr?: (objetivo: any) => void
  onEditarObjetivo?: (objetivo: any) => void
  onExcluirObjetivo?: (objetivo: any) => void
  onFinalizarObjetivo?: (objetivo: any) => void
  onLancarKr?: (kr: any) => void
  onEditarKr?: (kr: any) => void
  onFinalizarKr?: (kr: any) => void
  onExcluirKr?: (kr: any) => void
  onVerGraficoKr?: (kr: any) => void
  onReativarKr?: (kr: any) => void
  onVerTaticasKr?: (kr: any) => void
  onEditarLancamentosKr?: (kr: any) => void
}

export default function ObjetivoCard({
  objetivo,
  onCriarKr,
  onEditarObjetivo,
  onExcluirObjetivo,
  onFinalizarObjetivo,
  onLancarKr,
  onEditarKr,
  onFinalizarKr,
  onExcluirKr,
  onVerGraficoKr,
  onReativarKr,
  onVerTaticasKr,
  onEditarLancamentosKr,
}: ObjetivoCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const progresso = objetivo.progresso ?? 0
  const krs = objetivo.krs ?? []
  const barColor = getProgressColor(progresso)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                {objetivo.titulo}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {krs.length} Key Result{krs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-20 min-w-40 py-1">
                    <button
                      onClick={() => { onCriarKr?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-primary font-medium"
                    >
                      + Novo KR
                    </button>
                    <button
                      onClick={() => { onEditarObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                    >
                      Editar objetivo
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { onFinalizarObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-amber-600 flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Finalizar objetivo
                    </button>
                    <button
                      onClick={() => { onExcluirObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                    >
                      Excluir objetivo
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span className="font-medium text-foreground">{formatPercent(progresso)}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(progresso, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {krs.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Nenhum KR cadastrado ainda.</p>
              <button
                onClick={() => onCriarKr?.(objetivo)}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                + Criar primeiro KR
              </button>
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {krs.map((kr) => (
                <KrCard
                  key={kr.id}
                  kr={kr}
                  onLancar={onLancarKr}
                  onEditar={onEditarKr}
                  onFinalizar={onFinalizarKr}
                  onExcluir={onExcluirKr}
                  onVerGrafico={onVerGraficoKr}
                  onReativar={onReativarKr}
                  onVerTaticas={onVerTaticasKr}
                  onEditarLancamentos={onEditarLancamentosKr}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}