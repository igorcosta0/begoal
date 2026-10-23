'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Library, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getPerguntas, ROTULO_TIPO, salvarPesquisa, sugerirPerguntasIa, tipoComOpcoes, TIPOS_PERGUNTA,
  type ModeloPesquisa, type Pergunta, type Pesquisa, type PerguntaRascunho, type PublicoPesquisa, type Respostas, type TipoPergunta,
} from '@/lib/queries/pesquisas'
import { BANCO_PERGUNTAS, comEmpresa, MODELO_EM_BRANCO, MODELOS, NOME_MODELO } from '@/lib/pesquisaModelos'
import FormularioPesquisa from '@/components/pesquisa/FormularioPesquisa'

// Criação guiada, em etapas (guia do Miro, 23/10/2026: F13 e F15), pensada
// para quem nunca montou uma pesquisa: 1) escolher um modelo (F08–F12) ou
// começar do zero, 2) título e público, 3) perguntas (banco F16, próprias F17,
// IA F18), 4) revisar como a pessoa vai ver.
//
// Só edita pesquisa em rascunho: depois de publicada, as perguntas ficam
// travadas (o banco também barra) pra não misturar respostas de versões diferentes.

const inputCls = 'mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const ETAPAS = ['Modelo', 'Informações', 'Perguntas', 'Revisão'] as const

const PERGUNTA_NOVA: PerguntaRascunho = { tipo: 'escala_0_10', enunciado: '', opcoes: [], obrigatoria: true }

interface Props {
  open: boolean
  clientId: string
  empresaNome: string
  pesquisa: Pesquisa | null // null = nova
  onClose: () => void
  onSuccess: () => void
}

