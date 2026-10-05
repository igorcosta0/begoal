'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getPerguntas, salvarPesquisa, TIPOS_PERGUNTA,
  type Pesquisa, type PerguntaRascunho, type PublicoPesquisa, type TipoPergunta,
} from '@/lib/queries/pesquisas'

const inputCls = 'mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const PERGUNTA_NOVA: PerguntaRascunho = { tipo: 'nota_1_5', enunciado: '', opcoes: [], obrigatoria: true }

// Sugestão inicial de uma pesquisa nova (pode apagar/editar tudo).
const MODELO_INICIAL: PerguntaRascunho[] = [
  { tipo: 'nps', enunciado: 'De 0 a 10, quanto você recomendaria a CTZ a um amigo ou colega?', opcoes: [], obrigatoria: true },
  { tipo: 'nota_1_5', enunciado: 'Qual o seu nível de satisfação geral?', opcoes: [], obrigatoria: true },
  { tipo: 'texto', enunciado: 'O que podemos melhorar?', opcoes: [], obrigatoria: false },
]

interface Props {
  open: boolean
  clientId: string
  pesquisa: Pesquisa | null // null = nova
  onClose: () => void
  onSuccess: () => void
}

// Só edita pesquisa em rascunho: depois de publicada, as perguntas ficam
// travadas (o banco também barra) pra não misturar respostas de versões diferentes.
export default function ModalEditarPesquisa({ open, clientId, pesquisa, onClose, onSuccess }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [publico, setPublico] = useState<PublicoPesquisa>('externa')
  const [perguntas, setPerguntas] = useState<PerguntaRascunho[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    if (!pesquisa) {
      setTitulo('')
      setDescricao('')
      setPublico('externa')
      setPerguntas(MODELO_INICIAL.map((q) => ({ ...q })))
      return
    }
    setTitulo(pesquisa.titulo)
    setDescricao(pesquisa.descricao ?? '')
    setPublico(pesquisa.publico)
    setCarregando(true)
    getPerguntas(pesquisa.id).then(({ data, error }) => {
      setCarregando(false)
      if (error) setErro(error)
      setPerguntas(data.map(({ tipo, enunciado, opcoes, obrigatoria }) => ({ tipo, enunciado, opcoes, obrigatoria })))
    })
  }, [open, pesquisa])

  if (!open) return null

  function atualizar(i: number, mudanca: Partial<PerguntaRascunho>) {
    setPerguntas((qs) => qs.map((q, j) => (j === i ? { ...q, ...mudanca } : q)))
  }

  function mover(i: number, delta: number) {
    setPerguntas((qs) => {
      const j = i + delta
      if (j < 0 || j >= qs.length) return qs
      const novo = [...qs]
      ;[novo[i], novo[j]] = [novo[j], novo[i]]
      return novo
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!titulo.trim()) return setErro('Informe o título.')
    if (!perguntas.length) return setErro('Adicione pelo menos uma pergunta.')
    for (let i = 0; i < perguntas.length; i++) {
      const q = perguntas[i]
      if (!q.enunciado.trim()) return setErro(`A pergunta ${i + 1} está sem enunciado.`)
      if (q.tipo === 'multipla') {
        const ops = q.opcoes.map((o) => o.trim()).filter(Boolean)
        if (ops.length < 2) return setErro(`A pergunta ${i + 1} precisa de pelo menos 2 opções.`)
        if (new Set(ops).size !== ops.length) return setErro(`A pergunta ${i + 1} tem opções repetidas.`)
      }
    }
    setSalvando(true)
    const { error } = await salvarPesquisa({ id: pesquisa?.id ?? null, clientId, titulo, descricao, publico, perguntas })
    setSalvando(false)
    if (error) return setErro(error)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-foreground">{pesquisa ? 'Editar pesquisa' : 'Nova pesquisa'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Pesquisa de satisfação 2026" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Mensagem de abertura</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Aparece no topo da pesquisa para quem for responder." className={cn(inputCls, 'resize-y')} />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Para quem</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([
                ['externa', 'Clientes (externa)', 'Link público. A pessoa informa e-mail, nome e empresa.'],
                ['interna', 'Funcionários (interna)', 'Responde logado no Begoal. Respostas anônimas.'],
              ] as const).map(([v, label, desc]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPublico(v)}
                  className={cn(
                    'text-left rounded-xl border p-3 transition-colors',
                    publico === v ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground mb-2">Perguntas</p>
            {carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-3">
                {perguntas.map((q, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                      <select
                        value={q.tipo}
                        onChange={(e) => {
                          const tipo = e.target.value as TipoPergunta
                          atualizar(i, { tipo, opcoes: tipo === 'multipla' && q.opcoes.length === 0 ? ['', ''] : q.opcoes })
                        }}
                        className="px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIPOS_PERGUNTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                        <input type="checkbox" checked={q.obrigatoria} onChange={(e) => atualizar(i, { obrigatoria: e.target.checked })} />
                        Obrigatória
                      </label>
                      <div className="ml-auto flex items-center gap-0.5">
                        <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Subir">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => mover(i, 1)} disabled={i === perguntas.length - 1} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label="Descer">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setPerguntas((qs) => qs.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remover pergunta">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={q.enunciado}
                      onChange={(e) => atualizar(i, { enunciado: e.target.value })}
                      placeholder="Escreva a pergunta..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {q.tipo === 'multipla' && (
                      <div className="space-y-1.5 pl-7">
                        {q.opcoes.map((op, k) => (
                          <div key={k} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-muted-foreground/50 shrink-0" />
                            <input
                              value={op}
                              onChange={(e) => atualizar(i, { opcoes: q.opcoes.map((o, m) => (m === k ? e.target.value : o)) })}
                              placeholder={`Opção ${k + 1}`}
                              className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <button type="button" onClick={() => atualizar(i, { opcoes: q.opcoes.filter((_, m) => m !== k) })} className="p-1 rounded text-muted-foreground hover:text-red-600" aria-label="Remover opção">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => atualizar(i, { opcoes: [...q.opcoes, ''] })} className="text-xs font-medium text-primary hover:underline">
                          + Adicionar opção
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPerguntas((qs) => [...qs, { ...PERGUNTA_NOVA }])}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Plus className="w-4 h-4" /> Adicionar pergunta
                </button>
              </div>
            )}
          </div>

          {erro && <div className="px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border text-foreground hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={salvando || carregando} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60">
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
