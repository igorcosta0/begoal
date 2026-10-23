'use client'

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  getMetricasPorSegmento, getPerguntas, getPesquisas, getRespostas, ROTULO_SEGMENTO,
  type CampoSegmento, type MetricaSegmento, type Pergunta, type Pesquisa, type RespostaPesquisa,
} from '@/lib/queries/pesquisas'
import { NOME_MODELO } from '@/lib/pesquisaModelos'
import {
  casarPerguntas, chavePergunta, formatarNumero, metricaPergunta, rotuloValorPrincipal, valorPrincipal,
} from '@/lib/pesquisaMetricas'

// Comparativos (guia do Miro, etapa 4):
// F52 com a última pesquisa, F54 entre pesquisas do mesmo tipo e da mesma
// empresa, F59 só as perguntas iguais (e quais mudaram), F53 tendência por
// área (pelas funções do banco, que escondem grupos com menos de 5) e F51
// histórico de uma pergunta ao longo das aplicações.

const MAX_HISTORICO = 8
const CAMPOS: CampoSegmento[] = ['setor', 'cargo', 'tempo_empresa', 'estado', 'cliente']

interface Dados {
  perguntas: Pergunta[]
  respostas: RespostaPesquisa[]
}

async function carregarDados(id: string): Promise<Dados> {
  const [qs, rs] = await Promise.all([getPerguntas(id), getRespostas(id)])
  return { perguntas: qs.data, respostas: rs.data }
}

const dataAplicacao = (p: Pesquisa) => p.publicada_em ?? p.created_at

function Variacao({ antes, depois, casas = 1 }: { antes: number | null; depois: number | null; casas?: number }) {
  if (antes === null || depois === null) return <span className="text-xs text-muted-foreground">—</span>
  const d = depois - antes
  const igual = Math.abs(d) < (casas ? 0.05 : 0.5)
  const Icone = igual ? Minus : d > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold font-mono', igual ? 'text-muted-foreground' : d > 0 ? 'text-emerald-700' : 'text-rose-700')}>
      <Icone className="w-3.5 h-3.5" aria-hidden />
      {igual ? 'igual' : `${d > 0 ? '+' : '−'}${formatarNumero(Math.abs(d), casas)}`}
    </span>
  )
}

