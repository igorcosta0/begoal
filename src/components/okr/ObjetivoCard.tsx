'use client'

import { useState } from 'react'
import { cn, formatPercent, getProgressColor } from '@/lib/utils'
import { ChevronDown, ChevronUp, MoreHorizontal, Target, Archive, Activity, GripVertical } from 'lucide-react'
import KrCard from './KrCard'

interface ObjetivoCardProps {
  objetivo: {
    id: string
    titulo: string
    progresso?: number | null // null = nenhum KR com lançamento ainda
    krs?: any[]
    sinais_vitais_count?: number
  }
  onCriarKr?: (objetivo: any) => void
  onEditarObjetivo?: (objetivo: any) => void
  onExcluirObjetivo?: (objetivo: any) => void
  onFinalizarObjetivo?: (objetivo: any) => void
  onLancarKr?: (kr: any) => void
  onEditarKr?: (kr: any) => void
  onFinalizarKr?: (kr: any) => void
  onExcluirKr?: (kr: any) => void
  onVerGraficoKr?: (kr: any) => void
  onReativarKr?: (kr: any) => void
  onVerTaticasKr?: (kr: any) => void
  onEditarLancamentosKr?: (kr: any) => void
  onVerSinaisVitaisKr?: (kr: any) => void
  onVerSinaisVitaisObjetivo?: (objetivo: any) => void
  // Move o KR arrastado para antes (ou depois) do KR alvo.
  onMoverKr?: (objetivoId: string, krId: string, alvoId: string, depois: boolean) => void
}

export default function ObjetivoCard({
  objetivo,
  onCriarKr,
  onEditarObjetivo,
  onExcluirObjetivo,
  onFinalizarObjetivo,
  onLancarKr,
  onEditarKr,
  onFinalizarKr,
  onExcluirKr,
  onVerGraficoKr,
  onReativarKr,
  onVerTaticasKr,
  onEditarLancamentosKr,
  onVerSinaisVitaisKr,
  onVerSinaisVitaisObjetivo,
  onMoverKr,
}: ObjetivoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Arrastar KR: pegandoId = alça pressionada (libera o draggable), arrastandoId = em movimento,
  // sobre = card sob o cursor e de que lado ele vai entrar.
  const [pegandoId, setPegandoId] = useState<string | null>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [sobre, setSobre] = useState<{ id: string; depois: boolean } | null>(null)

  // Grade com várias colunas: metade direita do card = entra depois. Uma coluna só (celular): metade de baixo.
  function soltarDepois(e: React.DragEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const grade = e.currentTarget.parentElement?.getBoundingClientRect()
    const umaColuna = !grade || r.width > grade.width * 0.6
    return umaColuna ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2
  }

  const semDados = objetivo.progresso === null || objetivo.progresso === undefined
  const progresso = objetivo.progresso ?? 0
  const krs = objetivo.krs ?? []
  const barColor = semDados ? 'bg-muted' : getProgressColor(progresso)
  const krsSemDados = krs.filter((kr) => kr.progresso === null && !kr.concluido).length

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                {objetivo.titulo}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {krs.length} Key Result{krs.length !== 1 ? 's' : ''}
                {krsSemDados > 0 && ` · ${krsSemDados} sem lançamentos (fora da média)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sinais vitais ligados ao objetivo (só aparece quando há algum) */}
            {onVerSinaisVitaisObjetivo && (objetivo.sinais_vitais_count ?? 0) > 0 && (
              <button
                onClick={() => onVerSinaisVitaisObjetivo(objetivo)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Sinais vitais</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                  {objetivo.sinais_vitais_count}
                </span>
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-lg z-20 min-w-40 py-1">
                    <button
                      onClick={() => { onCriarKr?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-primary font-medium"
                    >
                      + Novo KR
                    </button>
                    <button
                      onClick={() => { onEditarObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                    >
                      Editar objetivo
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { onFinalizarObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-amber-600 flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Finalizar objetivo
                    </button>
                    <button
                      onClick={() => { onExcluirObjetivo?.(objetivo); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                    >
                      Excluir objetivo
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span className="font-medium text-foreground">{semDados ? 'Sem lançamentos' : formatPercent(progresso)}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(progresso, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {krs.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Nenhum KR cadastrado ainda.</p>
              <button
                onClick={() => onCriarKr?.(objetivo)}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                + Criar primeiro KR
              </button>
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {krs.map((kr, i) => (
                <div
                  key={kr.id}
                  // Só arrasta pela alça: assim clicar/selecionar texto no card continua normal.
                  draggable={!!onMoverKr && pegandoId === kr.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', kr.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setArrastandoId(kr.id)
                  }}
                  onDragEnd={() => { setArrastandoId(null); setPegandoId(null); setSobre(null) }}
                  onDragOver={(e) => {
                    if (!arrastandoId || arrastandoId === kr.id) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    const depois = soltarDepois(e)
                    if (!sobre || sobre.id !== kr.id || sobre.depois !== depois) setSobre({ id: kr.id, depois })
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre((s) => (s?.id === kr.id ? null : s))
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain')
                    const depois = soltarDepois(e)
                    setArrastandoId(null); setPegandoId(null); setSobre(null)
                    if (id && id !== kr.id) onMoverKr?.(objetivo.id, id, kr.id, depois)
                  }}
                  className={cn(
                    'relative rounded-xl transition-opacity',
                    arrastandoId === kr.id && 'opacity-40'
                  )}
                >
                  {/* Linha que mostra onde o KR vai entrar */}
                  {sobre?.id === kr.id && (
                    <span
                      className={cn(
                        'absolute z-10 bg-primary rounded-full pointer-events-none',
                        'max-md:inset-x-0 max-md:h-1',
                        sobre?.depois ? 'max-md:-bottom-2 md:-right-2' : 'max-md:-top-2 md:-left-2',
                        'md:inset-y-0 md:w-1'
                      )}
                    />
                  )}
                  <KrCard
                    kr={kr}
                    onLancar={onLancarKr}
                    onEditar={onEditarKr}
                    onFinalizar={onFinalizarKr}
                    onExcluir={onExcluirKr}
                    onVerGrafico={onVerGraficoKr}
                    onReativar={onReativarKr}
                    onVerTaticas={onVerTaticasKr}
                    onEditarLancamentos={onEditarLancamentosKr}
                    onVerSinaisVitais={onVerSinaisVitaisKr}
                    onMoverAntes={onMoverKr && i > 0 ? () => onMoverKr(objetivo.id, kr.id, krs[i - 1].id, false) : undefined}
                    onMoverDepois={onMoverKr && i < krs.length - 1 ? () => onMoverKr(objetivo.id, kr.id, krs[i + 1].id, true) : undefined}
                    alca={
                      onMoverKr && krs.length > 1 ? (
                        <button
                          type="button"
                          aria-label="Arrastar para mudar a posição do KR"
                          title="Arraste para mudar a posição"
                          onMouseDown={() => setPegandoId(kr.id)}
                          onMouseUp={() => setPegandoId(null)}
                          className="-ml-1 p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}