'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getCalibragemCicloCultural,
  getCalibragemCicloTecnica,
  upsertAvaliacaoCultural,
  upsertAvaliacaoTecnica,
  updateAvaliacao,
} from '@/lib/queries/avaliacao'
import { PILARES_CULTURAIS, VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'
import { X } from 'lucide-react'

// ── Painel de Calibragem ─────────────────────────────────────────────────────
// Pedido (ago/2026): o administrador calibrava abrindo o ModalAvaliacao
// pessoa por pessoa. Este painel junta o ciclo inteiro numa tabela só — por
// pilar cultural: Auto / Avaliador / Média de Pares / Calibragem lado a
// lado; por critério técnico (varia por vertical): Auto / Avaliador / Média
// Pares / Calibragem, mesmas colunas do cultural (Avaliação de Pares ganhou
// lado técnico em ago/2026, migration 20260827030000_calibragem_media_
// pares_tecnica — antes era só cultural).
//
// Acesso: só renderizado pra quem tem souGestorDaCalibragem=true (ver
// avaliacao/page.tsx) — na CTZ é Igor, Filippe Réus e Priscila Santos; nas
// demais empresas, qualquer administrador de verdade. O banco
// (get_calibragem_ciclo_cultural/tecnica, migrations 20260826_calibragem_
// painel e 20260827020000/030000) já devolve tudo null pra quem não tem
// pode_ver_lado_calibragem, mas este componente nem chega a ser montado
// nesse caso.
//
// Salvamento é por clique (autosave), não um botão "Salvar" geral — cada nota
// de calibragem grava assim que clicada, pra minimizar o número de cliques do
// processo. Depois de cada clique também recalcula e grava a média
// (media_cultural_calibragem/media_tecnica_calibragem) daquela avaliação, do
// mesmo jeito que o ModalAvaliacao já faz — sem isso o Nine Box e o gate de
// "Finalizar Calibragem" ficariam vendo dado desatualizado.

type NotaCalibragem = 1 | 2 | 3 | 4 | 5

interface PilarLinha {
  pilar: number
  nota_auto: number | null
  nota_avaliador: number | null
  media_pares: number | null
  nota_calibragem: number | null
}

interface CriterioLinha {
  criterio_key: string
  nota_auto: number | null
  nota_avaliador: number | null
  media_pares: number | null
  nota_calibragem: number | null
}

interface ParticipanteCalibragem {
  avaliacao_id: string
  funcionario_id: string
  funcionario_nome: string
  funcionario_cargo: string | null
  vertical: string | null
  status: string
  pilares: Record<number, PilarLinha>
  criterios: Record<string, CriterioLinha>
}

interface Props {
  open: boolean
  cicloId: string
  cicloNome: string
  onClose: () => void
  onSaved: () => void
}

function calcMedia(values: (number | null)[]): number | null {
  const validos = values.filter((v): v is number => v !== null)
  if (!validos.length) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

function CelulaScore({
  value,
  editable,
  onSelect,
}: {
  value: number | null
  editable?: boolean
  onSelect?: (v: NotaCalibragem) => void
}) {
  if (!editable) {
    return (
      <span className={cn('text-sm font-medium', value === null && 'text-muted-foreground/50')}>
        {value ?? '—'}
      </span>
    )
  }
  return (
    <div className="flex gap-0.5">
      {([1, 2, 3, 4, 5] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect?.(v)}
          className={cn(
            'w-5 h-5 rounded text-[10px] font-bold border transition-colors',
            value === v
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-background text-muted-foreground border-border hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export default function ModalCalibragem({ open, cicloId, cicloNome, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [participantes, setParticipantes] = useState<ParticipanteCalibragem[]>([])
  const [erro, setErro] = useState('')
  const [salvandoCelula, setSalvandoCelula] = useState<string | null>(null)

  useEffect(() => {
    if (open && cicloId) {
      carregar(cicloId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cicloId])

  async function carregar(id: string) {
    setLoading(true)
    setErro('')
    const [{ data: cultural, error: erroC }, { data: tecnica, error: erroT }] = await Promise.all([
      getCalibragemCicloCultural(id),
      getCalibragemCicloTecnica(id),
    ])
    if (erroC || erroT) {
      setErro((erroC || erroT)?.message ?? 'Erro ao carregar calibragem.')
      setLoading(false)
      return
    }

    const porFuncionario = new Map<string, ParticipanteCalibragem>()
    ;(cultural ?? []).forEach((row: any) => {
      let p = porFuncionario.get(row.avaliacao_id)
      if (!p) {
        p = {
          avaliacao_id: row.avaliacao_id,
          funcionario_id: row.funcionario_id,
          funcionario_nome: row.funcionario_nome,
          funcionario_cargo: row.funcionario_cargo,
          vertical: row.vertical,
          status: row.status,
          pilares: {},
          criterios: {},
        }
        porFuncionario.set(row.avaliacao_id, p)
      }
      p.pilares[row.pilar] = {
        pilar: row.pilar,
        nota_auto: row.nota_auto,
        nota_avaliador: row.nota_avaliador,
        media_pares: row.media_pares,
        nota_calibragem: row.nota_calibragem,
      }
    })
    ;(tecnica ?? []).forEach((row: any) => {
      const p = porFuncionario.get(row.avaliacao_id)
      if (!p) return
      p.criterios[row.criterio_key] = {
        criterio_key: row.criterio_key,
        nota_auto: row.nota_auto,
        nota_avaliador: row.nota_avaliador,
        media_pares: row.media_pares,
        nota_calibragem: row.nota_calibragem,
      }
    })

    const lista = Array.from(porFuncionario.values()).sort((a, b) =>
      a.funcionario_nome.localeCompare(b.funcionario_nome)
    )
    setParticipantes(lista)
    setLoading(false)
  }

  async function salvarCalibragemCultural(p: ParticipanteCalibragem, pilar: number, valor: NotaCalibragem) {
    const chave = `${p.avaliacao_id}-cultural-${pilar}`
    setErro('')
    setSalvandoCelula(chave)

    // Otimista: atualiza a tela antes da resposta do banco, revertendo em
    // caso de erro — evita a UI "travar" a cada clique num painel com muita
    // gente/pilar.
    const anterior = p.pilares[pilar]?.nota_calibragem ?? null
    const novosPilares = { ...p.pilares, [pilar]: { ...p.pilares[pilar], nota_calibragem: valor } }
    aplicarAtualizacao(p.avaliacao_id, { pilares: novosPilares })

    const { error } = await upsertAvaliacaoCultural(p.avaliacao_id, pilar, { nota_calibragem: valor })
    if (error) {
      aplicarAtualizacao(p.avaliacao_id, {
        pilares: { ...novosPilares, [pilar]: { ...novosPilares[pilar], nota_calibragem: anterior } },
      })
      setErro(error.message)
      setSalvandoCelula(null)
      return
    }

    const mediaCultural = calcMedia([1, 2, 3, 4].map((n) => (n === pilar ? valor : p.pilares[n]?.nota_calibragem ?? null)))
    const { error: erroMedia } = await updateAvaliacao(p.avaliacao_id, { media_cultural_calibragem: mediaCultural })
    setSalvandoCelula(null)
    if (erroMedia) {
      setErro(erroMedia.message)
      return
    }
    onSaved()
  }

  async function salvarCalibragemTecnica(p: ParticipanteCalibragem, criterioKey: string, valor: NotaCalibragem) {
    const chave = `${p.avaliacao_id}-tecnica-${criterioKey}`
    setErro('')
    setSalvandoCelula(chave)

    const anterior = p.criterios[criterioKey]?.nota_calibragem ?? null
    const novosCriterios = { ...p.criterios, [criterioKey]: { ...p.criterios[criterioKey], nota_calibragem: valor } }
    aplicarAtualizacao(p.avaliacao_id, { criterios: novosCriterios })

    const { error } = await upsertAvaliacaoTecnica(p.avaliacao_id, criterioKey, { nota_calibragem: valor })
    if (error) {
      aplicarAtualizacao(p.avaliacao_id, {
        criterios: { ...novosCriterios, [criterioKey]: { ...novosCriterios[criterioKey], nota_calibragem: anterior } },
      })
      setErro(error.message)
      setSalvandoCelula(null)
      return
    }

    const criteriosVertical = p.vertical ? VERTICAIS_CTZ[p.vertical]?.criterios ?? [] : []
    const mediaTecnica = calcMedia(
      criteriosVertical.map((c) => (c.key === criterioKey ? valor : p.criterios[c.key]?.nota_calibragem ?? null))
    )
    const { error: erroMedia } = await updateAvaliacao(p.avaliacao_id, { media_tecnica_calibragem: mediaTecnica })
    setSalvandoCelula(null)
    if (erroMedia) {
      setErro(erroMedia.message)
      return
    }
    onSaved()
  }

  function aplicarAtualizacao(avaliacaoId: string, patch: Partial<Pick<ParticipanteCalibragem, 'pilares' | 'criterios'>>) {
    setParticipantes((prev) =>
      prev.map((p) => (p.avaliacao_id === avaliacaoId ? { ...p, ...patch } : p))
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-6xl mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground">{cicloNome}</p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">Painel de Calibragem</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada nota de calibragem é salva assim que clicada. Exclusivo de administrador — ninguém mais vê esta tela nem os dados nela.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {erro && (
          <p className="mx-5 mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 shrink-0">
            {erro}
          </p>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />)}
            </div>
          ) : participantes.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum participante em Calibragem neste ciclo ainda — use &quot;Iniciar Calibragem&quot; primeiro.
              </p>
            </div>
          ) : (
            participantes.map((p) => {
              const criteriosVertical = p.vertical ? VERTICAIS_CTZ[p.vertical]?.criterios ?? [] : []
              return (
                <div key={p.avaliacao_id} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.funcionario_nome}</p>
                      {p.funcionario_cargo && <p className="text-xs text-muted-foreground">{p.funcionario_cargo}</p>}
                    </div>
                    {p.vertical && (
                      <span className="text-xs text-muted-foreground">{VERTICAIS_CTZ[p.vertical]?.label ?? p.vertical}</span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="px-4 py-2 font-medium">Pilar cultural</th>
                          <th className="px-2 py-2 font-medium">Auto</th>
                          <th className="px-2 py-2 font-medium">Avaliador</th>
                          <th className="px-2 py-2 font-medium">Média Pares</th>
                          <th className="px-2 py-2 font-medium">Calibragem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PILARES_CULTURAIS.map((pilar) => {
                          const linha = p.pilares[pilar.numero]
                          const chave = `${p.avaliacao_id}-cultural-${pilar.numero}`
                          return (
                            <tr key={pilar.numero} className="border-b border-border/60 last:border-0">
                              <td className="px-4 py-2 text-xs text-foreground">{pilar.numero}. {pilar.titulo}</td>
                              <td className="px-2 py-2"><CelulaScore value={linha?.nota_auto ?? null} /></td>
                              <td className="px-2 py-2"><CelulaScore value={linha?.nota_avaliador ?? null} /></td>
                              <td className="px-2 py-2">
                                <CelulaScore value={linha?.media_pares ?? null} />
                              </td>
                              <td className="px-2 py-2">
                                <CelulaScore
                                  value={linha?.nota_calibragem ?? null}
                                  editable={p.status === 'calibragem'}
                                  onSelect={(v) => salvarCalibragemCultural(p, pilar.numero, v)}
                                />
                                {salvandoCelula === chave && <span className="text-[10px] text-muted-foreground ml-1">salvando…</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {criteriosVertical.length > 0 && (
                    <div className="overflow-x-auto border-t border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground border-b border-border">
                            <th className="px-4 py-2 font-medium">Critério técnico</th>
                            <th className="px-2 py-2 font-medium">Auto</th>
                            <th className="px-2 py-2 font-medium">Avaliador</th>
                            <th className="px-2 py-2 font-medium">Média Pares</th>
                            <th className="px-2 py-2 font-medium">Calibragem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteriosVertical.map((criterio) => {
                            const linha = p.criterios[criterio.key]
                            const chave = `${p.avaliacao_id}-tecnica-${criterio.key}`
                            return (
                              <tr key={criterio.key} className="border-b border-border/60 last:border-0">
                                <td className="px-4 py-2 text-xs text-foreground">{criterio.label}</td>
                                <td className="px-2 py-2"><CelulaScore value={linha?.nota_auto ?? null} /></td>
                                <td className="px-2 py-2"><CelulaScore value={linha?.nota_avaliador ?? null} /></td>
                                <td className="px-2 py-2">
                                  <CelulaScore value={linha?.media_pares ?? null} />
                                </td>
                                <td className="px-2 py-2">
                                  <CelulaScore
                                    value={linha?.nota_calibragem ?? null}
                                    editable={p.status === 'calibragem'}
                                    onSelect={(v) => salvarCalibragemTecnica(p, criterio.key, v)}
                                  />
                                  {salvandoCelula === chave && <span className="text-[10px] text-muted-foreground ml-1">salvando…</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {p.status === 'finalizada' && (
                    <p className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/20 border-t border-border">
                      Ciclo finalizado para esta pessoa — calibragem travada, não pode mais editar.
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
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
