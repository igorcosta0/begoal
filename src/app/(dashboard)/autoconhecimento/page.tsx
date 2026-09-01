'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import { getMeuPerfilEneagrama, getTodosPerfisEneagrama, type PerfilEneagramaComNome } from '@/lib/queries/eneagrama'
import { getTodosCargosPerfil, type FuncionarioCargoPerfil } from '@/lib/queries/cargosPerfil'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'
import { Sparkles, Loader2, Send, ChevronDown, ChevronRight, Wand2 } from 'lucide-react'

interface Mensagem {
  role: 'user' | 'model'
  texto: string
}

const PERGUNTAS_SUGERIDAS = [
  'Como eu me comunico melhor com meu time?',
  'Quais são minhas sombras no trabalho?',
  'Como eu costumo tomar decisões?',
  'Como lido melhor com feedback?',
]

function formatarSequencia(sequencia: string) {
  return sequencia
    .split('/')
    .map((i) => NOME_INSTINTO[i.trim() as Instinto] ?? i.trim())
    .join(' → ')
}

export default function AutoconhecimentoPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  const [loading, setLoading] = useState(true)
  // Protótipo em teste — só quem está em souPilotoAutoconhecimento acessa; pra
  // qualquer outro colaborador da CTZ isso precisa se comportar como se o
  // módulo nem existisse (mesma mensagem genérica de "não disponível").
  const [acessoLiberado, setAcessoLiberado] = useState(false)
  const [tipoNumero, setTipoNumero] = useState<number | null>(null)
  const [subtipoSequencia, setSubtipoSequencia] = useState<string | null>(null)
  const [erroPerfil, setErroPerfil] = useState<string | null>(null)
  // Visão de administrador do protótipo: só preenche de verdade pra quem a
  // RLS (pode_ver_todos_eneagrama_ctz) libera — pra qualquer outra pessoa
  // que por acaso chegasse até aqui, a query volta vazia.
  const [todosPerfis, setTodosPerfis] = useState<PerfilEneagramaComNome[]>([])
  // Cruzamento cargo x Eneagrama (pedido do Igor, 01/09/2026) — mapa por
  // funcionario_id, mesma regra de acesso (RLS só devolve linha pra quem
  // pode_ver_todos_eneagrama_ctz()). Ver ModalCargoEneagrama abaixo.
  const [cargosPerfil, setCargosPerfil] = useState<Record<string, FuncionarioCargoPerfil>>({})
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [erroGeracao, setErroGeracao] = useState<string | null>(null)

  const [pergunta, setPergunta] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erroChat, setErroChat] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctz) {
      setLoading(false)
      return
    }
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const liberado = souPilotoAutoconhecimento(user?.email)
      setAcessoLiberado(liberado)
      if (!liberado || !empresa) {
        setLoading(false)
        return
      }
      const [{ perfil, error }, { perfis, error: erroTodos }, { mapa }] = await Promise.all([
        getMeuPerfilEneagrama(),
        getTodosPerfisEneagrama(empresa.id),
        getTodosCargosPerfil(empresa.id),
      ])
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }
      if (!erroTodos) setTodosPerfis(perfis)
      setCargosPerfil(mapa)
      setLoading(false)
    }
    carregar()
  }, [ctz, empresa?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens, enviando])

  async function enviarPergunta(texto: string) {
    if (!texto.trim() || enviando) return
    setErroChat('')
    const historicoAnterior = mensagens.slice(-8)
    setMensagens((prev) => [...prev, { role: 'user', texto }])
    setPergunta('')
    setEnviando(true)
    try {
      const res = await fetch('/api/assistente-eneagrama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, historico: historicoAnterior }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erro ao consultar o assistente.')
      }
      const data = await res.json()
      setMensagens((prev) => [...prev, { role: 'model', texto: data.resposta }])
    } catch (err) {
      setErroChat(err instanceof Error ? err.message : 'Erro ao consultar o assistente. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function gerarDica(funcionarioId: string) {
    setErroGeracao(null)
    setGerandoId(funcionarioId)
    try {
      const res = await fetch('/api/gerar-dica-cargo-eneagrama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionarioId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Erro ao gerar análise.')
      setCargosPerfil((prev) => ({
        ...prev,
        [funcionarioId]: {
          ...prev[funcionarioId],
          dicas_texto: body.dicas,
          dicas_gerado_em: new Date().toISOString(),
        },
      }))
    } catch (err) {
      setErroGeracao(err instanceof Error ? err.message : 'Erro ao gerar análise.')
    } finally {
      setGerandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-secondary" />
        <div className="h-40 rounded-2xl bg-secondary" />
      </div>
    )
  }

  // Módulo construído só pra CTZ (fonte é o Programa Foco da BeHive, aplicado
  // só lá) e, enquanto é protótipo, só pro piloto (souPilotoAutoconhecimento)
  // — pra qualquer outra pessoa/empresa mostra a mesma mensagem genérica,
  // igual ao padrão de avaliacao/page.tsx, sem entregar pista de que existe
  // uma lista restrita por trás.
  if (!ctz || !acessoLiberado) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  const tipo = tipoNumero ? TIPOS_ENEAGRAMA[tipoNumero] : null

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Autoconhecimento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Seu perfil de Eneagrama e um assistente pra te ajudar a aplicar isso no dia a dia</p>
        </div>
      </div>

      <details className="bg-card border border-border rounded-2xl p-6 group">
        <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex items-center justify-between gap-2">
          <span>Pedido original × o que foi construído (pra validação)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pedido original (áudio do Igor)</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Consolidar toda a documentação num "padrão por tipo" — os 9 arquétipos do Eneagrama, cada um com: como funciona, mecanismo de defesa, forças, sombras.</li>
              <li>Cruzar com a "apostila 2" (competências): como cada tipo comunica, toma decisão e se relaciona.</li>
              <li>Objetivo final, nas palavras do áudio: "criar um assistente que vai responder as pessoas conforme... o tipo daquela pessoa" — a IA se adapta a quem está perguntando.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">O que foi construído</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Base de conhecimento com os 9 tipos padronizados (mecanismo de defesa, forças, sombras, virtude) + as 6 competências de cada um — indo além do pedido original, que citava só comunicação, decisão e relacionamento (também mapeamos feedback, gestão de conflitos e orientação para resultados).</li>
              <li>Extra, também mapeado: os 27 subtipos (instintos), asas e flechas de cada tipo.</li>
              <li>O card acima com o próprio tipo, e o assistente de chat mais abaixo — que responde sempre considerando o tipo de quem está perguntando, resolvido no servidor a partir do login (nunca aceita o tipo vindo do navegador).</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Onde ver cada coisa nesta página</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Pedido do áudio</th>
                    <th className="py-2 font-medium">Onde está nesta página</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">9 arquétipos, cada um com mecanismo de defesa, forças e sombras</td>
                    <td className="py-2">Card &quot;Tipo N — ...&quot; logo abaixo desta seção (mostra o seu; os outros 8 tipos ficam na base de dados, não têm tela própria)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Competências: comunicação, decisão, relacionamento</td>
                    <td className="py-2">Usadas por trás dos panos pra formular as respostas do assistente — não aparecem campo a campo na tela, só refletidas nas respostas do chat</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">&quot;Assistente que responde as pessoas conforme o tipo daquela pessoa&quot;</td>
                    <td className="py-2">Caixa de chat mais abaixo nesta página (só aparece pra quem tem tipo próprio mapeado)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Decisões tomadas durante a construção (não estavam no pedido original)</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Protótipo restrito só a você e à Priscila por enquanto — ninguém mais na CTZ vê este módulo.</li>
              <li>Cada pessoa só veria o próprio tipo, nunca o de outra pessoa — mesmo princípio já usado nas notas de avaliação de desempenho. Vocês dois, como administradores do protótipo, têm uma exceção pra ver o perfil de todo mundo (tabela mais abaixo nesta página), pra conferir se o mapeamento está certo.</li>
              <li>O material mais espiritual/sistêmico sobre os instintos (de outra autora, fora da apostila principal) não entra no tom do assistente por padrão.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ainda não construído / em aberto</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Um modo "como conversar com alguém de um tipo X" (diferente do pedido original — o assistente hoje só fala sobre o tipo de quem pergunta, não orienta sobre como abordar outra pessoa). Ainda não decidido se entra.</li>
            </ul>
          </div>
        </div>
      </details>

      {erroPerfil && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {erroPerfil}
        </div>
      )}

      {tipo ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Tipo {tipo.numero} — {tipo.motivacao}</h2>
            <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{tipo.palavraSintese}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Mecanismo de defesa</p>
              <p className="text-foreground">{tipo.mecanismoDefesa}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Virtude a desenvolver</p>
              <p className="text-foreground">{tipo.virtude}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Suas forças</p>
              <p className="text-foreground">{tipo.forcas}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sua sombra (fica de olho)</p>
              <p className="text-foreground">{tipo.sombra}</p>
            </div>
          </div>
          {subtipoSequencia && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Sequência de instintos: {formatarSequencia(subtipoSequencia)}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-muted-foreground text-sm">Você não tem um perfil de Eneagrama próprio mapeado — normal pra quem administra o sistema. Confira abaixo o perfil de toda a equipe.</p>
        </div>
      )}

      {todosPerfis.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Perfis da equipe (visão de administrador)</h2>
          <p className="text-xs text-muted-foreground">
            Clique numa linha pra ver o cruzamento com o perfil de cargo (competências exigidas e o que o Eneagrama ajuda/atrapalha).
          </p>
          {erroGeracao && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
              {erroGeracao}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium w-6"></th>
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Sequência de instintos</th>
                  <th className="py-2 font-medium">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {todosPerfis.map((p) => {
                  const t = TIPOS_ENEAGRAMA[p.tipo]
                  const cargoInfo = cargosPerfil[p.funcionario_id]
                  const cp = cargoInfo?.cargo_perfil
                  const aberto = expandidoId === p.funcionario_id
                  return (
                    <Fragment key={p.funcionario_id}>
                      <tr
                        onClick={() => setExpandidoId(aberto ? null : p.funcionario_id)}
                        className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/50"
                      >
                        <td className="py-2 pr-4 text-muted-foreground">
                          {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="py-2 pr-4 text-foreground whitespace-nowrap">{p.full_name}</td>
                        <td className="py-2 pr-4 text-foreground whitespace-nowrap">Tipo {p.tipo}{t ? ` — ${t.palavraSintese}` : ''}</td>
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{p.subtipo_sequencia ? formatarSequencia(p.subtipo_sequencia) : '—'}</td>
                        <td className="py-2 text-muted-foreground whitespace-nowrap">
                          {cp ? `${cp.cargo_base}${cp.nivel ? ` (${cp.nivel})` : ''}` : 'sem perfil de cargo mapeado'}
                        </td>
                      </tr>
                      {aberto && (
                        <tr key={`${p.funcionario_id}-detalhe`} className="border-b border-border/50 last:border-0">
                          <td colSpan={5} className="py-4 px-2 bg-secondary/30 rounded-xl">
                            {!cp ? (
                              <p className="text-xs text-muted-foreground">
                                Essa pessoa ainda não tem perfil de cargo mapeado (cargo dela não bate com nenhuma linha
                                preenchida na planilha de cargos, ou é um cargo composto de sócio/CEO) — só o tipo de
                                Eneagrama está disponível.
                              </p>
                            ) : (
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Sumário do cargo</p>
                                    <p className="text-foreground">{cp.sumario}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Autonomia esperada</p>
                                    <p className="text-foreground">{cp.autonomia ?? '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Competências técnicas</p>
                                    <p className="text-foreground whitespace-pre-line">{cp.competencias_tecnicas ?? '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Competências comportamentais</p>
                                    <p className="text-foreground whitespace-pre-line">{cp.competencias_comportamentais ?? '—'}</p>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-border/50">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                      O que o Eneagrama ajuda / atrapalha nesse cargo
                                    </p>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); gerarDica(p.funcionario_id) }}
                                      disabled={gerandoId === p.funcionario_id}
                                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                                    >
                                      {gerandoId === p.funcionario_id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Wand2 className="w-3.5 h-3.5" />}
                                      {cargoInfo?.dicas_texto ? 'Atualizar análise' : 'Gerar análise'}
                                    </button>
                                  </div>
                                  {cargoInfo?.dicas_texto ? (
                                    <>
                                      <p className="text-foreground whitespace-pre-line">{cargoInfo.dicas_texto}</p>
                                      {cargoInfo.dicas_gerado_em && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Gerado em {new Date(cargoInfo.dicas_gerado_em).toLocaleString('pt-BR')}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Ainda não gerada — clique em "Gerar análise".</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tipo && (
        <>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Pergunte ao assistente</h2>

            {mensagens.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {PERGUNTAS_SUGERIDAS.map((p) => (
                  <button
                    key={p}
                    onClick={() => enviarPergunta(p)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:bg-accent transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {mensagens.length > 0 && (
              <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {mensagens.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap',
                      m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    )}
                  >
                    {m.texto}
                  </div>
                ))}
                {enviando && (
                  <div className="bg-secondary text-muted-foreground max-w-[85%] px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
                  </div>
                )}
              </div>
            )}

            {erroChat && <p className="text-xs text-destructive">{erroChat}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                enviarPergunta(pergunta)
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Escreva sua pergunta..."
                disabled={enviando}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={enviando || !pergunta.trim()}
                className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm flex items-center justify-center"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
