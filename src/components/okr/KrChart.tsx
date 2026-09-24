'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatValor } from '@/lib/utils'

interface KrChartProps {
  data: {
    data_real?: string
    data_lancamento?: string
    texto_exibicao?: string
    valor: number
  }[]
  valorMeta?: number
  unidade?: string // tipo_valor do KR/SV: 'Moeda' | 'Percentual' | 'Numero'
  // KR apurado por soma: plota o acumulado, que é o que se compara com a meta.
  acumular?: boolean
}

// "2026-09-01" ou "2026-09-01T..." → timestamp da data local (sem o deslocamento
// de fuso de new Date('2026-09-01'), que cai no dia anterior no Brasil).
function paraTimestamp(raw?: string): number | null {
  if (!raw) return null
  const [ano, mes, dia] = raw.split('T')[0].split('-').map(Number)
  if (!ano || !mes || !dia) return null
  return new Date(ano, mes - 1, dia).getTime()
}

function formatarData(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Rótulo curto só para o eixo Y (o tooltip mostra o valor completo).
function formatarEixo(valor: number, unidade?: string): string {
  if (unidade === 'Moeda') {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(valor)
  }
  if (unidade === 'Percentual') return formatValor(valor, unidade)
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 }).format(valor)
}

export default function KrChart({ data, valorMeta, unidade, acumular }: KrChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento registrado ainda.
        </p>
      </div>
    )
  }

  const pontos = data
    .filter((item) => item.valor !== undefined && item.valor !== null)
    .map((item) => ({
      ...item,
      valor: Number(item.valor),
      ts: paraTimestamp(item.data_real || item.data_lancamento),
    }))

  // Com data em todos os pontos, o eixo X é proporcional ao tempo (a distância
  // entre dois pontos reflete os dias entre eles) e os pontos vão em ordem
  // cronológica. Sem data (só texto_exibicao), cai no eixo por categoria.
  const eixoTemporal = pontos.every((p) => p.ts !== null)
  const ordenados = eixoTemporal ? [...pontos].sort((a, b) => a.ts! - b.ts!) : pontos
  let acumulado = 0
  const formatted = ordenados.map((p) => {
    acumulado += p.valor
    return {
      ...p,
      valor: acumular ? acumulado : p.valor,
      rotulo: p.texto_exibicao || (p.ts !== null ? formatarData(p.ts) : ''),
    }
  })

  const temMeta = typeof valorMeta === 'number' && !Number.isNaN(valorMeta)

  // Eixo Y sempre inclui o zero e a meta, pra escala não exagerar a variação
  // nem deixar a linha de meta fora do gráfico.
  const valores = formatted.map((p) => p.valor).concat(temMeta ? [valorMeta!] : [])
  const minimo = Math.min(0, ...valores)
  const maximo = Math.max(0, ...valores)
  const folga = (maximo - minimo) * 0.08 || 1
  const dominioY: [number, number] = [minimo < 0 ? minimo - folga : 0, maximo + folga]

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 16, right: 16, left: 4, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {eixoTemporal ? (
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              ticks={formatted.map((p) => p.ts!)}
              tickFormatter={formatarData}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              padding={{ left: 12, right: 12 }}
            />
          ) : (
            <XAxis
              dataKey="rotulo"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
          )}
          <YAxis
            domain={dominioY}
            tickFormatter={(v: number) => formatarEixo(v, unidade)}
            width={56}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            labelFormatter={(_label: unknown, payload: any[]) => payload?.[0]?.payload?.rotulo ?? ''}
            formatter={(value) => [formatValor(Number(value), unidade), acumular ? 'Acumulado' : 'Valor']}
          />
          {temMeta && (
            <ReferenceLine
              y={valorMeta}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{
                value: `Meta: ${formatValor(valorMeta!, unidade)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: 'hsl(var(--primary))',
              }}
            />
          )}
          <Line
            type="linear"
            dataKey="valor"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
