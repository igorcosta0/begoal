'use client'

import { useMemo, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'

// Só os campos que os dois gráficos precisam — qualquer avaliação do ciclo
// (padrao ou pares) serve, é o mesmo array já exibido na lista "Avaliações".
interface AvaliacaoParaGrafico {
  status: string
  vertical: string | null
  // Selo "Concluída" (pedido 09/09/2026, avaliacao_completude no banco):
  // TODOS os campos preenchidos de verdade, diferente do status — que pode
  // avançar em lote (ex.: "Iniciar Calibragem") sem que ninguém tenha
  // preenchido nada ainda. É o mesmo flag usado no BadgeConcluida em
  // page.tsx, aqui alimentando a barra "Concluída" do gráfico.
  completa: boolean
  media_cultural_gestor: number | null
  media_cultural_calibragem: number | null
  media_tecnica_gestor: number | null
  media_tecnica_calibragem: number | null
}

interface Props {
  avaliacoes: AvaliacaoParaGrafico[]
}

// Verde/azul/âmbar (finalizada/concluída/aberta) e índigo/ciano (cultural/
// performance) — validados via scripts/validate_palette.js da skill de
// dataviz (os dois trios passam CVD/contraste em claro e escuro; onde
// sobrou WARN de contraste no escuro, os valores ficam com label direto em
// cima da barra, que é a mitigação que a própria skill pede).
const COR_FINALIZADA = '#16a34a'
const COR_CONCLUIDA = '#2563eb'
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
  // Pedido (11/09/2026): filtrar os dois gráficos por vertical — null =
  // "Todas". Lista de opções vem das verticais que de fato aparecem neste
  // ciclo (não de VERTICAIS_CTZ inteiro), pra não oferecer filtro pra
  // vertical que não tem nenhuma avaliação aqui.
  const [verticalAtiva, setVerticalAtiva] = useState<string | null>(null)

  const verticaisPresentes = useMemo(() => {
    const set = new Set(avaliacoes.map((a) => a.vertical).filter((v): v is string => !!v))
    return Array.from(set).sort((a, b) =>
      (VERTICAIS_CTZ[a]?.label ?? a).localeCompare(VERTICAIS_CTZ[b]?.label ?? b)
    )
  }, [avaliacoes])

  const avaliacoesFiltradas = useMemo(
    () => (verticalAtiva ? avaliacoes.filter((a) => a.vertical === verticalAtiva) : avaliacoes),
    [avaliacoes, verticalAtiva]
  )

  const { dadosStatus, dadosMedias, totalCultural, totalTecnica } = useMemo(() => {
    // Três categorias mutuamente exclusivas (a soma sempre bate com o
    // total): Finalizada (status já fechou o ciclo pra essa avaliação),
    // Concluída (todos os campos preenchidos de verdade — completa=true —
    // mas o status ainda não chegou em "finalizada", ex.: parada em
    // "calibragem" esperando o admin apertar "Finalizar Calibragem") e Em
    // aberto (falta preencher alguma coisa). Sem essa separação, avaliação
    // já concluída na prática ficava escondida dentro de "Em aberto" só
    // porque o status (que avança em lote, ver CLAUDE.md) ainda não tinha
    // sido fechado manualmente.
    const finalizadas = avaliacoesFiltradas.filter((a) => a.status === 'finalizada').length
    const concluidasNaoFinalizadas = avaliacoesFiltradas.filter(
      (a) => a.completa && a.status !== 'finalizada'
    ).length
    const emAberto = avaliacoesFiltradas.length - finalizadas - concluidasNaoFinalizadas

    // Mesma cascata de "nota final conhecida até agora" já usada em
    // ModalAvaliacao (notaFinalCultural/notaFinalTecnica): calibragem quando
    // já existe, senão a nota do avaliador/gestor. Avaliação sem nenhuma das
    // duas fica de fora da média (não conta como 0).
    const culturais = avaliacoesFiltradas
      .map((a) => a.media_cultural_calibragem ?? a.media_cultural_gestor)
      .filter((v): v is number => v !== null)
    const tecnicas = avaliacoesFiltradas
      .map((a) => a.media_tecnica_calibragem ?? a.media_tecnica_gestor)
      .filter((v): v is number => v !== null)

    return {
      dadosStatus: [
        { categoria: 'Finalizada', quantidade: finalizadas, cor: COR_FINALIZADA },
        { categoria: 'Concluída', quantidade: concluidasNaoFinalizadas, cor: COR_CONCLUIDA },
        { categoria: 'Em aberto', quantidade: emAberto, cor: COR_ABERTA },
      ],
      dadosMedias: [
        { categoria: 'Cultural', media: media(culturais), cor: COR_CULTURAL },
        { categoria: 'Performance', media: media(tecnicas), cor: COR_TECNICA },
      ],
      totalCultural: culturais.length,
      totalTecnica: tecnicas.length,
    }
  }, [avaliacoesFiltradas])

  if (avaliacoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">Sem avaliações neste ciclo pra gerar gráfico.</p>
      </div>
    )
  }

  const filtroChips = verticaisPresentes.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => setVerticalAtiva(null)}
        className={cn(
          'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
          verticalAtiva === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
        )}
      >
        Todas as verticais
      </button>
      {verticaisPresentes.map((v) => (
        <button
          key={v}
          onClick={() => setVerticalAtiva(v === verticalAtiva ? null : v)}
          className={cn(
            'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
            v === verticalAtiva ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
          )}
        >
          {VERTICAIS_CTZ[v]?.label ?? v}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      {filtroChips}

      {avaliacoesFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma avaliação nesta vertical.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Finalizadas × Concluídas × Em aberto</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {avaliacoesFiltradas.length} avaliação(ões){verticalAtiva ? ` em ${VERTICAIS_CTZ[verticalAtiva]?.label ?? verticalAtiva}` : ' no ciclo'} · &quot;Concluída&quot; = todos os campos preenchidos, mas o ciclo ainda não fechou essa avaliação
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
      )}
    </div>
  )
}
