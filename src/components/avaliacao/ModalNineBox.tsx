'use client'

import { cn } from '@/lib/utils'

interface AvaliacaoNineBox {
  id: string
  funcionario?: { full_name: string } | null
  media_cultural_gestor: number | null
  media_tecnica_gestor: number | null
}

interface Props {
  open: boolean
  avaliacoes: AvaliacaoNineBox[]
  onClose: () => void
}

const QUADRANTES = [
  // row 0: Alto Cultural
  [
    { label: 'Apostar / Desenvolver', cor: 'bg-yellow-400', corText: 'text-yellow-900', descricao: 'Forte fit cultural. Foco em capacitação técnica.' },
    { label: 'Desempenho Sólido', cor: 'bg-blue-400', corText: 'text-blue-900', descricao: 'Profissional consistente e equilibrado.' },
    { label: 'Talento Chave', cor: 'bg-emerald-500', corText: 'text-white', descricao: 'Elegível para bônus, promoções e novas frentes.' },
  ],
  // row 1: Médio Cultural
  [
    { label: 'Alerta de Relação', cor: 'bg-orange-400', corText: 'text-orange-900', descricao: 'Requer PDI técnico e acompanhamento de atitude.' },
    { label: 'Ajustar Rota', cor: 'bg-yellow-300', corText: 'text-yellow-900', descricao: 'Foco em ampliar engajamento e consistência.' },
    { label: 'Estrela Desalinhada', cor: 'bg-orange-500', corText: 'text-white', descricao: 'Alto entregador técnico com desvios comportamentais.' },
  ],
  // row 2: Baixo Cultural
  [
    { label: 'Desligamento Imediato', cor: 'bg-red-700', corText: 'text-white', descricao: 'Sem entrega e sem fit cultural.' },
    { label: 'Desligamento de Cultura', cor: 'bg-red-500', corText: 'text-white', descricao: 'Compromete o clima e os valores da empresa.' },
    { label: 'Desligamento de Risco', cor: 'bg-red-400', corText: 'text-white', descricao: 'Resultado técnico não compensa desvios éticos.' },
  ],
]

function getQuadrante(mediaC: number | null, mediaT: number | null): [number, number] | null {
  if (mediaC === null || mediaT === null) return null
  const row = mediaC >= 3.7 ? 0 : mediaC >= 2.3 ? 1 : 2
  const col = mediaT >= 3.7 ? 2 : mediaT >= 2.3 ? 1 : 0
  return [row, col]
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function ModalNineBox({ open, avaliacoes, onClose }: Props) {
  if (!open) return null

  const comScores = avaliacoes.filter(
    (a) => a.media_cultural_gestor !== null && a.media_tecnica_gestor !== null
  )
  const semScores = avaliacoes.filter(
    (a) => a.media_cultural_gestor === null || a.media_tecnica_gestor === null
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Matriz Nine Box</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Calibração: Alinhamento Cultural × Performance Técnica (notas do gestor)</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Legenda dos eixos */}
          <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
              Baixo: &lt; 2.3
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/70" />
              Médio: 2.3 – 3.6
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/90" />
              Alto: ≥ 3.7
            </div>
          </div>

          <div className="flex gap-2">
            {/* Label eixo Y */}
            <div className="flex items-center justify-center w-6 shrink-0">
              <span
                className="text-xs text-muted-foreground font-medium"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                Alinhamento Cultural ↑
              </span>
            </div>

            {/* Grid */}
            <div className="flex-1 space-y-1">
              {/* Labels nível cultural */}
              {['Alto', 'Médio', 'Baixo'].map((nivel, rowIdx) => (
                <div key={nivel} className="flex gap-1">
                  <div className="w-12 flex items-center justify-end shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">{nivel}</span>
                  </div>
                  {QUADRANTES[rowIdx].map((quadrante, colIdx) => {
                    const funcionariosNaBox = comScores.filter((a) => {
                      const pos = getQuadrante(a.media_cultural_gestor, a.media_tecnica_gestor)
                      return pos && pos[0] === rowIdx && pos[1] === colIdx
                    })
                    return (
                      <div
                        key={colIdx}
                        className={cn('flex-1 rounded-md p-3 min-h-[100px]', quadrante.cor)}
                      >
                        <p className={cn('text-xs font-bold leading-tight', quadrante.corText)}>
                          {quadrante.label}
                        </p>
                        <p className={cn('text-xs mt-0.5 opacity-80 leading-tight', quadrante.corText)}>
                          {quadrante.descricao}
                        </p>
                        {funcionariosNaBox.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {funcionariosNaBox.map((a) => (
                              <div
                                key={a.id}
                                title={a.funcionario?.full_name}
                                className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm cursor-default"
                              >
                                {iniciais(a.funcionario?.full_name ?? '?')}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Label eixo X */}
              <div className="flex gap-1 mt-1">
                <div className="w-12 shrink-0" />
                {['Baixo', 'Médio', 'Alto'].map((nivel) => (
                  <div key={nivel} className="flex-1 text-center">
                    <span className="text-xs text-muted-foreground font-medium">{nivel}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-0.5">
                <span className="text-xs text-muted-foreground">Performance Técnica →</span>
              </div>
            </div>
          </div>

          {/* Sem scores */}
          {semScores.length > 0 && (
            <div className="mt-5 border border-border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Aguardando avaliação do gestor ({semScores.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {semScores.map((a) => (
                  <span
                    key={a.id}
                    className="text-xs px-2 py-1 bg-secondary rounded text-secondary-foreground"
                  >
                    {a.funcionario?.full_name ?? 'Sem nome'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
