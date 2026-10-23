'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import {
  getParticipacoes, getPerguntas, getRespostas,
  type Pergunta, type Pesquisa, type RespostaPesquisa,
} from '@/lib/queries/pesquisas'

interface Props {
  pesquisa: Pesquisa | null
  onClose: () => void
}

function Barra({ label, qtd, total, cor = 'bg-primary' }: { label: string; qtd: number; total: number; cor?: string }) {
  const pct = total ? Math.round((qtd / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-foreground" title={label}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full', cor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right text-xs font-mono text-muted-foreground">{qtd} · {pct}%</span>
    </div>
  )
}

function Destaque({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3">
      <p className="text-2xl font-bold font-mono text-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  )
}

function ResultadoPergunta({ q, respostas, externa }: { q: Pergunta; respostas: RespostaPesquisa[]; externa: boolean }) {
  const valores = respostas
    .map((r) => ({ r, v: r.itens[q.id] }))
    .filter(({ v }) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))

  if (!valores.length) return <p className="text-sm text-muted-foreground">Ainda sem respostas.</p>

  if (q.tipo === 'nota_1_5') {
    const nums = valores.map(({ v }) => Number(v))
    const media = nums.reduce((a, b) => a + b, 0) / nums.length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <Destaque valor={media.toFixed(1).replace('.', ',')} rotulo="média (1 a 5)" />
          <Destaque valor={String(nums.length)} rotulo="respostas" />
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => <Barra key={n} label={`Nota ${n}`} qtd={nums.filter((x) => x === n).length} total={nums.length} />)}
        </div>
      </div>
    )
  }

  if (q.tipo === 'escala_0_10') {
    const nums = valores.map(({ v }) => Number(v))
    const media = nums.reduce((a, b) => a + b, 0) / nums.length
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <Destaque valor={media.toFixed(1).replace('.', ',')} rotulo="média (0 a 10)" />
          <Destaque valor={String(nums.length)} rotulo="respostas" />
        </div>
        <div className="space-y-1.5">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => <Barra key={n} label={`Nota ${n}`} qtd={nums.filter((x) => x === n).length} total={nums.length} />)}
        </div>
      </div>
    )
  }

  if (q.tipo === 'nps') {
    const nums = valores.map(({ v }) => Number(v))
    const prom = nums.filter((x) => x >= 9).length
    const neut = nums.filter((x) => x >= 7 && x <= 8).length
    const det = nums.filter((x) => x <= 6).length
    const nps = Math.round(((prom - det) / nums.length) * 100)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          <Destaque valor={String(nps)} rotulo="NPS (−100 a 100)" />
          <Destaque valor={String(nums.length)} rotulo="respostas" />
        </div>
        <div className="space-y-1.5">
          <Barra label="Promotores (9–10)" qtd={prom} total={nums.length} cor="bg-emerald-500" />
          <Barra label="Neutros (7–8)" qtd={neut} total={nums.length} cor="bg-amber-500" />
          <Barra label="Detratores (0–6)" qtd={det} total={nums.length} cor="bg-rose-500" />
        </div>
      </div>
    )
  }

  // Várias opções: a porcentagem é sobre quem respondeu (a soma passa de 100%).
  if (q.tipo === 'multipla_varias') {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground">Cada pessoa podia marcar mais de uma opção.</p>
        {q.opcoes.map((op) => (
          <Barra key={op} label={op} qtd={valores.filter(({ v }) => Array.isArray(v) && v.includes(op)).length} total={valores.length} />
        ))}
      </div>
    )
  }

  if (q.tipo === 'multipla') {
    return (
      <div className="space-y-1.5">
        {q.opcoes.map((op) => <Barra key={op} label={op} qtd={valores.filter(({ v }) => v === op).length} total={valores.length} />)}
      </div>
    )
  }

  return (
    <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {valores.map(({ r, v }) => (
        <li key={r.id} className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
          <p className="text-sm text-foreground whitespace-pre-line">{String(v)}</p>
          {externa && (
            <p className="text-[11px] text-muted-foreground mt-1">{r.respondente_nome} · {r.respondente_empresa}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function csvCelula(v: unknown): string {
  const s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function ResultadosPesquisa({ pesquisa, onClose }: Props) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [respostas, setRespostas] = useState<RespostaPesquisa[]>([])
  const [pendentes, setPendentes] = useState<string[]>([])
  const [totalPessoas, setTotalPessoas] = useState(0)
  const [aba, setAba] = useState<'resumo' | 'respondentes'>('resumo')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!pesquisa) return
    setAba('resumo')
    setCarregando(true)
    setErro(null)
    async function carregar(p: Pesquisa) {
      const [qs, rs] = await Promise.all([getPerguntas(p.id), getRespostas(p.id)])
      setPerguntas(qs.data)
      setRespostas(rs.data)
      setErro(qs.error ?? rs.error)

      // Interna: quem já respondeu (sem ligar à resposta) e quem falta.
      if (p.publico === 'interna') {
        const supabase = createClient()
        const [part, { data: funcs }] = await Promise.all([
          getParticipacoes([p.id]),
          supabase.from('funcionarios').select('user_id, full_name, status').eq('client_id', p.client_id).not('user_id', 'is', null),
        ])
        const ativos = ((funcs ?? []) as { user_id: string; full_name: string; status: string | null }[])
          .filter((f) => f.status !== 'Desligado')
        const responderam = new Set(part[p.id] ?? [])
        setTotalPessoas(ativos.length)
        setPendentes(ativos.filter((f) => !responderam.has(f.user_id)).map((f) => f.full_name).sort((a, b) => a.localeCompare(b)))
      }
      setCarregando(false)
    }
    carregar(pesquisa)
  }, [pesquisa])

  const externa = pesquisa?.publico === 'externa'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{pesquisa.titulo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {respostas.length} {respostas.length === 1 ? 'resposta' : 'respostas'}
              {!externa && totalPessoas > 0 && ` de ${totalPessoas} funcionários · respostas anônimas`}
            </p>
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
          {(['resumo', 'respondentes'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors',
                aba === a ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {a === 'resumo' ? 'Resumo' : externa ? 'Quem respondeu' : 'Quem falta responder'}
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
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              A lista mostra só quem ainda não respondeu. As respostas continuam anônimas: não dá para saber o que cada pessoa respondeu.
            </p>
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos já responderam.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pendentes.map((n) => (
                  <span key={n} className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">{n}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