// Sempre com todas as respostas desta pesquisa (o filtro da aba Resultados não vale aqui).
export default function ComparativoPesquisa({ pesquisa, perguntas }: { pesquisa: Pesquisa; perguntas: Pergunta[] }) {
  const [respostas, setRespostas] = useState<RespostaPesquisa[]>([])
  const [candidatas, setCandidatas] = useState<Pesquisa[] | null>(null)
  const [outraId, setOutraId] = useState<string>('')
  const [outra, setOutra] = useState<Dados | null>(null)
  const [carregandoOutra, setCarregandoOutra] = useState(false)

  // Tendência por área
  const [campo, setCampo] = useState<CampoSegmento>('setor')
  const [perguntaArea, setPerguntaArea] = useState('')
  const [areas, setAreas] = useState<{ atual: MetricaSegmento[]; anterior: MetricaSegmento[] } | null>(null)
  const [erroArea, setErroArea] = useState<string | null>(null)

  // Histórico
  const [perguntaHist, setPerguntaHist] = useState('')
  const [historico, setHistorico] = useState<{ data: string; titulo: string; valor: number | null; n: number }[] | null>(null)

  // F54: só pesquisas do mesmo modelo, da mesma empresa, já aplicadas.
  useEffect(() => {
    getRespostas(pesquisa.id).then(({ data }) => setRespostas(data))
    getPesquisas(pesquisa.client_id).then(({ data }) => {
      const mesmas = data
        .filter((p) => p.id !== pesquisa.id && p.modelo === pesquisa.modelo && p.status !== 'rascunho')
        .sort((a, b) => dataAplicacao(b).localeCompare(dataAplicacao(a)))
      setCandidatas(mesmas)
      // F52: a padrão é a que deu origem a esta; senão, a última antes dela.
      const padrao = mesmas.find((p) => p.id === pesquisa.origem_id)
        ?? mesmas.find((p) => dataAplicacao(p) < dataAplicacao(pesquisa))
        ?? mesmas[0]
      setOutraId(padrao?.id ?? '')
    })
  }, [pesquisa])

  useEffect(() => {
    if (!outraId) { setOutra(null); return }
    setCarregandoOutra(true)
    carregarDados(outraId).then((d) => { setOutra(d); setCarregandoOutra(false) })
  }, [outraId])

  const casamento = useMemo(() => (outra ? casarPerguntas(perguntas, outra.perguntas) : null), [perguntas, outra])
  const numericas = useMemo(
    () => (casamento?.comuns ?? []).filter(({ atual }) => atual.tipo === 'escala_0_10' || atual.tipo === 'nps' || atual.tipo === 'nota_1_5'),
    [casamento]
  )

  useEffect(() => {
    if (numericas.length && !numericas.some((c) => c.atual.id === perguntaArea)) setPerguntaArea(numericas[0].atual.id)
  }, [numericas, perguntaArea])

  const numericasAtuais = useMemo(
    () => perguntas.filter((q) => q.tipo === 'escala_0_10' || q.tipo === 'nps' || q.tipo === 'nota_1_5'),
    [perguntas]
  )
  useEffect(() => {
    if (numericasAtuais.length && !numericasAtuais.some((q) => q.id === perguntaHist)) setPerguntaHist(numericasAtuais[0].id)
  }, [numericasAtuais, perguntaHist])

  // F53: média/NPS por área nas duas aplicações.
  useEffect(() => {
    const par = numericas.find((c) => c.atual.id === perguntaArea)
    if (!par || !outraId) { setAreas(null); return }
    setErroArea(null)
    Promise.all([
      getMetricasPorSegmento(pesquisa.id, par.atual.id, campo),
      getMetricasPorSegmento(outraId, (par.anterior as Pergunta).id, campo),
    ]).then(([a, b]) => {
      if (a.error || b.error) setErroArea(a.error ?? b.error)
      setAreas({ atual: a.data, anterior: b.data })
    })
  }, [pesquisa.id, outraId, perguntaArea, campo, numericas])

  // F51: a pergunta em cada aplicação do mesmo modelo (mais recentes primeiro).
  useEffect(() => {
    const q = perguntas.find((x) => x.id === perguntaHist)
    if (!q || !candidatas) { setHistorico(null); return }
    let ativo = true
    const serie = [pesquisa, ...candidatas].sort((a, b) => dataAplicacao(b).localeCompare(dataAplicacao(a))).slice(0, MAX_HISTORICO)
    Promise.all(serie.map(async (p) => {
      const d = p.id === pesquisa.id ? { perguntas, respostas } : await carregarDados(p.id)
      const igual = d.perguntas.find((x) => chavePergunta(x) === chavePergunta(q))
      if (!igual) return null
      const m = metricaPergunta(igual, d.respostas)
      return { data: dataAplicacao(p), titulo: p.titulo, valor: valorPrincipal(igual, m), n: m.n }
    })).then((pontos) => {
      if (!ativo) return
      setHistorico(pontos.filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.data.localeCompare(b.data)))
    })
    return () => { ativo = false }
  }, [perguntaHist, candidatas, pesquisa, perguntas, respostas])

  if (!candidatas) return <p className="text-sm text-muted-foreground">Carregando...</p>

  if (!candidatas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-foreground font-medium">Ainda não há outra pesquisa {NOME_MODELO[pesquisa.modelo]} para comparar.</p>
        <p className="text-xs text-muted-foreground mt-1">
          O comparativo junta pesquisas do mesmo modelo desta empresa. Use &quot;Reaplicar&quot; ou &quot;Duplicar&quot; para criar a próxima.
        </p>
      </div>
    )
  }

  const outraPesquisa = candidatas.find((p) => p.id === outraId)
  const mapaAnterior = new Map((areas?.anterior ?? []).map((m) => [m.valor ?? '__outros', m]))
  const mapaAtual = new Map((areas?.atual ?? []).map((m) => [m.valor ?? '__outros', m]))
  const chavesArea = Array.from(new Set([...Array.from(mapaAtual.keys()), ...Array.from(mapaAnterior.keys())]))
    .sort((a, b) => (a === '__outros' ? 1 : b === '__outros' ? -1 : a.localeCompare(b)))
  const parArea = numericas.find((c) => c.atual.id === perguntaArea)
  const ehNps = parArea?.atual.tipo === 'nps'
  const qHist = perguntas.find((x) => x.id === perguntaHist)

  const selectCls = 'px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring max-w-full'

  return (
    <div className="space-y-6">
      {/* Com qual comparar */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="comparar-com" className="text-xs font-medium text-foreground">Comparar com</label>
        <select id="comparar-com" value={outraId} onChange={(e) => setOutraId(e.target.value)} className={selectCls}>
          {candidatas.map((p) => (
            <option key={p.id} value={p.id}>{p.titulo} · {formatDate(dataAplicacao(p))}{p.id === pesquisa.origem_id ? ' (anterior)' : ''}</option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground">Só pesquisas do modelo {NOME_MODELO[pesquisa.modelo]} desta empresa.</span>
      </div>

      {carregandoOutra || !casamento || !outra ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {/* F52/F59: perguntas iguais */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Perguntas iguais nas duas</h3>
              <p className="text-[11px] text-muted-foreground">
                {outraPesquisa && formatDate(dataAplicacao(outraPesquisa))}: {outra.respostas.length} respostas · agora: {respostas.length}
              </p>
            </div>
            {casamento.comuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pergunta igual entre as duas.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Pergunta</th>
                      <th className="text-right font-medium px-3 py-2 whitespace-nowrap">Antes</th>
                      <th className="text-right font-medium px-3 py-2 whitespace-nowrap">Agora</th>
                      <th className="text-right font-medium px-3 py-2">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casamento.comuns.map(({ atual, anterior }) => {
                      const ma = metricaPergunta(anterior as Pergunta, outra.respostas)
                      const mb = metricaPergunta(atual, respostas)
                      if (atual.tipo === 'texto') return null
                      if (mb.opcoes && ma.opcoes) {
                        const opcoes = Array.from(new Set([...Object.keys(mb.opcoes), ...Object.keys(ma.opcoes)]))
                        return (
                          <tr key={atual.id} className="border-t border-border align-top">
                            <td className="px-3 py-2 text-foreground" colSpan={4}>
                              <p>{atual.enunciado}</p>
                              <ul className="mt-1.5 space-y-0.5">
                                {opcoes.map((op) => (
                                  <li key={op} className="flex items-center gap-3 text-xs">
                                    <span className="flex-1 min-w-0 truncate text-muted-foreground">{op}</span>
                                    <span className="font-mono text-muted-foreground w-12 text-right">{ma.opcoes![op] ?? '—'}%</span>
                                    <span className="font-mono text-foreground w-12 text-right">{mb.opcoes![op] ?? '—'}%</span>
                                    <span className="w-16 text-right"><Variacao antes={ma.opcoes![op] ?? null} depois={mb.opcoes![op] ?? null} casas={0} /></span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )
                      }
                      const va = valorPrincipal(atual, ma)
                      const vb = valorPrincipal(atual, mb)
                      const casas = atual.tipo === 'nps' ? 0 : 1
                      return (
                        <tr key={atual.id} className="border-t border-border">
                          <td className="px-3 py-2 text-foreground">
                            {atual.enunciado}
                            <span className="block text-[11px] text-muted-foreground">{rotuloValorPrincipal(atual)}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatarNumero(va, casas)}</td>
                          <td className="px-3 py-2 text-right font-mono text-foreground font-semibold">{formatarNumero(vb, casas)}</td>
                          <td className="px-3 py-2 text-right"><Variacao antes={va} depois={vb} casas={casas} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {(casamento.soAtual.length > 0 || casamento.soAnterior.length > 0) && (
              <details className="rounded-xl border border-border px-3 py-2 text-xs">
                <summary className="cursor-pointer font-medium text-foreground">
                  Perguntas diferentes: {casamento.soAtual.length} só agora, {casamento.soAnterior.length} só antes
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {([['Só nesta pesquisa', casamento.soAtual], ['Só na anterior', casamento.soAnterior]] as const).map(([t, qs]) => (
                    <div key={t}>
                      <p className="font-semibold text-foreground mb-1">{t}</p>
                      {qs.length === 0 ? <p className="text-muted-foreground">Nenhuma.</p> : (
                        <ul className="space-y-0.5 list-disc pl-4 text-muted-foreground">{qs.map((q, i) => <li key={i}>{q.enunciado}</li>)}</ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* F53: tendência por área */}
          {numericas.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Tendência por {ROTULO_SEGMENTO[campo].toLowerCase()}</h3>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Agrupar por" value={campo} onChange={(e) => setCampo(e.target.value as CampoSegmento)} className={selectCls}>
                  {CAMPOS.map((c) => <option key={c} value={c}>{ROTULO_SEGMENTO[c]}</option>)}
                </select>
                <select aria-label="Pergunta" value={perguntaArea} onChange={(e) => setPerguntaArea(e.target.value)} className={cn(selectCls, 'sm:max-w-md')}>
                  {numericas.map(({ atual }) => <option key={atual.id} value={atual.id}>{atual.enunciado}</option>)}
                </select>
              </div>
              {erroArea && <p className="text-xs text-red-600">{erroArea}</p>}
              {areas && (chavesArea.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum grupo com 5 respostas ou mais neste campo (ou as respostas não têm {ROTULO_SEGMENTO[campo].toLowerCase()}).
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">{ROTULO_SEGMENTO[campo]}</th>
                        <th className="text-right font-medium px-3 py-2">Antes</th>
                        <th className="text-right font-medium px-3 py-2">Agora</th>
                        <th className="text-right font-medium px-3 py-2">Tendência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chavesArea.map((k) => {
                        const a = mapaAnterior.get(k)
                        const b = mapaAtual.get(k)
                        const va = a ? (ehNps ? a.nps : a.media) : null
                        const vb = b ? (ehNps ? b.nps : b.media) : null
                        const casas = ehNps ? 0 : 1
                        return (
                          <tr key={k} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground">
                              {k === '__outros' ? <span className="text-muted-foreground">Outros (grupos pequenos juntos)</span> : k}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatarNumero(va, casas)}{a && <span className="text-[10px] ml-1">({a.n})</span>}</td>
                            <td className="px-3 py-2 text-right font-mono text-foreground font-semibold">{formatarNumero(vb, casas)}{b && <span className="text-[10px] font-normal text-muted-foreground ml-1">({b.n})</span>}</td>
                            <td className="px-3 py-2 text-right"><Variacao antes={va} depois={vb} casas={casas} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                {ehNps ? 'NPS' : 'Média'} de cada grupo; entre parênteses, quantas respostas. Grupos com menos de 5 respostas entram em &quot;Outros&quot;.
              </p>
            </section>
          )}
        </>
      )}

      {/* F51: histórico de uma pergunta */}
      {numericasAtuais.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Histórico da pergunta</h3>
          <select aria-label="Pergunta do histórico" value={perguntaHist} onChange={(e) => setPerguntaHist(e.target.value)} className={cn(selectCls, 'sm:max-w-md')}>
            {numericasAtuais.map((q) => <option key={q.id} value={q.id}>{q.enunciado}</option>)}
          </select>
          {!historico ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : historico.length < 2 ? (
            <p className="text-sm text-muted-foreground">Esta pergunta só aparece em uma aplicação. O histórico começa na próxima.</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historico.map((h) => ({ ...h, rotulo: formatDate(h.data) }))} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      width={36}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      domain={qHist?.tipo === 'nps' ? [-100, 100] : qHist?.tipo === 'nota_1_5' ? [1, 5] : [0, 10]}
                    />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [formatarNumero(v, qHist?.tipo === 'nps' ? 0 : 1), qHist ? rotuloValorPrincipal(qHist) : '']}
                    />
                    <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {historico.map((h) => (
                  <li key={h.data + h.titulo} className="flex justify-between gap-3">
                    <span className="truncate">{formatDate(h.data)} · {h.titulo}</span>
                    <span className="font-mono text-foreground shrink-0">{formatarNumero(h.valor, qHist?.tipo === 'nps' ? 0 : 1)} <span className="text-muted-foreground">({h.n})</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
