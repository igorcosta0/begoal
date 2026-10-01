'use client'

import Link from 'next/link'
import { Activity, Building2, User, X, ArrowRight } from 'lucide-react'
import { cn, formatPercent, formatValor } from '@/lib/utils'
import { progressoSinalVital } from '@/lib/okrProgresso'
import MiniGrafico, { Tendencia } from './MiniGrafico'

interface ModalSinaisVitaisKrProps {
  open: boolean
  kr: any | null
  // Sinais vitais ligados a este KR (já sem os removidos), com a série de lançamentos.
  sinaisVitais: any[]
  onClose: () => void
}

export default function ModalSinaisVitaisKr({ open, kr, sinaisVitais, onClose }: ModalSinaisVitaisKrProps) {
  if (!open || !kr) return null

  const comLancamento = sinaisVitais.filter((sv) => (sv.serie ?? []).length > 0)
  const naMeta = comLancamento.filter((sv) => progressoSinalVital(sv) >= 100).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Sinais vitais do KR</p>
              <h2 className="text-sm font-semibold text-foreground leading-snug">{kr.titulo}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {sinaisVitais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum sinal vital ligado a este KR</p>
              <p className="text-xs text-muted-foreground">Ligue um sinal vital ao KR em Sinais Vitais › Editar.</p>
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/50 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{sinaisVitais.length}</p>
                  <p className="text-[10px] text-muted-foreground">Sinais vitais</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-emerald-600">{naMeta}</p>
                  <p className="text-[10px] text-muted-foreground">Na meta</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-amber-600">{comLancamento.length - naMeta}</p>
                  <p className="text-[10px] text-muted-foreground">Abaixo da meta</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-muted-foreground">{sinaisVitais.length - comLancamento.length}</p>
                  <p className="text-[10px] text-muted-foreground">Sem lançamentos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sinaisVitais.map((sv) => {
                  const serie = sv.serie ?? []
                  const progresso = progressoSinalVital(sv)
                  const direcao = Number(sv.meta ?? 0) < Number(sv.valor_inicial ?? 0) ? 'menor' : 'maior'
                  const barColor = progresso >= 70 ? 'bg-green-500' : progresso >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  return (
                    <div key={sv.id} className="border border-border rounded-xl p-3 flex flex-col gap-2.5">
                      <p className="text-xs font-semibold text-foreground leading-snug">{sv.titulo}</p>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Atual <span className="font-medium text-foreground">{serie.length ? formatValor(sv.valor_atual ?? 0, sv.tipo_valor) : '—'}</span>
                            {' · '}Meta <span className="font-medium text-foreground">{formatValor(sv.meta ?? 0, sv.tipo_valor)}</span>
                          </span>
                          <span className="font-semibold text-foreground">{serie.length ? formatPercent(progresso) : 'Sem lançamentos'}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', serie.length ? barColor : 'bg-muted')}
                            style={{ width: `${serie.length ? Math.min(progresso, 100) : 0}%` }}
                          />
                        </div>
                      </div>

                      {serie.length > 0 && (
                        <div className="space-y-1.5">
                          <MiniGrafico serie={serie} meta={sv.meta} acumular={false} direcao={direcao} tipoValor={sv.tipo_valor} />
                          <Tendencia serie={serie} direcao={direcao} tipoValor={sv.tipo_valor} />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                        {sv.funcionarios?.full_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {sv.funcionarios.full_name}
                          </span>
                        )}
                        {sv.setores?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {sv.setores.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-border shrink-0 flex justify-end">
          <Link
            href="/sinais-vitais"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Lançar ou editar em Sinais Vitais
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
