'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PILARES_CULTURAIS, VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'
import { getDetalhamentoPerguntasCiclo, type DetalhamentoPergunta } from '@/lib/queries/avaliacao'

// Dashboard do ciclo (pedido 30/09/2026, substitui a aba "Gráficos"): visão
// da empresa inteira por padrão e filtro por área (vertical). Empresa toda =
// média geral dos valores (pilares culturais) e do desempenho (critérios
// técnicos), mais o comparativo por área; área filtrada = os mesmos números só
// daquela área, com o desempenho aberto por critério.
// Só avaliação comum (tipo 'padrao') entra — pares não tem autoavaliação nem
// entra na nota final, e já ficava fora do detalhamento por pergunta.

interface AvaliacaoParaGrafico {
  // Sem tipo = avaliação comum (a lista da página só marca "pares").
  tipo?: string
  vertical: string | null
  // Selo "Concluída" (avaliacao_completude no banco): TODOS os campos
  // preenchidos de verdade, diferente do status, que pode avançar em lote.
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

// Índigo/ciano (valores/desempenho): par já validado com
// scripts/validate_palette.js da skill de dataviz em 11/09/2026. Os valores
// ficam sempre escritos ao lado da barra (mitigação do WARN de contraste no escuro).
const COR_VALORES = '#4f46e5'
const COR_DESEMPENHO = '#0891b2'
const ESCALA_MAX = 5

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((soma, v) => soma + v, 0) / valores.length
}

function formatarNota(v: number | null) {
  return v === null ? '—' : v.toFixed(2).replace('.', ',')
}

// Mesma cascata de "nota final conhecida até agora" do ModalAvaliacao:
// calibragem quando já existe, senão a nota do avaliador.
const notaValores = (a: AvaliacaoParaGrafico) => a.media_cultural_calibragem ?? a.media_cultural_gestor
const notaDesempenho = (a: AvaliacaoParaGrafico) => a.media_tecnica_calibragem ?? a.media_tecnica_gestor

function rotuloArea(v: string) {
  return VERTICAIS_CTZ[v]?.label ?? v
}

interface LinhaBarra {
  chave: string
  label: string
  media: number | null
  n: number
}

