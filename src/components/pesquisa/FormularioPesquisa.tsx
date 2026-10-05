'use client'

import { cn } from '@/lib/utils'
import type { Pergunta, Respostas } from '@/lib/queries/pesquisas'

// Perguntas de uma pesquisa para responder. Usado na resposta interna (modal)
// e na página pública do link externo.
export default function FormularioPesquisa({
  perguntas,
  respostas,
  onChange,
  faltando = [],
}: {
  perguntas: Pergunta[]
  respostas: Respostas
  onChange: (respostas: Respostas) => void
  faltando?: string[]
}) {
  function set(id: string, valor: number | string) {
    onChange({ ...respostas, [id]: valor })
  }

  return (
    <div className="space-y-4">
      {perguntas.map((q, i) => {
        const valor = respostas[q.id]
        const erro = faltando.includes(q.id)
        return (
          <div
            key={q.id}
            id={`pergunta-${q.id}`}
            className={cn(
              'rounded-2xl border bg-card p-4 md:p-5',
              erro ? 'border-red-400 ring-2 ring-red-100' : 'border-border'
            )}
          >
            <p className="text-sm font-semibold text-foreground">
              <span className="text-muted-foreground font-mono mr-1.5">{i + 1}.</span>
              {q.enunciado}
              {q.obrigatoria && <span className="text-red-500 ml-0.5">*</span>}
            </p>

            <div className="mt-3">
              {q.tipo === 'nota_1_5' && (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set(q.id, n)}
                      className={cn(
                        'w-11 h-11 rounded-xl border text-sm font-semibold transition-colors',
                        valor === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-secondary'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <div className="w-full flex justify-between text-[11px] text-muted-foreground max-w-[268px]">
                    <span>Muito insatisfeito</span><span>Muito satisfeito</span>
                  </div>
                </div>
              )}

              {q.tipo === 'nps' && (
                <div>
                  <div className="grid grid-cols-11 gap-1 sm:gap-1.5 max-w-xl">
                    {Array.from({ length: 11 }, (_, n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set(q.id, n)}
                        className={cn(
                          'h-10 rounded-lg border text-xs sm:text-sm font-semibold transition-colors',
                          valor === n
                            ? n <= 6 ? 'bg-rose-500 text-white border-rose-500' : n <= 8 ? 'bg-amber-500 text-white border-amber-500' : 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-border text-foreground hover:bg-secondary'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground max-w-xl mt-1">
                    <span>Nada provável</span><span>Muito provável</span>
                  </div>
                </div>
              )}

              {q.tipo === 'multipla' && (
                <div className="space-y-1.5">
                  {q.opcoes.map((op) => (
                    <label
                      key={op}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors',
                        valor === op ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-foreground hover:bg-secondary'
                      )}
                    >
                      <input
                        type="radio"
                        name={`pergunta-${q.id}`}
                        checked={valor === op}
                        onChange={() => set(q.id, op)}
                        className="accent-[hsl(var(--primary))]"
                      />
                      {op}
                    </label>
                  ))}
                </div>
              )}

              {q.tipo === 'texto' && (
                <div>
                  <textarea
                    value={typeof valor === 'string' ? valor : ''}
                    onChange={(e) => set(q.id, e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Sua resposta..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
              )}
            </div>

            {erro && <p className="text-xs text-red-600 mt-2">Responda esta pergunta.</p>}
          </div>
        )
      })}
    </div>
  )
}
