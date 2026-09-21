'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { PILARES_CULTURAIS, VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'
import { getDetalhamentoPerguntasCiclo, type DetalhamentoPergunta } from '@/lib/queries/avaliacao'
import { ArrowDown, ArrowUp } from 'lucide-react'

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
  cicloId: string
}

interface PerguntaAgregada {
  chave: string
  label: string
  media: number
  n: number
}

function PerguntaLinha({ icon: Icon, cor, item }: { icon: typeof ArrowUp; cor: string; item: PerguntaAgregada }) {
  return (
    <div className="flex items-start gap-1.5 mb-1 last:mb-0">
      <Icon className={cn('w-3 h-3 mt-0.5 shrink-0', cor)} />
      <p className="text-[11px] text-foreground leading-snug flex-1">
        {item.label} <span className="font-mono font-semibold">{item.media.toFixed(2)}</span>
        <span className="text-muted-foreground"> · {item.n} nota(s)</span>
      </p>
    </div>
  )
}

// Azul/âmbar (concluída/aberta) e índigo/ciano (cultural/performance) —
// validados via scripts/validate_palette.js da skill de dataviz (os dois
// pares passam CVD/contraste em claro e escuro; onde sobrou WARN de
// contraste no escuro, os valores ficam com label direto em cima da barra,
// que é a mitigação que a própria skill pede).
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

