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

interface KrChartProps {
  data: {
    data_real?: string
    data_lancamento?: string
    texto_exibicao?: string
    valor: number
  }[]
  valorMeta?: number
  unidade?: string
}

export default function KrChart({ data, valorMeta, unidade }: KrChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento registrado ainda.
        </p>
      </div>
    )
  }

  const formatted = data
    .filter((item) => item.valor !== undefined)
    .map((item) => {
      let dataLabel = ''
      if (item.texto_exibicao) {
        dataLabel = item.texto_exibicao
      } else if (item.data_real || item.data_lancamento) {
        const raw = (item.data_real || item.data_lancamento || '').split('T')[0]
        const [year, month, day] = raw.split('-')
        dataLabel = `${day}/${month}`
      }
      return {
        ...item,
        data: dataLabel,
      }
    })

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="data"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} ${unidade ?? ''}`, 'Valor']}
          />
          {valorMeta && (
            <ReferenceLine
              y={valorMeta}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{
                value: `Meta: ${valorMeta}`,
                fontSize: 11,
                fill: 'hsl(var(--primary))',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="valor"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}