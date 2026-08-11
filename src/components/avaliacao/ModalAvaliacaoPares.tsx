'use client'

import { Users, Check, ArrowRightLeft } from 'lucide-react'

export interface CandidatoLider {
  id: string
  full_name: string
  cargo?: string | null
}

interface Props {
  open: boolean
  cicloNome: string
  lideres: CandidatoLider[]
  confirmando?: boolean
  erro?: string | null
  onClose: () => void
  onConfirmar: () => void
}

export default function ModalAvaliacaoPares({ open, cicloNome, lideres, confirmando, erro, onClose, onConfirmar }: Props) {
  if (!open) return null

  const totalAvaliacoes = lideres.length * Math.max(lideres.length - 1, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Avaliação de Pares</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cicloNome} — cada líder avalia todos os outros líderes, só no Alinhamento Cultural (sem metas técnicas).
            </p>
          </div>
        </div>

        {/* Lista de líderes */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lideres.length} líder{lideres.length !== 1 ? 'es' : ''} identificado{lideres.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-muted-foreground mb-3">
            Considerado líder quem tem "líder" no Cargo ou tem pelo menos um liderado cadastrado em Funcionários.
          </p>

          {lideres.length < 2 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Users className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {lideres.length === 0
                  ? 'Nenhum líder identificado ainda.'
                  : 'Só 1 líder identificado — precisa de pelo menos 2 pra ter avaliação de pares.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Confira o campo Cargo ou o Gestor dos liderados em Funcionários.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lideres.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 text-violet-600 font-semibold text-xs">
                    {l.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{l.full_name}</p>
                    {l.cargo && <p className="text-[10px] text-muted-foreground truncate">{l.cargo}</p>}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground pt-1">
                Isso cria {totalAvaliacoes} avaliações (cada um avaliando os outros {lideres.length - 1}). Pares que já existem neste ciclo não são duplicados.
              </p>
            </div>
          )}
        </div>

        {erro && (
          <p className="mx-5 mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 shrink-0">
            {erro}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <button
            onClick={onClose}
            disabled={confirmando}
            className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={confirmando || lideres.length < 2}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            {confirmando ? 'Criando...' : 'Criar avaliações de pares'}
          </button>
        </div>
      </div>
    </div>
  )
}
