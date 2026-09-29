'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, formatValor, getProgressColor, getProgressStatus, paraData } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Calendar, Zap, ClipboardList, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { ROTULO_APURACAO, tendenciaKr, type ApuracaoKr, type DirecaoKr, type PontoSerie } from '@/lib/okrProgresso'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// "2026-09-01" → dias desde a época, sem passar por fuso (new Date('2026-09-01') cai no dia anterior no Brasil).
function diaDoLancamento(data: string): number {
  const [ano, mes, dia] = data.split('T')[0].split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia || 1) / 86400000
}

function rotuloMes(data: string): string {
  const [ano, mes] = data.split('-')
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
}

// Gráfico compacto do card: eixo X proporcional ao tempo, escala que sempre
// inclui o zero e a meta (não exagera variação pequena), linha de meta, um
// ponto por lançamento e o valor ao passar o mouse. No KR apurado por soma,
// plota o acumulado, que é o que se compara com a meta.
// Linhas em SVG esticado; pontos e textos em HTML, pra não deformarem.
function MiniGrafico({
  serie,
  meta,
  acumular,
  tipoValor,
  onAbrir,
}: {
  serie: PontoSerie[]
  meta?: number
  acumular: boolean
  tipoValor?: string
  onAbrir?: () => void
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  if (serie.length === 0) return null

  let soma = 0
  const pontos = serie.map((p) => {
    soma += p.valor
    return { ...p, lancado: p.valor, plotado: acumular ? soma : p.valor, dia: diaDoLancamento(p.data) }
  })

  const temMeta = typeof meta === 'number' && !Number.isNaN(meta)
  const valores = pontos.map((p) => p.plotado).concat(temMeta ? [meta!] : [])
  const minimo = Math.min(0, ...valores)
  const maximo = Math.max(0, ...valores)
  const faixa = maximo - minimo || 1
  // Percentuais do quadro (0 = topo); 8% de folga em cima e embaixo.
  const yPct = (v: number) => 8 + (1 - (v - minimo) / faixa) * 84
  const primeiroDia = pontos[0].dia
  const faixaDias = pontos[pontos.length - 1].dia - primeiroDia
  const xPct = (dia: number) => (faixaDias === 0 ? 50 : 4 + ((dia - primeiroDia) / faixaDias) * 92)

  const linha = pontos.map((p) => `${xPct(p.dia)},${yPct(p.plotado)}`).join(' ')
  const area = `${xPct(pontos[0].dia)},${yPct(minimo)} ${linha} ${xPct(pontos[pontos.length - 1].dia)},${yPct(minimo)}`

  // Rótulos de mês: todos até 6 pontos; acima disso, primeiro, meio e último.
  const indicesRotulo =
    pontos.length <= 6
      ? pontos.map((_, i) => i)
      : [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1]

  const destaque = ativo ?? pontos.length - 1
  const pd = pontos[destaque]

  function aoMover(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    let melhor = 0
    pontos.forEach((p, i) => {
      if (Math.abs(xPct(p.dia) - x) < Math.abs(xPct(pontos[melhor].dia) - x)) melhor = i
    })
    setAtivo(melhor)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          {ativo === null ? 'Último lançamento' : 'Lançamento'} · <span className="font-medium text-foreground">{rotuloMes(pd.data)}</span>
        </span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatValor(pd.lancado, tipoValor)}
          {acumular && (
            <span className="font-normal text-muted-foreground"> · acum. {formatValor(pd.plotado, tipoValor)}</span>
          )}
        </span>
      </div>
      <div
        role={onAbrir ? 'button' : undefined}
        tabIndex={onAbrir ? 0 : undefined}
        title={onAbrir ? 'Clique para ver o gráfico completo' : undefined}
        onClick={onAbrir}
        onKeyDown={(e) => { if (onAbrir && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAbrir() } }}
        onMouseMove={aoMover}
        onMouseLeave={() => setAtivo(null)}
        className={cn(
          'relative h-20 rounded-lg bg-secondary/40 border border-border/60',
          onAbrir && 'cursor-pointer hover:border-primary/40 transition-colors'
        )}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          {minimo < 0 && (
            <line x1={0} x2={100} y1={yPct(0)} y2={yPct(0)} stroke="hsl(var(--border))" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {temMeta && (
            <line x1={0} x2={100} y1={yPct(meta!)} y2={yPct(meta!)} stroke="hsl(var(--primary))" strokeOpacity={0.5} strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {pontos.length > 1 && (
            <>
              <polygon points={area} fill="hsl(var(--primary))" fillOpacity={0.08} />
              <polyline points={linha} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {ativo !== null && (
            <line x1={xPct(pd.dia)} x2={xPct(pd.dia)} y1={0} y2={100} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {pontos.map((p, i) => (
          <span
            key={p.data + i}
            className={cn(
              'absolute rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-card pointer-events-none',
              i === destaque ? 'w-2.5 h-2.5 bg-primary' : 'w-2 h-2 bg-primary/70'
            )}
            style={{ left: `${xPct(p.dia)}%`, top: `${yPct(p.plotado)}%` }}
          />
        ))}
        {temMeta && (
          <span
            className={cn(
              'absolute right-1 text-[9px]',
              yPct(meta!) < 25 ? 'mt-0.5' : '-translate-y-full',
              'leading-none font-medium text-primary bg-card/80 rounded px-1 py-0.5 pointer-events-none'
            )}
            style={{ top: `${yPct(meta!)}%` }}
          >
            Meta {formatValor(meta!, tipoValor)}
          </span>
        )}
      </div>
      <div className="relative h-3 text-[10px] text-muted-foreground">
        {indicesRotulo.map((i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${xPct(pontos[i].dia)}%` }}
          >
            {rotuloMes(pontos[i].data)}
          </span>
        ))}
      </div>
    </div>
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
    ? paraData(kr.end_date).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
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
          {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />}
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-xl shadow-lg z-20 min-w-40 py-1">
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
      {serie.length >= 1 && (
        <div className="space-y-1.5">
          <MiniGrafico
            serie={serie}
            meta={kr.meta}
            acumular={apuracao === 'soma'}
            tipoValor={kr.tipo_valor}
            onAbrir={onVerGrafico ? () => onVerGrafico(kr) : undefined}
          />
          <div className="flex items-center justify-between gap-2">
          {tendencia ? (
            <span
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
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
          ) : (
            <span />
          )}
          {onVerGrafico && (
            <button
              onClick={() => onVerGrafico(kr)}
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <TrendingUp className="w-3 h-3" />
              Gráfico completo
            </button>
          )}
          </div>
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