export default function GraficosAvaliacao({ avaliacoes, cicloId }: Props) {
  // Pedido (11/09/2026): filtrar os dois gráficos por vertical — null =
  // "Todas". Lista de opções vem das verticais que de fato aparecem neste
  // ciclo (não de VERTICAIS_CTZ inteiro), pra não oferecer filtro pra
  // vertical que não tem nenhuma avaliação aqui.
  const [verticalAtiva, setVerticalAtiva] = useState<string | null>(null)

  // Pedido (21/09/2026): detalhamento de maior/menor nota por vertical,
  // baseado nas perguntas (pilares culturais + critérios técnicos) das
  // avaliações — carregado à parte porque vem de uma RPC própria
  // (get_detalhamento_perguntas_ciclo), granular por pergunta, diferente do
  // array `avaliacoes` (que só tem as médias já prontas por avaliação).
  const [detalhamento, setDetalhamento] = useState<DetalhamentoPergunta[]>([])

  useEffect(() => {
    let cancelado = false
    if (!cicloId) return
    getDetalhamentoPerguntasCiclo(cicloId).then(({ data }) => {
      if (!cancelado) setDetalhamento(data)
    })
    return () => { cancelado = true }
  }, [cicloId])

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
    // Duas categorias mutuamente exclusivas, pelo mesmo flag `completa` usado
    // no BadgeConcluida em toda a tela (avaliacao_completude no banco: TODOS
    // os campos preenchidos de verdade) — não pelo `status`, que pode
    // avançar em lote (ex.: "Iniciar Calibragem"/"Finalizar Calibragem") sem
    // que ninguém tenha preenchido nada ainda (ver CLAUDE.md). Pedido
    // 14/09/2026: removida a distinção "Finalizada" (status) × "Concluída"
    // (completa) que existia antes — Concluída aqui já cobre quem finalizou
    // o ciclo (finalizada normalmente implica completa=true de qualquer
    // forma) e quem só terminou de preencher mas o ciclo ainda não fechou.
    const concluidas = avaliacoesFiltradas.filter((a) => a.completa).length
    const emAberto = avaliacoesFiltradas.length - concluidas

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
        { categoria: 'Concluída', quantidade: concluidas, cor: COR_CONCLUIDA },
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

  // Detalhamento por vertical: agrupa as notas por (vertical, pergunta) e acha
  // a pergunta de maior e a de menor média em cada grupo — cultural (pilares,
  // compartilhados entre verticais) e técnica (critérios, exclusivos de cada
  // vertical) são tratados separado, senão a comparação não faria sentido.
  const detalhamentoPorVertical = useMemo(() => {
    const porVertical = new Map<string, { cultural: Map<string, number[]>; tecnica: Map<string, number[]> }>()

    for (const row of detalhamento) {
      if (verticalAtiva && row.vertical !== verticalAtiva) continue
      if (row.nota === null) continue
      if (!porVertical.has(row.vertical)) porVertical.set(row.vertical, { cultural: new Map(), tecnica: new Map() })
      const grupo = porVertical.get(row.vertical)!
      if (row.tipo === 'cultural' && row.pilar !== null) {
        const chave = String(row.pilar)
        if (!grupo.cultural.has(chave)) grupo.cultural.set(chave, [])
        grupo.cultural.get(chave)!.push(row.nota)
      } else if (row.tipo === 'tecnica' && row.criterio_key) {
        if (!grupo.tecnica.has(row.criterio_key)) grupo.tecnica.set(row.criterio_key, [])
        grupo.tecnica.get(row.criterio_key)!.push(row.nota)
      }
    }

    function melhorPior(mapa: Map<string, number[]>, labelFn: (chave: string) => string) {
      const agregados: PerguntaAgregada[] = Array.from(mapa.entries()).map(([chave, notas]) => ({
        chave,
        label: labelFn(chave),
        media: media(notas) ?? 0,
        n: notas.length,
      }))
      if (agregados.length === 0) return null
      const ordenado = [...agregados].sort((a, b) => b.media - a.media)
      return { melhor: ordenado[0], pior: ordenado[ordenado.length - 1] }
    }

    const labelCultural = (chave: string) => {
      const pilar = PILARES_CULTURAIS.find((p) => p.numero === Number(chave))
      return pilar ? `Pilar ${pilar.numero} — ${pilar.titulo}` : `Pilar ${chave}`
    }

    // Pedido (21/09/2026): mostrar um card por vertical SEMPRE — mesmo sem
    // ninguém avaliado ali ainda (ex.: "Líderes", vertical nova) — em vez de
    // só listar quem já tem dado. Antes disso o card só nascia quando havia
    // nota; agora a lista de verticais vem de VERTICAIS_CTZ inteiro (ou só a
    // selecionada no filtro), e quem ainda não tem nota mostra um aviso em
    // vez de sumir da tela.
    const chavesVerticais = verticalAtiva ? [verticalAtiva] : Object.keys(VERTICAIS_CTZ)

    const resultado = chavesVerticais.map((vertical) => {
      const grupo = porVertical.get(vertical) ?? { cultural: new Map<string, number[]>(), tecnica: new Map<string, number[]>() }
      const labelTecnica = (chave: string) => VERTICAIS_CTZ[vertical]?.criterios.find((c) => c.key === chave)?.label ?? chave
      return {
        vertical,
        label: VERTICAIS_CTZ[vertical]?.label ?? vertical,
        cultural: melhorPior(grupo.cultural, labelCultural),
        tecnica: melhorPior(grupo.tecnica, labelTecnica),
      }
    })

    return resultado.sort((a, b) => a.label.localeCompare(b.label))
  }, [detalhamento, verticalAtiva])

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
            <p className="text-sm font-semibold text-foreground">Concluídas × Em aberto</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              {avaliacoesFiltradas.length} avaliação(ões){verticalAtiva ? ` em ${VERTICAIS_CTZ[verticalAtiva]?.label ?? verticalAtiva}` : ' no ciclo'} · &quot;Concluída&quot; = todos os campos preenchidos de verdade, independente do status do ciclo
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

          {detalhamentoPorVertical.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
              <p className="text-sm font-semibold text-foreground">Maior e menor nota por vertical</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Pergunta (pilar cultural ou critério técnico) com a média mais alta e mais baixa em cada vertical · nota final calibrada quando já existe, senão a do avaliador
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {detalhamentoPorVertical.map((v) => (
                  <div key={v.vertical} className="rounded-xl border border-border/70 bg-background p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">{v.label}</p>
                    {v.cultural && (
                      <div className="mb-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: COR_CULTURAL }}>Cultural</p>
                        <PerguntaLinha icon={ArrowUp} cor="text-emerald-600" item={v.cultural.melhor} />
                        {v.cultural.pior.chave !== v.cultural.melhor.chave && (
                          <PerguntaLinha icon={ArrowDown} cor="text-red-600" item={v.cultural.pior} />
                        )}
                      </div>
                    )}
                    {v.tecnica && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: COR_TECNICA }}>Performance técnica</p>
                        <PerguntaLinha icon={ArrowUp} cor="text-emerald-600" item={v.tecnica.melhor} />
                        {v.tecnica.pior.chave !== v.tecnica.melhor.chave && (
                          <PerguntaLinha icon={ArrowDown} cor="text-red-600" item={v.tecnica.pior} />
                        )}
                      </div>
                    )}
                    {!v.cultural && !v.tecnica && (
                      <p className="text-[11px] text-muted-foreground italic">Ainda sem ninguém avaliado nesse vertical neste ciclo.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