// Barra horizontal 1–5 com o valor escrito ao lado (poucas linhas, rótulos
// longos: em HTML os nomes dos pilares quebram linha em vez de serem cortados).
function Barra({ valor, cor, fina }: { valor: number | null; cor: string; fina?: boolean }) {
  const largura = valor === null ? 0 : Math.max(0, Math.min(100, (valor / ESCALA_MAX) * 100))
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('flex-1 rounded-full bg-secondary overflow-hidden', fina ? 'h-2' : 'h-2.5')}>
        {valor !== null && (
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${largura}%`, background: cor }} />
        )}
      </div>
      <span className="w-10 text-right font-mono text-xs font-semibold text-foreground tabular-nums">{formatarNota(valor)}</span>
    </div>
  )
}

function ListaBarras({ linhas, cor, vazio }: { linhas: LinhaBarra[]; cor: string; vazio: string }) {
  if (linhas.every((l) => l.media === null)) {
    return <p className="text-xs text-muted-foreground py-6 text-center">{vazio}</p>
  }
  const comNota = linhas.filter((l) => l.media !== null)
  const maior = comNota.reduce((a, b) => (b.media! > a.media! ? b : a), comNota[0])
  const menor = comNota.reduce((a, b) => (b.media! < a.media! ? b : a), comNota[0])
  return (
    <ul className="space-y-3.5">
      {linhas.map((l) => (
        <li key={l.chave} title={`${l.label}: ${formatarNota(l.media)} (${l.n} nota${l.n === 1 ? '' : 's'})`}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="text-xs text-foreground leading-snug">{l.label}</p>
            {comNota.length > 1 && maior.media !== menor.media && (l.chave === maior.chave || l.chave === menor.chave) && (
              <span className={cn(
                'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
                l.chave === maior.chave ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'
              )}>
                {l.chave === maior.chave ? 'Maior' : 'Menor'}
              </span>
            )}
          </div>
          <Barra valor={l.media} cor={cor} />
        </li>
      ))}
    </ul>
  )
}

function Indicador({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: string; detalhe: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {cor && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />}
        {rotulo}
      </p>
      <p className="font-display text-3xl font-bold text-foreground mt-1.5 tabular-nums">{valor}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{detalhe}</p>
    </div>
  )
}

function Painel({ titulo, subtitulo, children, legenda }: { titulo: string; subtitulo: string; children: React.ReactNode; legenda?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
        </div>
        {legenda}
      </div>
      {children}
    </div>
  )
}

export default function GraficosAvaliacao({ avaliacoes, cicloId }: Props) {
  // null = empresa toda
  const [area, setArea] = useState<string | null>(null)
  const [detalhamento, setDetalhamento] = useState<DetalhamentoPergunta[]>([])

  useEffect(() => {
    let cancelado = false
    if (!cicloId) return
    getDetalhamentoPerguntasCiclo(cicloId).then(({ data }) => {
      if (!cancelado) setDetalhamento(data)
    })
    return () => { cancelado = true }
  }, [cicloId])

  const padrao = useMemo(() => avaliacoes.filter((a) => a.tipo !== 'pares'), [avaliacoes])

  const areas = useMemo(() => {
    const set = new Set(padrao.map((a) => a.vertical).filter((v): v is string => !!v))
    return Array.from(set).sort((a, b) => rotuloArea(a).localeCompare(rotuloArea(b)))
  }, [padrao])

  const doRecorte = useMemo(
    () => (area ? padrao.filter((a) => a.vertical === area) : padrao),
    [padrao, area]
  )

  const resumo = useMemo(() => {
    const valores = doRecorte.map(notaValores).filter((v): v is number => v !== null)
    const desempenho = doRecorte.map(notaDesempenho).filter((v): v is number => v !== null)
    const concluidas = doRecorte.filter((a) => a.completa).length
    return {
      total: doRecorte.length,
      concluidas,
      mediaValores: media(valores),
      nValores: valores.length,
      mediaDesempenho: media(desempenho),
      nDesempenho: desempenho.length,
    }
  }, [doRecorte])

  // Valores: média de cada pilar (os 4 pilares são os mesmos em todas as áreas).
  const porPilar: LinhaBarra[] = useMemo(() => {
    return PILARES_CULTURAIS.map((p) => {
      const notas = detalhamento
        .filter((d) => d.tipo === 'cultural' && d.pilar === p.numero && d.nota !== null && (!area || d.vertical === area))
        .map((d) => d.nota as number)
      return { chave: String(p.numero), label: p.titulo, media: media(notas), n: notas.length }
    })
  }, [detalhamento, area])

  // Desempenho de uma área: média de cada critério técnico dela (os critérios
  // são exclusivos de cada área, por isso só aparecem com o filtro).
  const porCriterio: LinhaBarra[] = useMemo(() => {
    if (!area) return []
    return (VERTICAIS_CTZ[area]?.criterios ?? []).map((c) => {
      const notas = detalhamento
        .filter((d) => d.tipo === 'tecnica' && d.vertical === area && d.criterio_key === c.key && d.nota !== null)
        .map((d) => d.nota as number)
      return { chave: c.key, label: c.label, media: media(notas), n: notas.length }
    })
  }, [detalhamento, area])

  // Empresa toda: valores e desempenho lado a lado em cada área.
  const porArea = useMemo(() => {
    return areas.map((v) => {
      const lista = padrao.filter((a) => a.vertical === v)
      return {
        area: v,
        total: lista.length,
        concluidas: lista.filter((a) => a.completa).length,
        valores: media(lista.map(notaValores).filter((x): x is number => x !== null)),
        desempenho: media(lista.map(notaDesempenho).filter((x): x is number => x !== null)),
      }
    })
  }, [areas, padrao])

  if (padrao.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">Sem avaliações neste ciclo para montar a visão geral.</p>
      </div>
    )
  }

  const pctConcluidas = resumo.total ? Math.round((resumo.concluidas / resumo.total) * 100) : 0
  const nomeRecorte = area ? rotuloArea(area) : 'Empresa toda'

  const legendaDupla = (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_VALORES }} />Valores</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_DESEMPENHO }} />Desempenho</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filtro por área: uma linha só, acima de tudo. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[null, ...areas].map((v) => (
          <button
            key={v ?? 'empresa'}
            onClick={() => setArea(v)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
              area === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {v ? rotuloArea(v) : 'Empresa toda'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Indicador
          rotulo="Média dos valores"
          cor={COR_VALORES}
          valor={formatarNota(resumo.mediaValores)}
          detalhe={`escala 1–5 · ${resumo.nValores} avaliação(ões) com nota`}
        />
        <Indicador
          rotulo="Média de desempenho"
          cor={COR_DESEMPENHO}
          valor={formatarNota(resumo.mediaDesempenho)}
          detalhe={`escala 1–5 · ${resumo.nDesempenho} avaliação(ões) com nota`}
        />
        <Indicador
          rotulo="Participantes"
          valor={String(resumo.total)}
          detalhe={area ? `na área ${nomeRecorte}` : `em ${areas.length} área(s)`}
        />
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Concluídas</p>
          <p className="font-display text-3xl font-bold text-foreground mt-1.5 tabular-nums">
            {pctConcluidas}%
          </p>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pctConcluidas}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{resumo.concluidas} de {resumo.total} com todos os campos preenchidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Painel
          titulo={`Valores · ${nomeRecorte}`}
          subtitulo="Média de cada pilar do Código de Cultura"
        >
          <ListaBarras linhas={porPilar} cor={COR_VALORES} vazio="Nenhuma nota de valores preenchida ainda." />
        </Painel>

        {area ? (
          <Painel
            titulo={`Desempenho · ${nomeRecorte}`}
            subtitulo="Média de cada critério técnico da área"
          >
            <ListaBarras linhas={porCriterio} cor={COR_DESEMPENHO} vazio="Nenhuma nota de desempenho preenchida ainda nesta área." />
          </Painel>
        ) : (
          <Painel
            titulo="Valores e desempenho por área"
            subtitulo="Clique numa área para ver os detalhes dela"
            legenda={legendaDupla}
          >
            {porArea.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma avaliação com área definida.</p>
            ) : (
              <ul className="space-y-1">
                {porArea.map((a) => (
                  <li key={a.area}>
                    <button
                      onClick={() => setArea(a.area)}
                      className="w-full text-left rounded-xl px-2 py-2 -mx-2 hover:bg-accent/60 transition-colors"
                      title={`${rotuloArea(a.area)} · valores ${formatarNota(a.valores)} · desempenho ${formatarNota(a.desempenho)}`}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-foreground">{rotuloArea(a.area)}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{a.concluidas}/{a.total} concluídas</p>
                      </div>
                      <div className="space-y-1">
                        <Barra valor={a.valores} cor={COR_VALORES} fina />
                        <Barra valor={a.desempenho} cor={COR_DESEMPENHO} fina />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Nota final calibrada quando já existe, senão a nota do avaliador. Só a avaliação comum entra (a de pares fica de fora).
      </p>
    </div>
  )
}
