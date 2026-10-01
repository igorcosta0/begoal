'use client'

import { useState } from 'react'
import { cn, formatValor } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { tendenciaKr, type DirecaoKr, type MetaMensalKr, type PontoSerie } from '@/lib/okrProgresso'

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

function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number)
  const [a2, m2] = ate.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

function somarMeses(data: string, meses: number): string {
  const [ano, mes] = data.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + meses
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

// Gráfico compacto do card: eixo X proporcional ao tempo, escala que sempre
// inclui o zero e a meta (não exagera variação pequena), um ponto por
// lançamento e o valor ao passar o mouse. Ponto verde = o lançamento bateu a
// meta do mês; laranja = não bateu.
// Meta de cada mês, nesta ordem:
// 1. Metas mensais cadastradas no KR (kr_metas_mensais), quando existem.
// 2. KR por soma sem metas mensais: a meta dividida igualmente entre os meses
//    do primeiro lançamento até dezembro (de 3 em 3 meses quando os
//    lançamentos são trimestrais).
// 3. Demais KRs: a própria meta do KR, linha reta.
// No KR por soma o gráfico mostra o acumulado contra a meta acumulada mês a
// mês (linha tracejada até o fim, anel vazado em cada mês).
// Linhas em SVG esticado; pontos e textos em HTML, pra não deformarem.
export default function MiniGrafico({
  serie,
  meta,
  metasMensais,
  acumular,
  direcao,
  tipoValor,
  onAbrir,
}: {
  serie: PontoSerie[]
  meta?: number
  metasMensais?: MetaMensalKr[]
  acumular: boolean
  direcao: DirecaoKr
  tipoValor?: string
  onAbrir?: () => void
}) {
  const [ativo, setAtivo] = useState<number | null>(null)
  if (serie.length === 0) return null

  const temMeta = typeof meta === 'number' && !Number.isNaN(meta)
  const inicio = serie[0].data
  const mesDe = (data: string) => data.slice(0, 7)

  // Linha da meta (trajetoria) e meta do mês de cada lançamento (metaDoMesDe).
  let trajetoria: { data: string; dia: number; valor: number }[] = []
  let metaDoMesDe: (data: string) => number | null = () => (temMeta ? meta! : null)
  let esperadoAte: (data: string) => number | null = () => null
  let rotuloMeta = 'Meta'

  const metasOrdenadas = [...(metasMensais ?? [])].sort((a, b) => a.mes.localeCompare(b.mes))
  if (metasOrdenadas.length > 0) {
    const porMes = new Map(metasOrdenadas.map((m) => [mesDe(m.mes), Number(m.meta)]))
    metaDoMesDe = (data) => porMes.get(mesDe(data)) ?? null
    rotuloMeta = 'Meta do mês'
    let acumulado = 0
    trajetoria = metasOrdenadas.map((m) => {
      acumulado += Number(m.meta)
      const data = `${mesDe(m.mes)}-01`
      return { data, dia: diaDoLancamento(data), valor: acumular ? acumulado : Number(m.meta) }
    })
    if (acumular) {
      esperadoAte = (data) =>
        metasOrdenadas.filter((m) => mesDe(m.mes) <= mesDe(data)).reduce((a, m) => a + Number(m.meta), 0)
    }
  } else if (acumular && temMeta) {
    const gaps = serie.slice(1).map((p, i) => mesesEntre(serie[i].data, p.data))
    const passo = gaps.length > 0 && gaps.every((g) => g === 3) ? 3 : 1
    const fimAno = `${inicio.split('-')[0]}-12-01`
    const meses = Math.max(mesesEntre(inicio, fimAno), mesesEntre(inicio, serie[serie.length - 1].data))
    const periodos = Math.floor(meses / passo) + 1
    const mp = meta! / periodos
    metaDoMesDe = () => mp
    esperadoAte = (data) => mp * Math.min(Math.floor(mesesEntre(inicio, data) / passo) + 1, periodos)
    rotuloMeta = passo === 3 ? 'Meta do trimestre' : 'Meta do mês'
    trajetoria = Array.from({ length: periodos }, (_, k) => {
      const data = somarMeses(inicio, k * passo)
      return { data, dia: diaDoLancamento(data), valor: mp * (k + 1) }
    })
  }

  let soma = 0
  const pontos = serie.map((p) => {
    soma += p.valor
    const plotado = acumular ? soma : p.valor
    const metaMes = metaDoMesDe(p.data)
    // Cor do ponto = o lançamento do mês × a meta do mês (no KR por soma, a
    // posição do ponto já mostra o acumulado × esperado).
    const atingiu = metaMes === null ? null : direcao === 'menor' ? p.valor <= metaMes : p.valor >= metaMes
    return {
      ...p,
      lancado: p.valor,
      plotado,
      metaMes,
      esperado: esperadoAte(p.data),
      atingiu,
      dia: diaDoLancamento(p.data),
    }
  })

  // Linha reta da meta só quando não há trajetória mês a mês.
  const linhaMetaReta = temMeta && trajetoria.length === 0
  const valores = pontos
    .map((p) => p.plotado)
    .concat(trajetoria.map((t) => t.valor))
    .concat(temMeta && (acumular || linhaMetaReta) ? [meta!] : [])
  const minimo = Math.min(0, ...valores)
  const maximo = Math.max(0, ...valores)
  const faixa = maximo - minimo || 1
  // Percentuais do quadro (0 = topo); 8% de folga em cima e embaixo.
  const yPct = (v: number) => 8 + (1 - (v - minimo) / faixa) * 84
  const inicioTrajetoria = trajetoria[0]
  const fimTrajetoria = trajetoria[trajetoria.length - 1]
  const primeiroDia = Math.min(pontos[0].dia, inicioTrajetoria?.dia ?? Infinity)
  const ultimoDia = Math.max(pontos[pontos.length - 1].dia, fimTrajetoria?.dia ?? 0)
  const faixaDias = ultimoDia - primeiroDia
  const xPct = (dia: number) => (faixaDias === 0 ? 50 : 4 + ((dia - primeiroDia) / faixaDias) * 92)

  const linha = pontos.map((p) => `${xPct(p.dia)},${yPct(p.plotado)}`).join(' ')
  const area = `${xPct(pontos[0].dia)},${yPct(minimo)} ${linha} ${xPct(pontos[pontos.length - 1].dia)},${yPct(minimo)}`
  const linhaMeta = trajetoria.map((t) => `${xPct(t.dia)},${yPct(t.valor)}`).join(' ')
  // Rótulo "Meta X" na altura do fim da linha de meta.
  const valorRotuloMeta = acumular || linhaMetaReta ? (temMeta ? meta! : null) : fimTrajetoria?.valor ?? null

  // Rótulos de mês: todos até 6 pontos; acima disso, primeiro, meio e último.
  // Com a meta até dezembro, o início e o fim do eixo também ganham rótulo.
  const indicesRotulo =
    pontos.length <= 6
      ? pontos.map((_, i) => i)
      : [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1]
  let rotulos = indicesRotulo.map((i) => ({ dia: pontos[i].dia, texto: rotuloMes(pontos[i].data) }))
  if (inicioTrajetoria && inicioTrajetoria.dia < pontos[0].dia) {
    const xIni = xPct(inicioTrajetoria.dia)
    rotulos = [{ dia: inicioTrajetoria.dia, texto: rotuloMes(inicioTrajetoria.data) }].concat(
      rotulos.filter((r) => xPct(r.dia) - xIni >= 12)
    )
  }
  if (fimTrajetoria && fimTrajetoria.dia > pontos[pontos.length - 1].dia) {
    const xFim = xPct(fimTrajetoria.dia)
    rotulos = rotulos
      .filter((r) => xFim - xPct(r.dia) >= 12)
      .concat({ dia: fimTrajetoria.dia, texto: rotuloMes(fimTrajetoria.data) })
  }

  const destaque = ativo ?? pontos.length - 1
  const pd = pontos[destaque]
  const metaDoMes = pd.metaMes
  const atingiuMes = pd.atingiu
  const pctMes = metaDoMes && direcao === 'maior' ? (pd.lancado / metaDoMes) * 100 : null

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
      {metaDoMes !== null && (
        <div className="flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            {rotuloMeta}{' '}
            <span className="font-medium text-foreground tabular-nums">{formatValor(metaDoMes, tipoValor)}</span>
            {acumular && pd.esperado !== null && (
              <> · acum. esperado <span className="tabular-nums">{formatValor(pd.esperado, tipoValor)}</span></>
            )}
          </span>
          <span className={cn('shrink-0 font-semibold tabular-nums', atingiuMes ? 'text-emerald-600' : 'text-amber-600')}>
            {pctMes !== null
              ? `${pctMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% da meta`
              : atingiuMes
              ? 'dentro da meta'
              : 'acima da meta'}
          </span>
        </div>
      )}
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
          {linhaMetaReta && (
            <line x1={0} x2={100} y1={yPct(meta!)} y2={yPct(meta!)} stroke="hsl(var(--primary))" strokeOpacity={0.5} strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {trajetoria.length > 1 && (
            <polyline points={linhaMeta} fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.7} strokeDasharray="4 3" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
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
        {trajetoria.map((t) => (
          <span
            key={'meta' + t.data}
            className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-muted-foreground/70 bg-card pointer-events-none"
            style={{ left: `${xPct(t.dia)}%`, top: `${yPct(t.valor)}%` }}
          />
        ))}
        {pontos.map((p, i) => (
          <span
            key={p.data + i}
            className={cn(
              'absolute rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-card pointer-events-none',
              i === destaque ? 'w-2.5 h-2.5' : 'w-2 h-2',
              p.atingiu === null ? 'bg-primary' : p.atingiu ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ left: `${xPct(p.dia)}%`, top: `${yPct(p.plotado)}%` }}
          />
        ))}
        {valorRotuloMeta !== null && (
          <span
            className={cn(
              'absolute right-1 text-[9px]',
              yPct(valorRotuloMeta) < 25 ? 'mt-0.5' : '-translate-y-full',
              'leading-none font-medium text-primary bg-card/80 rounded px-1 py-0.5 pointer-events-none'
            )}
            style={{ top: `${yPct(valorRotuloMeta)}%` }}
          >
            Meta {formatValor(valorRotuloMeta, tipoValor)}
          </span>
        )}
      </div>
      <div className="relative h-3 text-[10px] text-muted-foreground">
        {rotulos.map((r) => (
          <span
            key={r.dia}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${xPct(r.dia)}%` }}
          >
            {r.texto}
          </span>
        ))}
      </div>
    </div>
  )
}

// Variação do último lançamento em relação ao anterior (seta + diferença).
export function Tendencia({ serie, direcao, tipoValor }: { serie: PontoSerie[]; direcao: DirecaoKr; tipoValor?: string }) {
  const tendencia = tendenciaKr(serie, direcao, tipoValor)
  if (!tendencia) return <span />
  return (
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
  )
}
