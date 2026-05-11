'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, getProgressColor, getProgressStatus } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Calendar, Zap, ClipboardList } from 'lucide-react'

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
    data_ultimo_lancamento?: string | null
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
  onReativar?: (kr: any) => void
  onVerTaticas?: (kr: any) => void
  onEditarLancamentos?: (kr: any) => void
}

export default function KrCard({
  kr,
  onLancar,
  onEditar,
  onFinalizar,
  onExcluir,
  onVerGrafico,
  onReativar,
  onVerTaticas,
  onEditarLancamentos,
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

  const dataUltimoLancamento = kr.data_ultimo_lancamento
    ? new Date(kr.data_ultimo_lancamento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header */}
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
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-md shadow-lg z-10 min-w-40 py-1">
              <button
                onClick={() => { onVerGrafico?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-3 h-3" />
                Ver gráfico
              </button>
              <button
                onClick={() => { onVerTaticas?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Zap className="w-3 h-3" />
                Táticas
              </button>
              <button
                onClick={() => { onEditarLancamentos?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <ClipboardList className="w-3 h-3" />
                Editar lançamentos
              </button>
              <button
                onClick={() => { onEditar?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
              >
                Editar KR
              </button>
              {!kr.concluido ? (
                <button
                  onClick={() => { onFinalizar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-blue-600"
                >
                  Finalizar KR
                </button>
              ) : (
                <button
                  onClick={() => { onReativar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-green-600"
                >
                  Reativar KR
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
          <p className="text-xs text-muted-foreground mb-0.5">Valor Inicial</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(kr.valor_inicial ?? 0)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Conquistado</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(kr.valor_atual ?? kr.valor_inicial ?? 0)}
          </p>
          {dataUltimoLancamento && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {dataUltimoLancamento}
            </p>
          )}
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(kr.meta ?? 0)}
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
      {kr.concluido ? (
        <div className="w-full py-2 px-4 bg-secondary text-muted-foreground rounded-lg text-xs font-medium text-center">
          ✓ KR Finalizado
        </div>
      ) : (
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