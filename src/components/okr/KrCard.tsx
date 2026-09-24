'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, formatValor, getProgressColor, getProgressStatus } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Calendar, Zap, ClipboardList, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { ROTULO_APURACAO, tendenciaKr, type ApuracaoKr, type DirecaoKr, type PontoSerie } from '@/lib/okrProgresso'

// Mini-gráfico da série de lançamentos (linhas retas, sem suavização).
// Linha tracejada = meta, quando ela é comparável a cada lançamento (não na soma).
function Sparkline({ serie, meta }: { serie: PontoSerie[]; meta?: number }) {
  if (serie.length < 2) return null
  const largura = 100
  const altura = 28
  const valores = serie.map((p) => p.valor).concat(meta !== undefined ? [meta] : [])
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const faixa = max - min || 1
  const y = (v: number) => altura - 2 - ((v - min) / faixa) * (altura - 4)
  const x = (i: number) => (i / (serie.length - 1)) * largura
  const pontos = serie.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" className="w-full h-7 overflow-visible" aria-hidden>
      {meta !== undefined && (
        <line x1={0} x2={largura} y1={y(meta)} y2={y(meta)} stroke="hsl(var(--primary))" strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      )}
      <polyline points={pontos} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

interface KrCardProps {
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    valor_inicial?: number
    progresso?: number | null // null = sem lançamentos
    valor_apurado?: number | null
    binario?: boolean
    apuracao?: string
    direcao_efetiva?: DirecaoKr
    serie?: PontoSerie[]
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

  const semDados = kr.progresso === null || kr.progresso === undefined
  const progresso = kr.progresso ?? 0
  const apuracao: ApuracaoKr = kr.apuracao === 'soma' || kr.apuracao === 'media' ? kr.apuracao : 'ultimo'
  const serie = kr.serie ?? []
  const tendencia = tendenciaKr(serie, kr.direcao_efetiva ?? 'maior', kr.tipo_valor)
  const barColor = kr.concluido
    ? 'bg-gray-400'
    : semDados
    ? 'bg-muted'
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
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-xl shadow-lg z-10 min-w-40 py-1">
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
          <span className="text-muted-foreground">
            Progresso
            {kr.direcao_efetiva === 'menor' && <span className="ml-1 text-[10px]">(quanto menor, melhor)</span>}
          </span>
          <span className="font-semibold text-foreground">
            {semDados
              ? 'Sem lançamentos'
              : kr.binario
              ? progresso >= 100 ? 'Dentro da meta' : 'Fora da meta'
              : formatPercent(progresso)}
          </span>
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
            {formatValor(kr.valor_inicial ?? 0, kr.tipo_valor)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">{ROTULO_APURACAO[apuracao]}</p>
          <p className="text-sm font-semibold text-foreground">
            {semDados ? '—' : formatValor(kr.valor_apurado ?? 0, kr.tipo_valor)}
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
            {formatValor(kr.meta ?? 0, kr.tipo_valor)}
          </p>
        </div>
      </div>

      {/* Série de lançamentos + variação em relação ao lançamento anterior */}
      {serie.length >= 2 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <Sparkline serie={serie} meta={apuracao === 'soma' ? undefined : kr.meta} />
          </div>
          {tendencia && (
            <span
              className={cn(
                'shrink-0 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                tendencia.melhorou === null
                  ? 'text-muted-foreground'
                  : tendencia.melhorou
                  ? 'text-emerald-600'
                  : 'text-red-600'
              )}
              title={`Variação do último lançamento em relação ao de ${tendencia.referencia}`}
            >
              {tendencia.delta > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : tendencia.delta < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {tendencia.delta === 0 ? 'estável' : `${tendencia.delta > 0 ? '+' : '−'}${tendencia.texto}`}
              <span className="font-normal text-muted-foreground ml-0.5">vs {tendencia.referencia}</span>
            </span>
          )}
        </div>
      )}

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
        <div className="w-full py-2 px-4 bg-secondary text-muted-foreground rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> KR Finalizado
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