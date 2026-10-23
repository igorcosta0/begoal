'use client'

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

// Gráfico da distribuição de respostas de uma pergunta (guia do Miro, etapa 2:
// F44 gráfico padrão automático, F45 trocar o tipo de gráfico).
// A cor segue a categoria, nunca a posição: NPS usa as cores de detrator/neutro/
// promotor (as mesmas do formulário); escalas usam uma cor só; múltipla escolha
// usa a paleta categórica em ordem fixa.

export type Forma = 'barras' | 'colunas' | 'pizza'

export interface ItemGrafico {
  label: string
  qtd: number
  cor?: string // sem cor = cor primária
}

export const ROTULO_FORMA: Record<Forma, string> = { barras: 'Barras', colunas: 'Colunas', pizza: 'Pizza' }

// Paleta categórica validada (ordem fixa; ver skill dataviz). Mais de 8 opções não vira pizza.
export const CORES_CATEGORIAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
export const COR_NPS = { detrator: '#f43f5e', neutro: '#f59e0b', promotor: '#10b981' }

const pct = (qtd: number, base: number) => (base ? Math.round((qtd / base) * 100) : 0)

function Dica({ active, payload, base }: { active?: boolean; payload?: { payload: ItemGrafico }[]; base: number }) {
  if (!active || !payload?.length) return null
  const it = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-md text-xs">
      <p className="font-medium text-foreground">{it.label}</p>
      <p className="text-muted-foreground font-mono">{it.qtd} · {pct(it.qtd, base)}%</p>
    </div>
  )
}

export function SeletorForma({ formas, valor, onChange }: { formas: Forma[]; valor: Forma; onChange: (f: Forma) => void }) {
  if (formas.length < 2) return null
  return (
    <div className="flex gap-0.5 bg-secondary rounded-lg p-0.5 w-fit" role="group" aria-label="Tipo de gráfico">
      {formas.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          aria-pressed={valor === f}
          className={cn(
            'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors',
            valor === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {ROTULO_FORMA[f]}
        </button>
      ))}
    </div>
  )
}

// `base` = quantas pessoas responderam a pergunta (a porcentagem é sobre ela).
export default function GraficoPergunta({ itens, base, forma }: { itens: ItemGrafico[]; base: number; forma: Forma }) {
  const cor = (it: ItemGrafico) => it.cor ?? 'hsl(var(--primary))'

  if (forma === 'colunas') {
    return (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={itens} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} content={<Dica base={base} />} />
            <Bar dataKey="qtd" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {itens.map((it) => <Cell key={it.label} fill={cor(it)} />)}
              <LabelList dataKey="qtd" position="top" style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} formatter={(v: number) => (v ? v : '')} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (forma === 'pizza') {
    const comResposta = itens.filter((it) => it.qtd > 0)
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-44 h-44 shrink-0 mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={comResposta} dataKey="qtd" nameKey="label" innerRadius={48} outerRadius={84} stroke="hsl(var(--card))" strokeWidth={2} isAnimationActive={false}>
                {comResposta.map((it) => <Cell key={it.label} fill={cor(it)} />)}
              </Pie>
              <Tooltip content={<Dica base={base} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 flex-1 min-w-0">
          {itens.map((it) => (
            <li key={it.label} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cor(it) }} />
              <span className="flex-1 min-w-0 truncate text-foreground" title={it.label}>{it.label}</span>
              <span className="text-xs font-mono text-muted-foreground">{it.qtd} · {pct(it.qtd, base)}%</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {itens.map((it) => {
        const p = pct(it.qtd, base)
        return (
          <div key={it.label} className="flex items-center gap-3 text-sm" title={`${it.label}: ${it.qtd} · ${p}%`}>
            <span className="w-28 sm:w-48 shrink-0 truncate text-foreground">{it.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p}%`, background: cor(it) }} />
            </div>
            <span className="w-16 text-right text-xs font-mono text-muted-foreground">{it.qtd} · {p}%</span>
          </div>
        )
      })}
    </div>
  )
}