const mesmoTexto = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export default function ModalEditarPesquisa({ open, clientId, empresaNome, pesquisa, onClose, onSuccess }: Props) {
  const [etapa, setEtapa] = useState(0)
  const [modelo, setModelo] = useState<ModeloPesquisa | null>(null)
  const [modeloAplicado, setModeloAplicado] = useState<ModeloPesquisa | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [publico, setPublico] = useState<PublicoPesquisa>('externa')
  const [perguntas, setPerguntas] = useState<PerguntaRascunho[]>([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Painel de ajuda na etapa de perguntas
  const [painel, setPainel] = useState<'banco' | 'ia' | null>(null)
  const [tema, setTema] = useState(BANCO_PERGUNTAS[0].tema)
  const [objetivo, setObjetivo] = useState('')
  const [gerando, setGerando] = useState(false)
  const [sugestoes, setSugestoes] = useState<PerguntaRascunho[]>([])
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set())
  const [erroIa, setErroIa] = useState<string | null>(null)

  // Revisão: deixa testar o formulário sem gravar nada
  const [respostasTeste, setRespostasTeste] = useState<Respostas>({})

  useEffect(() => {
    if (!open) return
    setErro(null)
    setPainel(null)
    setSugestoes([])
    setMarcadas(new Set())
    setErroIa(null)
    setObjetivo('')
    setRespostasTeste({})
    if (!pesquisa) {
      setEtapa(0)
      setModelo(null)
      setModeloAplicado(null)
      setTitulo('')
      setDescricao('')
      setPublico('externa')
      setPerguntas([])
      return
    }
    setEtapa(1)
    setModelo(pesquisa.modelo)
    setModeloAplicado(pesquisa.modelo)
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

  const comNome = (q: PerguntaRascunho) => comEmpresa(q, empresaNome)
  const jaTem = (enunciado: string) => perguntas.some((p) => mesmoTexto(p.enunciado, enunciado))

  function aplicarModelo(id: ModeloPesquisa) {
    if (id === modeloAplicado) return
    const m = MODELOS.find((x) => x.id === id)
    setModeloAplicado(id)
    setRespostasTeste({})
    if (!m) {
      setTitulo('')
      setDescricao('')
      setPerguntas([])
      return
    }
    setTitulo(m.titulo)
    setDescricao(m.descricao.split('{empresa}').join(empresaNome))
    setPublico(m.publico)
    setPerguntas(m.perguntas.map(comNome))
  }

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

  function validarPerguntas(): string | null {
    if (!perguntas.length) return 'Adicione pelo menos uma pergunta.'
    for (let i = 0; i < perguntas.length; i++) {
      const q = perguntas[i]
      if (!q.enunciado.trim()) return `A pergunta ${i + 1} está sem enunciado.`
      if (tipoComOpcoes(q.tipo)) {
        const ops = q.opcoes.map((o) => o.trim()).filter(Boolean)
        if (ops.length < 2) return `A pergunta ${i + 1} precisa de pelo menos 2 opções.`
        if (new Set(ops).size !== ops.length) return `A pergunta ${i + 1} tem opções repetidas.`
      }
    }
    return null
  }

  function validarEtapa(e: number): string | null {
    if (e === 0 && !modelo) return 'Escolha um modelo ou "Começar do zero".'
    if (e === 1 && !titulo.trim()) return 'Informe o título.'
    if (e === 2) return validarPerguntas()
    return null
  }

  function avancar() {
    const problema = validarEtapa(etapa)
    if (problema) return setErro(problema)
    setErro(null)
    if (etapa === 0 && modelo) aplicarModelo(modelo)
    setEtapa((e) => e + 1)
  }

  async function gerarSugestoes() {
    if (!objetivo.trim()) return setErroIa('Conte em uma frase o que você quer descobrir.')
    setErroIa(null)
    setGerando(true)
    const { data, error } = await sugerirPerguntasIa({
      objetivo, publico, empresa: empresaNome, existentes: perguntas.map((q) => q.enunciado),
    })
    setGerando(false)
    if (error) return setErroIa(error)
    setSugestoes(data)
    setMarcadas(new Set(data.map((_, i) => i)))
  }

  function adicionarSugestoes() {
    setPerguntas((qs) => [...qs, ...sugestoes.filter((_, i) => marcadas.has(i)).filter((s) => !qs.some((q) => mesmoTexto(q.enunciado, s.enunciado)))])
    setSugestoes([])
    setMarcadas(new Set())
    setPainel(null)
  }

  async function salvar() {
    const problema = validarEtapa(1) ?? validarPerguntas()
    if (problema) return setErro(problema)
    setErro(null)
    setSalvando(true)
    const { error } = await salvarPesquisa({
      id: pesquisa?.id ?? null, clientId, titulo, descricao, publico, modelo: modeloAplicado ?? 'personalizada', perguntas,
    })
    setSalvando(false)
    if (error) return setErro(error)
    onSuccess()
  }

  const primeiraEtapa = pesquisa ? 1 : 0
  const previa: Pergunta[] = perguntas.map((q, i) => ({ ...q, id: `previa-${i}`, opcoes: q.opcoes.map((o) => o.trim()).filter(Boolean) }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">{pesquisa ? 'Editar pesquisa' : 'Nova pesquisa'}</h2>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ol className="mt-4 flex items-center gap-2">
            {ETAPAS.map((nome, i) => {
              const feita = i < etapa
              const atual = i === etapa
              const clicavel = i < etapa && i >= primeiraEtapa
              return (
                <li key={nome} className="flex items-center gap-2 flex-1 min-w-0 last:flex-none">
                  <button
                    type="button"
                    disabled={!clicavel}
                    onClick={() => { setErro(null); setEtapa(i) }}
                    className={cn('flex items-center gap-1.5 min-w-0', clicavel && 'hover:opacity-80', i < primeiraEtapa && 'opacity-40')}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border',
                        atual ? 'bg-primary text-primary-foreground border-primary'
                          : feita ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-background text-muted-foreground border-border'
                      )}
                    >
                      {feita ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <span className={cn('text-xs font-medium truncate hidden sm:inline', atual ? 'text-foreground' : 'text-muted-foreground')}>{nome}</span>
                  </button>
                  {i < ETAPAS.length - 1 && <span className="h-px flex-1 bg-border min-w-3" />}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* 1. Modelo */}
          {etapa === 0 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Que tipo de pesquisa você quer fazer?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Os modelos já vêm com perguntas prontas. Você pode mudar tudo nas próximas etapas.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...MODELOS, MODELO_EM_BRANCO].map((m) => {
                  const qtd = 'perguntas' in m ? m.perguntas.length : 0
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setModelo(m.id); setErro(null) }}
                      className={cn(
                        'flex flex-col text-left rounded-xl border p-3.5 transition-colors',
                        modelo === m.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                        {qtd > 0 && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{qtd} perguntas</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{m.quando}</p>
                    </button>
                  )
                })}
              </div>
              {modeloAplicado && modelo && modelo !== modeloAplicado && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Trocar o modelo substitui o título, a mensagem e as perguntas que você já montou.
                </p>
              )}
            </div>
          )}

          {/* 2. Informações */}
          {etapa === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Título *</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Pesquisa de satisfação 2026" className={inputCls} />
                <p className="text-[11px] text-muted-foreground mt-1">É o nome que aparece para quem vai responder.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Mensagem de abertura</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Explique em poucas palavras por que a pesquisa existe e quanto tempo leva." className={cn(inputCls, 'resize-y')} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Quem vai responder?</label>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    ['interna', 'Funcionários', 'Respondem logados no Begoal. As respostas são anônimas.'],
                    ['externa', 'Clientes', 'Recebem um link. Informam e-mail, nome e empresa antes de responder.'],
                  ] as const).map(([v, label, desc]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPublico(v)}
                      className={cn(
                        'flex flex-col text-left rounded-xl border p-3 transition-colors',
                        publico === v ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary'
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Perguntas */}
          {etapa === 2 && (
            carregando ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ['banco', Library, 'Banco de perguntas', 'Escolha perguntas prontas'],
                    ['ia', Sparkles, 'Pedir ajuda à IA', 'Diga o objetivo, ela sugere'],
                  ] as const).map(([id, Icon, label, desc]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPainel((p) => (p === id ? null : id))}
                      className={cn(
                        'flex items-start gap-2.5 text-left rounded-xl border p-3 transition-colors',
                        painel === id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary'
                      )}
                    >
                      <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setPainel(null); setPerguntas((qs) => [...qs, { ...PERGUNTA_NOVA }]) }}
                    className="flex items-start gap-2.5 text-left rounded-xl border border-border p-3 hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Escrever pergunta</span>
                      <span className="block text-xs text-muted-foreground">Crie a sua do zero</span>
                    </span>
                  </button>
                </div>

                {painel === 'banco' && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {BANCO_PERGUNTAS.map((t) => (
                        <button
                          key={t.tema}
                          type="button"
                          onClick={() => setTema(t.tema)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                            tema === t.tema ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t.tema}
                        </button>
                      ))}
                    </div>
                    <ul className="space-y-1.5">
                      {BANCO_PERGUNTAS.find((t) => t.tema === tema)?.perguntas.map((q0) => {
                        const q = comNome(q0)
                        const tem = jaTem(q.enunciado)
                        return (
                          <li key={q.enunciado} className="flex items-center gap-3 rounded-lg bg-background border border-border px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-foreground">{q.enunciado}</p>
                              <p className="text-[11px] text-muted-foreground">{ROTULO_TIPO[q.tipo]}</p>
                            </div>
                            <button
                              type="button"
                              disabled={tem}
                              onClick={() => setPerguntas((qs) => [...qs, q])}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                              {tem ? <><Check className="w-3.5 h-3.5" /> Adicionada</> : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {painel === 'ia' && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">O que você quer descobrir com esta pesquisa?</label>
                      <textarea
                        value={objetivo}
                        onChange={(e) => setObjetivo(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="Ex: entender por que o time comercial está desmotivado depois da mudança de metas"
                        className={cn(inputCls, 'resize-y')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={gerarSugestoes}
                        disabled={gerando}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> {gerando ? 'Gerando...' : sugestoes.length ? 'Gerar de novo' : 'Gerar sugestões'}
                      </button>
                      <span className="text-[11px] text-muted-foreground">Você escolhe quais entram.</span>
                    </div>
                    {erroIa && <p className="text-xs text-red-600">{erroIa}</p>}
                    {sugestoes.length > 0 && (
                      <>
                        <ul className="space-y-1.5">
                          {sugestoes.map((q, i) => (
                            <li key={i}>
                              <label className="flex items-start gap-2.5 rounded-lg bg-background border border-border px-3 py-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={marcadas.has(i)}
                                  onChange={(e) => setMarcadas((m) => { const n = new Set(m); if (e.target.checked) n.add(i); else n.delete(i); return n })}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm text-foreground">{q.enunciado}</span>
                                  <span className="block text-[11px] text-muted-foreground">
                                    {ROTULO_TIPO[q.tipo]}{q.opcoes.length > 0 && `: ${q.opcoes.join(' · ')}`}
                                  </span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={adicionarSugestoes}
                          disabled={!marcadas.size}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar {marcadas.size} {marcadas.size === 1 ? 'pergunta' : 'perguntas'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-foreground mb-2">
                    Perguntas da pesquisa <span className="text-muted-foreground font-normal">({perguntas.length})</span>
                  </p>
                  {perguntas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Nenhuma pergunta ainda. Use uma das opções acima para começar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {perguntas.map((q, i) => {
                        const tipos = TIPOS_PERGUNTA.some((t) => t.value === q.tipo)
                          ? TIPOS_PERGUNTA
                          : [...TIPOS_PERGUNTA, { value: q.tipo, label: ROTULO_TIPO[q.tipo], ajuda: 'Tipo antigo: continua funcionando, mas não é mais oferecido.' }]
                        return (
                          <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                              <select
                                value={q.tipo}
                                onChange={(e) => {
                                  const tipo = e.target.value as TipoPergunta
                                  atualizar(i, { tipo, opcoes: tipoComOpcoes(tipo) && q.opcoes.length === 0 ? ['', ''] : q.opcoes })
                                }}
                                className="min-w-0 flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                {tipos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1 shrink-0">
                                <input type="checkbox" checked={q.obrigatoria} onChange={(e) => atualizar(i, { obrigatoria: e.target.checked })} />
                                Obrigatória
                              </label>
                              <div className="ml-auto flex items-center gap-0.5 shrink-0">
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
                            <p className="text-[11px] text-muted-foreground pl-7">{tipos.find((t) => t.value === q.tipo)?.ajuda}</p>
                            <input
                              value={q.enunciado}
                              onChange={(e) => atualizar(i, { enunciado: e.target.value })}
                              placeholder="Escreva a pergunta..."
                              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            {tipoComOpcoes(q.tipo) && (
                              <div className="space-y-1.5 pl-7">
                                {q.opcoes.map((op, k) => (
                                  <div key={k} className="flex items-center gap-1.5">
                                    <span className={cn('w-3 h-3 border border-muted-foreground/50 shrink-0', q.tipo === 'multipla' ? 'rounded-full' : 'rounded-sm')} />
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
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* 4. Revisão */}
          {etapa === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['Modelo', NOME_MODELO[modeloAplicado ?? 'personalizada']],
                  ['Quem responde', publico === 'interna' ? 'Funcionários (anônima)' : 'Clientes (link)'],
                  ['Perguntas', String(perguntas.length)],
                ] as const).map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{rotulo}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{valor}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  É assim que a pesquisa vai aparecer. Pode clicar à vontade: nada aqui é gravado como resposta.
                </p>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-lg font-semibold text-foreground">{titulo}</p>
                  {descricao.trim() && <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{descricao}</p>}
                  <div className="mt-4">
                    <FormularioPesquisa perguntas={previa} respostas={respostasTeste} onChange={setRespostasTeste} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A pesquisa fica salva como rascunho. Ela só vai para as pessoas quando você clicar em &quot;Publicar&quot; no card.
              </p>
            </div>
          )}

          {erro && <div className="mt-4 px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setErro(null)
              if (etapa > primeiraEtapa) setEtapa((e) => e - 1)
              else onClose()
            }}
            className="px-4 py-2 text-sm rounded-xl border border-border text-foreground hover:bg-secondary"
          >
            {etapa > primeiraEtapa ? 'Voltar' : 'Cancelar'}
          </button>
          {etapa < ETAPAS.length - 1 ? (
            <button
              type="button"
              onClick={avancar}
              disabled={carregando}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60"
            >
              Avançar
            </button>
          ) : (
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || carregando}
              className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
