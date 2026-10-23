'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, Mail, RefreshCw, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  getFuncionariosPublico, getParticipacoes, getParticipantes, getPerguntas, getRespostas, noFiltro,
  type Participante, type Pergunta, type Pesquisa, type RespostaPesquisa, type ValorResposta,
} from '@/lib/queries/pesquisas'
import ListaConvites from '@/components/pesquisa/ListaConvites'
import GraficoPergunta, { COR_NPS, CORES_CATEGORIAS, SeletorForma, type Forma, type ItemGrafico } from '@/components/pesquisa/GraficoPergunta'

// Resultados e acompanhamento (guia do Miro, etapa 2):
// M4: quantas responderam (F41), quem respondeu e quem falta (F55), lembrete
//     para quem falta (F56; sem serviço de e-mail: copia os e-mails ou abre o
//     e-mail do administrador com todos em cópia oculta).
// M5: atualiza sozinho enquanto a pesquisa está aberta (F43), gráfico padrão
//     (F44) com troca de tipo (F45), média (F46) e nota NPS (F47).

const INTERVALO_ATUALIZACAO_MS = 20000

interface Props {
  pesquisa: Pesquisa | null
  onClose: () => void
}

interface Pessoa {
  nome: string
  email: string | null
}

function Destaque({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3">
      <p className="text-2xl font-bold font-mono text-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  )
}

const media = (nums: number[]) => (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1).replace('.', ',')
const temValor = (v: ValorResposta | undefined) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)

