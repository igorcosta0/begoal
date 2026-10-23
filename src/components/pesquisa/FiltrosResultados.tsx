'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getOpcoesFiltro, MINIMO_RECORTE, ROTULO_SEGMENTO, filtroResultadosVazio,
  type CampoSegmento, type FiltroResultados, type OpcoesFiltro, type Pergunta,
} from '@/lib/queries/pesquisas'

// Filtros dos resultados (guia do Miro, etapa 4): F48 filtrar pelos campos da
// pesquisa (área, cargo, tempo de empresa, estado, cliente e as respostas de
// múltipla escolha) e F49 mostrar quais filtros estão aplicados. Valores com
// menos de 5 respostas aparecem desabilitados; o banco confere de novo.

const CAMPOS: CampoSegmento[] = ['setor', 'cargo', 'tempo_empresa', 'estado', 'cliente']

interface Props {
  pesquisaId: string
  perguntas: Pergunta[]
  filtro: FiltroResultados
  onChange: (f: FiltroResultados) => void
}

function Opcao({ rotulo, n, marcado, desabilitado, onClick }: { rotulo: string; n?: number; marcado: boolean; desabilitado?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado && !marcado}
      aria-pressed={marcado}
      title={desabilitado ? `Menos de ${MINIMO_RECORTE} respostas: não dá para filtrar sem expor quem respondeu` : undefined}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        marcado ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-secondary'
      )}
    >
      {rotulo}
      {n !== undefined && <span className={cn('ml-1 font-mono', marcado ? 'opacity-80' : 'text-muted-foreground')}>{n}</span>}
    </button>
  )
}

export default function FiltrosResultados({ pesquisaId, perguntas, filtro, onChange }: Props) {
  const [aberto, setAberto] = useState(false)
  const [opcoes, setOpcoes] = useState<OpcoesFiltro | null>(null)

  useEffect(() => {
    getOpcoesFiltro(pesquisaId).then(setOpcoes)
  }, [pesquisaId])

  const camposComValor = CAMPOS.filter((c) => (opcoes?.[c]?.length ?? 0) > 0)
  const perguntasEscolha = perguntas.filter((q) => q.tipo === 'multipla' || q.tipo === 'multipla_varias')
  if (!camposComValor.length && !perguntasEscolha.length) return null

  function alternarSegmento(campo: CampoSegmento, valor: string) {
    const atual = filtro.segmento[campo] ?? []
    const novo = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]
    onChange({ ...filtro, segmento: { ...filtro.segmento, [campo]: novo } })
  }

  function alternarResposta(perguntaId: string, opcao: string) {
    const atual = filtro.respostas[perguntaId] ?? []
    const novo = atual.includes(opcao) ? atual.filter((v) => v !== opcao) : [...atual, opcao]
    onChange({ ...filtro, respostas: { ...filtro.respostas, [perguntaId]: novo } })
  }

  // F49: o que está aplicado, em chips que dá para tirar um a um.
  const aplicados: { chave: string; rotulo: string; tirar: () => void }[] = [
    ...CAMPOS.flatMap((c) => (filtro.segmento[c] ?? []).map((v) => ({
      chave: `${c}:${v}`, rotulo: `${ROTULO_SEGMENTO[c]}: ${v}`, tirar: () => alternarSegmento(c, v),
    }))),
    ...perguntasEscolha.flatMap((q) => (filtro.respostas[q.id] ?? []).map((v) => ({
      chave: `${q.id}:${v}`,
      rotulo: `${q.enunciado.length > 32 ? `${q.enunciado.slice(0, 31)}…` : q.enunciado} ${v}`,
      tirar: () => alternarResposta(q.id, v),
    }))),
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors',
            aplicados.length ? 'border-primary text-primary bg-primary/5' : 'border-border text-foreground hover:bg-secondary'
          )}
        >
          <Filter className="w-3.5 h-3.5" /> Filtrar{aplicados.length > 0 && ` (${aplicados.length})`}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', aberto && 'rotate-180')} />
        </button>
        {aplicados.map((a) => (
          <span key={a.chave} className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-foreground">
            {a.rotulo}
            <button type="button" onClick={a.tirar} className="p-0.5 rounded-full hover:bg-primary/20" aria-label={`Tirar o filtro ${a.rotulo}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!filtroResultadosVazio(filtro) && (
          <button type="button" onClick={() => onChange({ segmento: {}, respostas: {} })} className="text-xs font-medium text-primary hover:underline px-1">
            Limpar filtros
          </button>
        )}
      </div>

      {aberto && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          {camposComValor.map((c) => (
            <div key={c}>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{ROTULO_SEGMENTO[c]}</p>
              <div className="flex flex-wrap gap-1.5">
                {opcoes![c].map((o) => (
                  <Opcao
                    key={o.valor}
                    rotulo={o.valor}
                    n={o.n}
                    marcado={(filtro.segmento[c] ?? []).includes(o.valor)}
                    desabilitado={o.n < MINIMO_RECORTE}
                    onClick={() => alternarSegmento(c, o.valor)}
                  />
                ))}
              </div>
            </div>
          ))}
          {perguntasEscolha.map((q) => (
            <div key={q.id}>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{q.enunciado}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.opcoes.map((op) => (
                  <Opcao key={op} rotulo={op} marcado={(filtro.respostas[q.id] ?? []).includes(op)} onClick={() => alternarResposta(q.id, op)} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Dentro de um mesmo campo, vale qualquer valor marcado; entre campos diferentes, valem todos juntos. Recortes com menos de{' '}
            {MINIMO_RECORTE} respostas não aparecem, para ninguém ser identificado.
          </p>
        </div>
      )}
    </div>
  )
}
