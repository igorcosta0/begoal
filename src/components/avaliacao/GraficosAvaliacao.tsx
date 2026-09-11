'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

// Só os campos que os dois gráficos precisam — qualquer avaliação do ciclo
// (padrao ou pares) serve, é o mesmo array já exibido na lista "Avaliações".
interface AvaliacaoParaGrafico {
  status: string
  media_cultural_gestor: number | null
  media_cultural_calibragem: number | null
  media_tecnica_gestor: number | null
  media_tecnica_calibragem: number | null
}

interface Props {
  avaliacoes: AvaliacaoParaGrafico[]
}

// Verde/âmbar (fechada/aberta) e índigo/ciano (cultural/performance) —
// validados via scripts/validate_palette.js da skill de dataviz (ambos os
// pares passam CVD/contraste em claro e escuro; onde sobrou WARN de
// contraste no escuro, os valores ficam com label direto em cima da barra,
// que é a mitigação que a própria skill pede).
const COR_FECHADA = '#16a34a'
const COR_ABERTA = '#d97706'
const COR_CULTURAL = '#4f46e5'
const COR_TECNICA = '#0891b2'

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((soma, v) => soma + v, 0) / valores.length
}

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '6px',
  fontSize: '12px',
}

export default function GraficosAvaliacao({ avaliacoes }: Props) {
  const { dadosStatus, dadosMedias, totalCultural, totalTecnica } = useMemo(() => {
    const fechadas = avaliacoes.filter((a) => a.status === 'finalizada').length
    const emAberto = avaliacoes.length - fechadas

    // Mesma cascata de "nota final conhecida até agora" já usada em
    // ModalAvaliacao (notaFinalCultural/notaFinalTecnica): calibragem quando
    // já existe, senão a nota do avaliador/gestor. Avaliação sem nenhuma das
    // duas fica de fora da média (não conta como 0).
    const culturais = avaliacoes
      .map((a) => a.media_cultural_calibragem ?? a.media_cultural_gestor)
      .filter((v): v is number => v !== null)
    const tecnicas = avaliacoes
      .map((a) => a.media_tecnica_calibragem ?? a.media_tecnica_gestor)
      .filter((v): v is number => v !== null)

    return {
      dadosStatus: [
        { categoria: 'Fechadas', quantidade: fechadas, cor: COR_FECHADA },
        { categoria: 'Em aberto', quantidade: emAberto, cor: COR_ABERTA },
      ],
      dadosMedias: [
        { categoria: 'Cultural', media: media(culturais), cor: COR_CULTURAL },
        { categoria: 'Performance', media: media(tecnicas), cor: COR_TECNICA },
      ],
      totalCultural: culturais.length,
      totalTecnica: tecnicas.length,
    }
  }, [avaliacoes])

  if (avaliacoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">Sem avaliações neste ciclo pra gerar gráfico.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Avaliações fechadas × em aberto</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          {avaliacoes.length} avaliação(ões) no ciclo · &quot;Fechada&quot; = status Finalizada
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosStatus} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={30} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))' }}
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value} avaliação(ões)`, '']}
              />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={72}>
                {dadosStatus.map((d) => (
                  <Cell key={d.categoria} fill={d.cor} />
                ))}
                <LabelList
                  dataKey="quantidade"
                  position="top"
                  style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Média Cultural × Performance</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          Nota final calibrada quando já existe, senão a nota do avaliador · escala 1–5
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosMedias} margin={{ top: 16, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={30} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))' }}
                contentStyle={tooltipStyle}
                formatter={(value: number) => [value != null ? value.toFixed(2) : 'Sem nota', 'Média']}
              />
              <Bar dataKey="media" radius={[4, 4, 0, 0]} maxBarSize={72}>
                {dadosMedias.map((d) => (
                  <Cell key={d.categoria} fill={d.cor} />
                ))}
                <LabelList
                  dataKey="media"
                  position="top"
                  formatter={(v: number) => (v != null ? v.toFixed(2) : '—')}
                  style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Cultural: {totalCultural} nota(s) · Performance: {totalTecnica} nota(s)
        </p>
      </div>
    </div>
  )
}
