'use client'

import { useEffect, useState } from 'react'
import { VERTICAIS_CTZ } from './ModalAvaliacao'
import { verticalDoFuncionario } from '@/lib/queries/avaliacao'
import { Users2, Check, Shuffle, X } from 'lucide-react'

export interface FuncionarioMontagem {
  id: string
  full_name: string
  cargo?: string | null
  setor?: { name: string } | null
  gestor_id?: string | null
}

export interface OpcaoAvaliador {
  id: string
  full_name: string
}

export interface LinhaMontagem {
  funcionario_id: string
  incluir: boolean
  avaliador_id: string
  vertical: string
}

/** Um par (avaliado, avaliador) da Avaliação de Pares — montado à mão pelo admin. */
export interface ParPares {
  funcionario_id: string
  avaliador_id: string
}

interface Props {
  open: boolean
  cicloNome: string
  /** Já vem escopado pela tela (admin/calibrador = empresa toda; gestor comum = só liderados). */
  funcionarios: FuncionarioMontagem[]
  /** Lista completa da empresa, pra poder escalar qualquer pessoa como avaliador — não só o gestor direto. */
  opcoesAvaliador: OpcaoAvaliador[]
  /** Só líderes (funcionarios.lider_avaliacao) — pool de participantes/avaliadores da Avaliação de Pares. */
  lideres: OpcaoAvaliador[]
  /** Pares (avaliado, avaliador) que já existem neste ciclo — mostrados como já incluídos, não dá pra adicionar de novo. */
  paresExistentes?: ParPares[]
  /** Texto do botão de confirmação (ex.: "Confirmar e ativar ciclo" ou "Adicionar ao ciclo"). */
  acaoLabel: string
  confirmando?: boolean
  erro?: string | null
  onClose: () => void
  onConfirmar: (linhas: LinhaMontagem[], pares: ParPares[]) => void
}

