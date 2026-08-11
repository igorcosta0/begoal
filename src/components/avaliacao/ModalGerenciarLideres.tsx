'use client'

import { useEffect, useState } from 'react'
import { Crown, Check } from 'lucide-react'

export interface FuncionarioParaLideranca {
  id: string
  full_name: string
  cargo?: string | null
  lider_avaliacao?: boolean | null
}

interface Props {
  open: boolean
  funcionarios: FuncionarioParaLideranca[]
  salvando?: boolean
  erro?: string | null
  onClose: () => void
  onSalvar: (selecionados: Record<string, boolean>) => void
}

export default function ModalGerenciarLideres({ open, funcionarios, salvando, erro, onClose, onSalvar }: Props) {
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    const iniciais: Record<string, boolean> = {}
    for (const f of funcionarios) iniciais[f.id] = f.lider_avaliacao === true
    setSelecionados(iniciais)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, funcionarios])

  if (!open) return null

  const totalMarcados = Object.values(selecionados).filter(Boolean).length

  function alternar(id: string) {
    setSelecionados((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gerenciar Líderes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marque exatamente quem participa da Avaliação de Pares e pode criar ciclo. Isso não mexe no cargo nem no organograma — é só essa marcação.
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {totalMarcados} líder{totalMarcados !== 1 ? 'es' : ''} marcado{totalMarcados !== 1 ? 's' : ''} de {funcionarios.length}
          </p>
          <div className="space-y-2">
            {funcionarios.map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selecionados[f.id] ? 'border-amber-300 bg-amber-500/5' : 'border-border'}`}
              >
                <input
                  type="checkbox"
                  checked={!!selecionados[f.id]}
                  onChange={() => alternar(f.id)}
                  className="w-4 h-4 rounded border-input accent-amber-600 shrink-0"
                />
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-foreground font-semibold text-xs">
                  {f.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{f.full_name}</p>
                  {f.cargo && <p className="text-[10px] text-muted-foreground truncate">{f.cargo}</p>}
                </div>
              </label>
            ))}
          </div>
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
            disabled={salvando}
            className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSalvar(selecionados)}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
