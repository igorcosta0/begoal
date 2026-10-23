'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { analisarComIa, type AnaliseIa, type FiltroResultados } from '@/lib/queries/pesquisas'

// Análise com IA (guia do Miro, etapa 4, F57) do recorte que está na tela.
// A análise fica guardada no componente pai para entrar no relatório.

const SECOES: { chave: keyof Omit<AnaliseIa, 'resumo'>; titulo: string }[] = [
  { chave: 'pontos_fortes', titulo: 'Pontos fortes' },
  { chave: 'pontos_de_atencao', titulo: 'Pontos de atenção' },
  { chave: 'temas_abertas', titulo: 'O que apareceu nas respostas abertas' },
  { chave: 'recomendacoes', titulo: 'Sugestões de ação' },
]

export function ConteudoAnalise({ analise }: { analise: AnaliseIa }) {
  return (
    <div className="space-y-3">
      {analise.resumo && <p className="text-sm text-foreground">{analise.resumo}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECOES.filter((s) => analise[s.chave].length).map((s) => (
          <div key={s.chave}>
            <p className="text-xs font-semibold text-foreground mb-1">{s.titulo}</p>
            <ul className="space-y-1 list-disc pl-4 text-sm text-foreground marker:text-muted-foreground">
              {analise[s.chave].map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Feita por IA a partir dos números e das respostas abertas. Confira antes de decidir.</p>
    </div>
  )
}

interface Props {
  pesquisaId: string
  filtro: FiltroResultados
  analise: AnaliseIa | null
  onAnalise: (a: AnaliseIa | null) => void
}

export default function AnaliseIaPainel({ pesquisaId, filtro, analise, onAnalise }: Props) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerar() {
    setErro(null)
    setGerando(true)
    const { data, error } = await analisarComIa(pesquisaId, filtro)
    setGerando(false)
    if (error) return setErro(error)
    onAnalise(data)
  }

  if (!analise) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary disabled:opacity-60"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" /> {gerando ? 'Analisando...' : 'Analisar com IA'}
        </button>
        {erro && <span className="text-xs text-red-600">{erro}</span>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="w-4 h-4 text-primary" /> Análise com IA
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={gerar} disabled={gerando} className="text-xs font-medium text-primary hover:underline disabled:opacity-60">
            {gerando ? 'Analisando...' : 'Gerar de novo'}
          </button>
          <button type="button" onClick={() => onAnalise(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Fechar
          </button>
        </div>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <ConteudoAnalise analise={analise} />
    </div>
  )
}