export default function ModalMontarAvaliacoes({
  open, cicloNome, funcionarios, opcoesAvaliador, lideres, paresExistentes, acaoLabel, confirmando, erro, onClose, onConfirmar,
}: Props) {
  const [linhas, setLinhas] = useState<Record<string, LinhaMontagem>>({})
  const [paresNovos, setParesNovos] = useState<ParPares[]>([])
  const [parAvaliado, setParAvaliado] = useState('')
  const [parAvaliador, setParAvaliador] = useState('')

  useEffect(() => {
    if (!open) return
    const nomeById = new Map(opcoesAvaliador.map((o) => [o.id, o.full_name]))
    const iniciais: Record<string, LinhaMontagem> = {}
    for (const f of funcionarios) {
      const gestorId = f.gestor_id ?? ''
      iniciais[f.id] = {
        funcionario_id: f.id,
        incluir: true,
        avaliador_id: gestorId,
        vertical: verticalDoFuncionario(f.setor?.name, f.full_name, gestorId ? nomeById.get(gestorId) : undefined) ?? '',
      }
    }
    setLinhas(iniciais)
    setParesNovos([])
    setParAvaliado('')
    setParAvaliador('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, funcionarios])

  if (!open) return null

  function atualizarLinha(id: string, campo: keyof LinhaMontagem, valor: string | boolean) {
    setLinhas((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))
  }

  function marcarTodos(valor: boolean) {
    setLinhas((prev) => {
      const novo = { ...prev }
      for (const id of Object.keys(novo)) novo[id] = { ...novo[id], incluir: valor }
      return novo
    })
  }

  const total = funcionarios.length
  const incluidos = Object.values(linhas).filter((l) => l.incluir).length

  const nomeLider = (id: string) => lideres.find((l) => l.id === id)?.full_name ?? '?'

  const jaExisteNoCiclo = (avaliado: string, avaliador: string) =>
    (paresExistentes ?? []).some((p) => p.funcionario_id === avaliado && p.avaliador_id === avaliador)
  const jaAdicionadoAgora = (avaliado: string, avaliador: string) =>
    paresNovos.some((p) => p.funcionario_id === avaliado && p.avaliador_id === avaliador)

  function adicionarPar() {
    if (!parAvaliado || !parAvaliador || parAvaliado === parAvaliador) return
    if (jaExisteNoCiclo(parAvaliado, parAvaliador) || jaAdicionadoAgora(parAvaliado, parAvaliador)) return
    setParesNovos((prev) => [...prev, { funcionario_id: parAvaliado, avaliador_id: parAvaliador }])
    setParAvaliador('')
  }

  function removerPar(index: number) {
    setParesNovos((prev) => prev.filter((_, i) => i !== index))
  }

  function handleConfirmar() {
    onConfirmar(Object.values(linhas), paresNovos)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Users2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Montar avaliações</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cicloNome} — escolha quem participa, quem avalia cada um e a vertical. Tudo pode ser ajustado depois, avaliação por avaliação.
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Avaliação comum */}
          {total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum funcionário disponível pra adicionar a este ciclo.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {incluidos} de {total} selecionado{total !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => marcarTodos(true)} className="text-[11px] text-primary hover:underline">Marcar todos</button>
                  <button onClick={() => marcarTodos(false)} className="text-[11px] text-muted-foreground hover:underline">Desmarcar todos</button>
                </div>
              </div>

              {/* Cabeçalho das colunas — "Avaliador" é quem vai preencher a avaliação
                  dessa pessoa (aparece só pra ele em "Devo Avaliar"), não precisa
                  ser o gestor direto no organograma. */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_1fr] gap-3 px-3">
                <span />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Profissional</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Avaliador</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Vertical</span>
              </div>

              {funcionarios.map((f) => {
                const linha = linhas[f.id]
                if (!linha) return null
                return (
                  <div
                    key={f.id}
                    className={`grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-3 rounded-xl border border-border p-3 transition-opacity ${!linha.incluir ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={linha.incluir}
                      onChange={(e) => atualizarLinha(f.id, 'incluir', e.target.checked)}
                      className="w-4 h-4 rounded border-input accent-primary"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{f.full_name}</p>
                      {f.cargo && <p className="text-[10px] text-muted-foreground truncate">{f.cargo}</p>}
                    </div>
                    <select
                      value={linha.avaliador_id}
                      onChange={(e) => atualizarLinha(f.id, 'avaliador_id', e.target.value)}
                      disabled={!linha.incluir}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Sem avaliador definido</option>
                      {opcoesAvaliador.map((o) => (
                        <option key={o.id} value={o.id}>{o.full_name}{o.id === f.id ? ' (a própria pessoa)' : ''}</option>
                      ))}
                    </select>
                    <select
                      value={linha.vertical}
                      onChange={(e) => atualizarLinha(f.id, 'vertical', e.target.value)}
                      disabled={!linha.incluir}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Selecionar depois</option>
                      {Object.entries(VERTICAIS_CTZ).map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Avaliação de Pares */}
          <div className="pt-5 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Shuffle className="w-3.5 h-3.5 text-violet-600" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Avaliação de Pares</h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Só entre líderes, só Alinhamento Cultural (sem metas técnicas). Escolha quem avalia quem — pode distribuir como quiser, inclusive mais de um avaliador pra mesma pessoa. Ninguém faz autoavaliação aqui: a avaliação de pares é só a nota do colega.
            </p>

            {lideres.length < 2 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3 py-3 text-center">
                Precisa de pelo menos 2 líderes marcados em &quot;Gerenciar Líderes&quot; pra habilitar a Avaliação de Pares.
              </p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={parAvaliado}
                    onChange={(e) => setParAvaliado(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Quem será avaliado...</option>
                    {lideres.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                  </select>
                  <select
                    value={parAvaliador}
                    onChange={(e) => setParAvaliador(e.target.value)}
                    disabled={!parAvaliado}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="">Quem avalia...</option>
                    {lideres.filter((l) => l.id !== parAvaliado).map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={adicionarPar}
                    disabled={!parAvaliado || !parAvaliador || jaExisteNoCiclo(parAvaliado, parAvaliador) || jaAdicionadoAgora(parAvaliado, parAvaliador)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    + Adicionar
                  </button>
                </div>

                {(paresExistentes?.length ?? 0) + paresNovos.length > 0 && (
                  <ul className="space-y-1.5">
                    {(paresExistentes ?? []).map((p, i) => (
                      <li key={`existente-${i}`} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-border bg-muted/30 px-3 py-1.5 opacity-60">
                        <span>{nomeLider(p.funcionario_id)} será avaliado por {nomeLider(p.avaliador_id)}</span>
                        <span className="text-[10px] shrink-0">já no ciclo</span>
                      </li>
                    ))}
                    {paresNovos.map((p, i) => (
                      <li key={`novo-${i}`} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5">
                        <span>{nomeLider(p.funcionario_id)} será avaliado por {nomeLider(p.avaliador_id)}</span>
                        <button type="button" onClick={() => removerPar(i)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
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
            disabled={confirmando}
            className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            {confirmando
              ? 'Salvando...'
              : `${acaoLabel}${total > 0 ? ` (${incluidos} comum${paresNovos.length > 0 ? ` + ${paresNovos.length} pares` : ''})` : paresNovos.length > 0 ? ` (${paresNovos.length} pares)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