function ResultadoPergunta({ q, respostas, externa }: { q: Pergunta; respostas: RespostaPesquisa[]; externa: boolean }) {
  const valores = useMemo(() => respostas.map((r) => ({ r, v: r.itens[q.id] })).filter(({ v }) => temValor(v)), [q.id, respostas])

  // Distribuição, formas de gráfico permitidas e números de destaque por tipo.
  const { itens, formas, destaques } = useMemo(() => {
    const nums = valores.map(({ v }) => Number(v))
    const contar = (n: number) => nums.filter((x) => x === n).length
    if (q.tipo === 'nps') {
      const det = nums.filter((x) => x <= 6).length
      const prom = nums.filter((x) => x >= 9).length
      return {
        itens: {
          barras: [
            { label: 'Promotores (9–10)', qtd: prom, cor: COR_NPS.promotor },
            { label: 'Neutros (7–8)', qtd: nums.length - prom - det, cor: COR_NPS.neutro },
            { label: 'Detratores (0–6)', qtd: det, cor: COR_NPS.detrator },
          ],
          colunas: Array.from({ length: 11 }, (_, n) => ({
            label: String(n), qtd: contar(n), cor: n <= 6 ? COR_NPS.detrator : n <= 8 ? COR_NPS.neutro : COR_NPS.promotor,
          })),
        } as Record<'barras' | 'colunas', ItemGrafico[]>,
        formas: ['barras', 'colunas', 'pizza'] as Forma[],
        destaques: nums.length ? [
          [String(Math.round(((prom - det) / nums.length) * 100)), 'NPS (−100 a 100)'],
          [media(nums), 'média (0 a 10)'],
        ] : [],
      }
    }
    if (q.tipo === 'escala_0_10' || q.tipo === 'nota_1_5') {
      const [min, max] = q.tipo === 'nota_1_5' ? [1, 5] : [0, 10]
      const notas = Array.from({ length: max - min + 1 }, (_, i) => max - i)
      const barras = notas.map((n) => ({ label: `Nota ${n}`, qtd: contar(n) }))
      return {
        itens: { barras, colunas: [...notas].reverse().map((n) => ({ label: String(n), qtd: contar(n) })) },
        formas: ['barras', 'colunas'] as Forma[],
        destaques: nums.length ? [[media(nums), `média (${min} a ${max})`]] : [],
      }
    }
    if (q.tipo === 'multipla' || q.tipo === 'multipla_varias') {
      const varias = q.tipo === 'multipla_varias'
      const barras = q.opcoes.map((op, i) => ({
        label: op,
        qtd: valores.filter(({ v }) => (varias ? Array.isArray(v) && v.includes(op) : v === op)).length,
        cor: !varias && q.opcoes.length <= CORES_CATEGORIAS.length ? CORES_CATEGORIAS[i] : undefined,
      }))
      // Pizza só quando as fatias somam 100% (uma opção por pessoa) e cabem na paleta.
      const pizza = !varias && q.opcoes.length <= CORES_CATEGORIAS.length
      return { itens: { barras, colunas: barras }, formas: (pizza ? ['barras', 'colunas', 'pizza'] : ['barras', 'colunas']) as Forma[], destaques: [] }
    }
    return { itens: null, formas: [] as Forma[], destaques: [] }
  }, [q, valores])

  const [forma, setForma] = useState<Forma>('barras')

  if (!valores.length) return <p className="text-sm text-muted-foreground">Ainda sem respostas.</p>

  if (!itens) {
    return (
      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {valores.map(({ r, v }) => (
          <li key={r.id} className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
            <p className="text-sm text-foreground whitespace-pre-line">{String(v)}</p>
            {externa && r.respondente_nome && <p className="text-[11px] text-muted-foreground mt-1">{r.respondente_nome} · {r.respondente_empresa}</p>}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {destaques.map(([valor, rotulo]) => <Destaque key={rotulo} valor={valor} rotulo={rotulo} />)}
          <Destaque valor={String(valores.length)} rotulo={valores.length === 1 ? 'resposta' : 'respostas'} />
        </div>
        <SeletorForma formas={formas} valor={forma} onChange={setForma} />
      </div>
      {q.tipo === 'multipla_varias' && (
        <p className="text-[11px] text-muted-foreground">Cada pessoa podia marcar mais de uma opção: a soma passa de 100%.</p>
      )}
      <GraficoPergunta itens={forma === 'colunas' ? itens.colunas : itens.barras} base={valores.length} forma={forma} />
    </div>
  )
}

function csvCelula(v: unknown): string {
  const s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ResultadosPesquisa({ pesquisa, onClose }: Props) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [respostas, setRespostas] = useState<RespostaPesquisa[]>([])
  const [pendentes, setPendentes] = useState<Pessoa[]>([])
  const [responderam, setResponderam] = useState<string[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [aba, setAba] = useState<'resumo' | 'respondentes'>('resumo')
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [atualizadoAs, setAtualizadoAs] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Lembrete
  const [mensagem, setMensagem] = useState('')
  const [copiado, setCopiado] = useState<'emails' | 'mensagem' | null>(null)

  // Respostas e participação (a parte que muda enquanto a pesquisa está aberta).
  const carregarRespostas = useCallback(async (p: Pesquisa) => {
    const rs = await getRespostas(p.id)
    setRespostas(rs.data)
    if (rs.error) setErro(rs.error)

    // Quem já respondeu (sem ligar à resposta) e quem falta, só no público
    // da pesquisa (F36–F39).
    if (p.publico === 'interna') {
      const [part, funcs] = await Promise.all([getParticipacoes([p.id]), getFuncionariosPublico(p.client_id)])
      const publico = funcs.filter((f) => f.user_id && noFiltro(p.filtro ?? {}, f))
      const ja = new Set(part[p.id] ?? [])
      setPendentes(publico.filter((f) => !ja.has(f.user_id!)).map((f) => ({ nome: f.nome, email: f.email })))
      setResponderam(publico.filter((f) => ja.has(f.user_id!)).map((f) => f.nome))
    }
    if (p.publico === 'lista') {
      const part = await getParticipantes(p.id)
      if (part.error) setErro(part.error)
      const publico = part.data.filter((pt) => noFiltro(p.filtro ?? {}, pt))
      setParticipantes(part.data)
      setPendentes(publico.filter((pt) => !pt.respondeu_em).map((pt) => ({ nome: pt.nome, email: pt.email })))
      setResponderam(publico.filter((pt) => pt.respondeu_em).map((pt) => pt.nome))
    }
    setAtualizadoAs(horaAgora())
  }, [])

  useEffect(() => {
    if (!pesquisa) return
    setAba('resumo')
    setCarregando(true)
    setErro(null)
    setCopiado(null)
    setMensagem(
      `Olá! A pesquisa "${pesquisa.titulo}" ainda está esperando a sua resposta. ` +
      `Ela é anônima e leva poucos minutos. Para responder, entre no Begoal em Pesquisa: ${window.location.origin}/pesquisa`
    )
    let ativo = true
    Promise.all([getPerguntas(pesquisa.id), carregarRespostas(pesquisa)]).then(([qs]) => {
      if (!ativo) return
      setPerguntas(qs.data)
      if (qs.error) setErro(qs.error)
      setCarregando(false)
    })
    // F43: enquanto está aberta, busca as respostas novas sozinho.
    const timer = pesquisa.status === 'aberta'
      ? setInterval(() => { if (ativo) carregarRespostas(pesquisa) }, INTERVALO_ATUALIZACAO_MS)
      : null
    return () => { ativo = false; if (timer) clearInterval(timer) }
  }, [pesquisa, carregarRespostas])

  const externa = pesquisa?.publico === 'externa'
  const lista = pesquisa?.publico === 'lista'
  // Link aberto anônimo não tem "quem respondeu".
  const abas = externa && !pesquisa?.pede_identificacao ? (['resumo'] as const) : (['resumo', 'respondentes'] as const)
  const totalPessoas = pendentes.length + responderam.length

  const csv = useMemo(() => {
    const cab = [...(externa ? ['Data', 'Nome', 'E-mail', 'Empresa'] : ['Data']), ...perguntas.map((q) => q.enunciado)]
    const linhas = respostas.map((r) => [
      ...(externa ? [formatDate(r.respondida_em), r.respondente_nome, r.respondente_email, r.respondente_empresa] : [formatDate(r.respondida_em)]),
      ...perguntas.map((q) => r.itens[q.id]),
    ])
    return [cab, ...linhas].map((l) => l.map(csvCelula).join(';')).join('\n')
  }, [externa, perguntas, respostas])

  if (!pesquisa) return null

  function baixarCsv() {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pesquisa!.titulo.replace(/[^\w\s-]/g, '').trim() || 'pesquisa'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function atualizarAgora() {
    setAtualizando(true)
    await carregarRespostas(pesquisa!)
    setAtualizando(false)
  }

  async function copiar(texto: string, qual: 'emails' | 'mensagem') {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(qual)
      setTimeout(() => setCopiado((c) => (c === qual ? null : c)), 2500)
    } catch {
      window.prompt('Copie:', texto)
    }
  }

  const emails = pendentes.map((p) => p.email).filter((e): e is string => !!e)
  const semEmail = pendentes.length - emails.length
  const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(`Lembrete: ${pesquisa.titulo}`)}&body=${encodeURIComponent(mensagem)}`
  // Alguns programas de e-mail cortam links muito longos: acima disso, só copiar.
  const mailtoCabe = mailto.length <= 1900
  const pctParticipacao = totalPessoas ? Math.round((responderam.length / totalPessoas) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{pesquisa.titulo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {externa
                ? `${respostas.length} ${respostas.length === 1 ? 'resposta' : 'respostas'}`
                : `${responderam.length} de ${totalPessoas} ${lista ? 'participantes' : 'funcionários'} responderam · respostas anônimas`}
            </p>
            {atualizadoAs && (
              <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {pesquisa.status === 'aberta' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />}
                <span className="whitespace-nowrap">{pesquisa.status === 'aberta' ? 'Atualiza sozinho' : 'Atualizado'} · última às {atualizadoAs}</span>
                <button onClick={atualizarAgora} disabled={atualizando} className="text-primary hover:underline disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
                  <RefreshCw className={cn('w-3 h-3', atualizando && 'animate-spin')} /> atualizar agora
                </button>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={baixarCsv}
              disabled={!respostas.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-border text-foreground hover:bg-secondary disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-4 mb-4 bg-secondary rounded-full p-1 w-fit">
          {abas.map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                aba === a ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {a === 'resumo' ? 'Resultados' : externa ? 'Quem respondeu' : 'Participação'}
            </button>
          ))}
        </div>

        {erro && <div className="mb-4 px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : aba === 'resumo' ? (
          <div className="space-y-4">
            {perguntas.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-3">
                  <span className="text-muted-foreground font-mono mr-1.5">{i + 1}.</span>{q.enunciado}
                </p>
                <ResultadoPergunta q={q} respostas={respostas} externa={externa} />
              </div>
            ))}
          </div>
        ) : externa ? (
          respostas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém respondeu ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Nome</th>
                    <th className="text-left font-medium px-3 py-2">Empresa</th>
                    <th className="text-left font-medium px-3 py-2">E-mail</th>
                    <th className="text-left font-medium px-3 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {respostas.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{r.respondente_nome}</td>
                      <td className="px-3 py-2 text-foreground">{r.respondente_empresa}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.respondente_email}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(r.respondida_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <p className="text-sm font-semibold text-foreground">{responderam.length} de {totalPessoas} responderam</p>
                <p className="text-sm font-mono text-muted-foreground">{pctParticipacao}%</p>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pctParticipacao}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                As listas mostram só quem respondeu, não o que respondeu: as respostas continuam anônimas.
              </p>
            </div>

            {lista && (
              <ListaConvites
                pesquisa={pesquisa}
                participantes={participantes}
                abaInicial="faltam"
                onMudou={() => carregarRespostas(pesquisa)}
              />
            )}

            {!lista && pesquisa.status === 'aberta' && pendentes.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Lembrar quem falta</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ajuste a mensagem e envie pelo seu e-mail, com todos em cópia oculta (ninguém vê quem mais recebeu).
                  </p>
                </div>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {mailtoCabe && emails.length > 0 && (
                    <a href={mailto} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90">
                      <Mail className="w-3.5 h-3.5" /> Abrir no meu e-mail
                    </a>
                  )}
                  <button
                    onClick={() => copiar(emails.join(', '), 'emails')}
                    disabled={!emails.length}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary disabled:opacity-40"
                  >
                    {copiado === 'emails' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copiar {emails.length} e-mails
                  </button>
                  <button
                    onClick={() => copiar(mensagem, 'mensagem')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary"
                  >
                    {copiado === 'mensagem' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copiar mensagem
                  </button>
                </div>
                {(!mailtoCabe || semEmail > 0) && (
                  <p className="text-[11px] text-muted-foreground">
                    {!mailtoCabe && 'A lista é grande demais para abrir direto no e-mail: copie os e-mails e cole no campo "Cco". '}
                    {semEmail > 0 && `${semEmail} ${semEmail === 1 ? 'pessoa está' : 'pessoas estão'} sem e-mail no cadastro.`}
                  </p>
                )}
              </div>
            )}

            {!lista && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['Faltam responder', pendentes.map((p) => p.nome), 'Todos já responderam.'],
                  ['Já responderam', responderam, 'Ninguém respondeu ainda.'],
                ] as const).map(([titulo, nomes, vazio]) => (
                  <div key={titulo}>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {titulo} <span className="text-muted-foreground font-normal">({nomes.length})</span>
                    </p>
                    {nomes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{vazio}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                        {nomes.map((n, i) => (
                          <span key={`${n}-${i}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">{n}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
