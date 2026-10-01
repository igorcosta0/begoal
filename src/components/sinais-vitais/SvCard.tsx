'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, formatValor, getProgressColor } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Target, Flag, ArrowLeft, ArrowRight } from 'lucide-react'
import { progressoSinalVital, type PontoSerie } from '@/lib/okrProgresso'
import MiniGrafico, { Tendencia } from '@/components/okr/MiniGrafico'

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
    kr?: { titulo: string } | null
    serie?: PontoSerie[]
  }
  onLancar?: (sv: any) => void
  onEditar?: (sv: any) => void
  onRemover?: (sv: any) => void
  onExcluir?: (sv: any) => void
  onVerHistorico?: (sv: any) => void
  // Ordem dos cards: alça de arrastar (antes do título) e, no menu, mover uma posição (celular).
  alca?: React.ReactNode
  onMoverAntes?: () => void
  onMoverDepois?: () => void
}

export default function SvCard({
  sv,
  onLancar,
  onEditar,
  onRemover,
  onExcluir,
  onVerHistorico,
  alca,
  onMoverAntes,
  onMoverDepois,
}: SvCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const progresso = progressoSinalVital(sv)

  const barColor = progresso >= 70
    ? 'bg-green-500'
    : progresso >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500'

  const setorNome = sv.setor?.nome ?? sv.setor?.name
  const serie = sv.serie ?? []
  // Sinal vital não tem coluna de direção: meta abaixo do inicial = quanto menor, melhor (mesma regra do progresso).
  const direcao = Number(sv.meta ?? 0) < Number(sv.valor_inicial ?? 0) ? 'menor' : 'maior'

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-1 flex-1 min-w-0">
          {alca}
          <p className="text-sm font-semibold text-foreground leading-snug flex-1">
            {sv.titulo}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />}
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-xl shadow-lg z-20 min-w-36 py-1">
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
              {(onMoverAntes || onMoverDepois) && (
                <>
                  <div className="my-1 border-t border-border" />
                  {onMoverAntes && (
                    <button
                      onClick={() => { onMoverAntes(); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Mover para antes
                    </button>
                  )}
                  {onMoverDepois && (
                    <button
                      onClick={() => { onMoverDepois(); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Mover para depois
                    </button>
                  )}
                  <div className="my-1 border-t border-border" />
                </>
              )}
              {onRemover && (
                <button
                  onClick={() => { onRemover(sv); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  Mover para Removidos
                </button>
              )}
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
            {formatValor(sv.valor_inicial ?? 0, sv.tipo_valor)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Atual</p>
          <p className="text-sm font-semibold text-foreground">
            {formatValor(sv.valor_atual ?? sv.valor_inicial ?? 0, sv.tipo_valor)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
          <p className="text-sm font-semibold text-foreground">
            {formatValor(sv.meta ?? 0, sv.tipo_valor)}
          </p>
        </div>
      </div>

      {/* Evolução dos lançamentos (mesmo gráfico dos KRs) */}
      {serie.length >= 1 && (
        <div className="space-y-1.5">
          <MiniGrafico
            serie={serie}
            meta={sv.meta}
            acumular={false}
            direcao={direcao}
            tipoValor={sv.tipo_valor}
            onAbrir={onVerHistorico ? () => onVerHistorico(sv) : undefined}
          />
          <div className="flex items-center justify-between gap-2">
            <Tendencia serie={serie} direcao={direcao} tipoValor={sv.tipo_valor} />
            {onVerHistorico && (
              <button
                onClick={() => onVerHistorico(sv)}
                className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <TrendingUp className="w-3 h-3" />
                Gráfico completo
              </button>
            )}
          </div>
        </div>
      )}

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
        {sv.kr && (
          <span className="flex items-center gap-1">
            <Flag className="w-3 h-3 shrink-0" />
            {sv.kr.titulo}
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