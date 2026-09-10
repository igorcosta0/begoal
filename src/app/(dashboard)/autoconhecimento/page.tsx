'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import {
  getMeuPerfilEneagrama,
  getTodosPerfisEneagrama,
  getSouLiderDeAlguem,
  getColegasComPerfilMapeado,
  getMeusLideradosComPerfilMapeado,
  type PerfilEneagramaComNome,
  type ColegaComPerfilMapeado,
} from '@/lib/queries/eneagrama'
import { getTodosCargosPerfil, type FuncionarioCargoPerfil } from '@/lib/queries/cargosPerfil'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'
import { Sparkles, Loader2, Send, ChevronDown, ChevronRight, Wand2, Crown, Handshake } from 'lucide-react'

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

// Situações de exemplo pro chat "Relacionando com o time" — só ilustram o
// tipo de pergunta, não são enviadas literalmente sem edição (o campo já vem
// preenchido, a pessoa ajusta antes de mandar).
const SITUACOES_SUGERIDAS = [
  'Preciso dar um feedback sobre um atraso recorrente em entregas.',
  'Preciso pedir pra essa pessoa assumir uma responsabilidade nova.',
  'Preciso alinhar uma expectativa que não está sendo cumprida.',
]

// Mesma ideia, mas com o vocabulário de quem lidera (delegação,
// desenvolvimento, decisão) em vez de colega pra colega.
const SITUACOES_SUGERIDAS_LIDERANCA = [
  'Preciso delegar uma responsabilidade nova pra essa pessoa.',
  'Preciso dar um feedback de desenvolvimento, não só de desempenho.',
  'Como conduzo uma decisão que essa pessoa provavelmente não vai gostar?',
]

function formatarSequencia(sequencia: string) {
  return sequencia
    .split('/')
    .map((i) => NOME_INSTINTO[i.trim() as Instinto] ?? i.trim())
    .join(' → ')
}

// Bloco de chat reaproveitado pelos Mapas 2 e 3 — a única diferença entre
// "Liderando o time" e "Relacionando com o time" é a lista de pessoas, a
// rota de API chamada e o texto de apresentação; a mecânica de conversa
// (seleção de pessoa, sugestões, histórico, envio) é idêntica.
function ChatSobreOutraPessoa({
  pessoas,
  placeholder,
  situacoesSugeridas,
  endpoint,
}: {
  pessoas: ColegaComPerfilMapeado[]
  placeholder: string
  situacoesSugeridas: string[]
  endpoint: string
}) {
  const [alvoId, setAlvoId] = useState('')
  const [situacao, setSituacao] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens, enviando])

  function selecionarAlvo(id: string) {
    setAlvoId(id)
    setMensagens([])
    setErro('')
  }

  async function enviar(texto: string) {
    if (!texto.trim() || enviando || !alvoId) return
    setErro('')
    const historicoAnterior = mensagens.slice(-8)
    setMensagens((prev) => [...prev, { role: 'user', texto }])
    setSituacao('')
    setEnviando(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionarioAlvoId: alvoId, situacao: texto, historico: historicoAnterior }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Erro ao consultar o assistente.')
      }
      const data = await res.json()
      setMensagens((prev) => [...prev, { role: 'model', texto: data.resposta }])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar o assistente. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <select
        value={alvoId}
        onChange={(e) => selecionarAlvo(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">{placeholder}</option>
        {[...pessoas]
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
          .map((p) => (
            <option key={p.funcionario_id} value={p.funcionario_id}>
              {p.full_name}
            </option>
          ))}
      </select>

      {alvoId && (
        <>
          {mensagens.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {situacoesSugeridas.map((s) => (
                <button
                  key={s}
                  onClick={() => setSituacao(s)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:bg-accent transition-colors text-left"
                >
                  {s}
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

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              enviar(situacao)
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              placeholder="Descreva a situação..."
              disabled={enviando}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={enviando || !situacao.trim()}
              className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm flex items-center justify-center"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function AutoconhecimentoPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  const [loading, setLoading] = useState(true)
  const [tipoNumero, setTipoNumero] = useState<number | null>(null)
  const [subtipoSequencia, setSubtipoSequencia] = useState<string | null>(null)
  const [erroPerfil, setErroPerfil] = useState<string | null>(null)

  // Mapa 2 "Liderando o time": só aparece pra quem tem liderado direto no
  // organograma (funcionarios.gestor_id) — ver sou_lider_de_alguem() no
  // banco (migration PENDENTE_20260910010000). Fala do tipo de OUTRA
  // pessoa (o liderado), então só é carregado/mostrado pra quem também é
  // souAdminPiloto (ver decisão abaixo).
  const [souLider, setSouLider] = useState(false)
  const [liderados, setLiderados] = useState<ColegaComPerfilMapeado[]>([])
  // Mapa 3 "Relacionando com o time": qualquer colega da mesma empresa com
  // tipo mapeado. Mesmo raciocínio do Mapa 2 — só carregado/mostrado pra
  // souAdminPiloto.
  const [colegas, setColegas] = useState<ColegaComPerfilMapeado[]>([])

  // Visão de administrador do PROTÓTIPO — controla 2 coisas diferentes desde
  // 10/09/2026: (1) a tabela "Perfis da equipe"/cruzamento cargo x Eneagrama
  // de sempre, e (2) agora também os Mapas 2 e 3 (que falam do tipo de OUTRA
  // pessoa, não só de quem pergunta). O Mapa 1 já graduou pra CTZ inteira —
  // só ele não depende desta flag. Decisão do Igor: mesmo com a trava técnica
  // funcionando (o tipo de terceiros nunca é devolvido ao navegador), abrir
  // 2 e 3 geral ainda não foi testado com uso real de mais gente, então
  // ficam junto do piloto por enquanto.
  const [souAdminPiloto, setSouAdminPiloto] = useState(false)
  const [todosPerfis, setTodosPerfis] = useState<PerfilEneagramaComNome[]>([])
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
      if (!user || !empresa) {
        setLoading(false)
        return
      }
      const piloto = souPilotoAutoconhecimento(user.email)
      setSouAdminPiloto(piloto)

      const { perfil, error } = await getMeuPerfilEneagrama()
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }

      // Mapas 2 e 3 falam do tipo de OUTRA pessoa (não só de quem pergunta,
      // como o Mapa 1) — pedido explícito do Igor (10/09/2026) pra manter
      // isso restrito a Igor/Priscila por enquanto, mesmo com a trava
      // técnica funcionando (a rede de segurança do prompt nunca foi testada
      // com uso real de mais gente). Por isso só busca colegas/liderados
      // quando é piloto — pra qualquer outra pessoa nem vale disparar a
      // chamada, já que as rotas de API dos Mapas 2/3 também recusam
      // (403) quem não é piloto.
      if (piloto) {
        const [{ souLider: liderDeAlguem }, { colegas: colegasMapeados }, { perfis, error: erroTodos }, { mapa }] = await Promise.all([
          getSouLiderDeAlguem(),
          getColegasComPerfilMapeado(),
          getTodosPerfisEneagrama(empresa.id),
          getTodosCargosPerfil(empresa.id),
        ])
        setSouLider(liderDeAlguem)
        setColegas(colegasMapeados)
        if (liderDeAlguem) {
          getMeusLideradosComPerfilMapeado().then(({ liderados: l }) => setLiderados(l))
        }
        if (!erroTodos) setTodosPerfis(perfis)
        setCargosPerfil(mapa)
      }
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
  // só lá). Graduou de "só piloto" pra "toda a CTZ" em 10/09/2026 — a visão
  // de administrador do protótipo (Perfis da equipe/cruzamento cargo)
  // continua restrita mais abaixo, dentro da própria página.
  if (!ctz) {
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
          <p className="text-sm text-muted-foreground mt-0.5">
            3 mapas baseados no seu perfil de Eneagrama: Autoliderança, Liderando o time e Relacionando com o time
          </p>
        </div>
      </div>

      <details className="bg-card border border-border rounded-2xl p-6 group">
        <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex items-center justify-between gap-2">
          <span>Pedido original × o que foi construído (pra validação)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pedido (10/09/2026)</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Subir a metodologia de "Adições futuras/Abordagem .pdf" (pitch da BeHive: EU/Autoliderança e NÓS/Liderança de pessoas) e criar 3 mapas: Autoliderança (todos), Liderando o time (só líderes) e Relacionando com o time (todos).</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">O que foi construído</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li><strong>Mapa 1 · Autoliderança</strong>: o card do seu tipo + o chat "Pergunte ao assistente" logo abaixo — já existiam desde 31/08, reenquadrados aqui como o Mapa 1 do PDF. Só fala do tipo de quem pergunta, nunca de terceiros — por isso é o único já aberto pra CTZ inteira.</li>
              <li><strong>Mapa 2 · Liderando o time</strong>: novo — o líder escolhe um dos seus liderados diretos (organograma) e recebe orientação de liderança (delegação, desenvolvimento, decisão, feedback, conflito) pra ele, sem nunca ver o tipo dele.</li>
              <li><strong>Mapa 3 · Relacionando com o time</strong>: era "Como abordar um colega" (09/09/2026), reenquadrado como Mapa 3 — mesma mecânica, escolhendo qualquer colega da empresa com tipo mapeado.</li>
              <li>Acesso (decisão de 10/09/2026, depois de avaliar o risco junto com o Igor): só o Mapa 1 abriu pra CTZ inteira. Mapas 2 e 3 falam do tipo de OUTRA pessoa — mesmo com a trava técnica funcionando (o tipo nunca é devolvido ao navegador, só usado internamente pra calibrar a orientação da IA), isso ainda não foi testado com uso real de mais gente, então continuam restritos a Igor/Priscila por enquanto, junto com "Perfis da equipe" e o cruzamento cargo x Eneagrama (mais abaixo), que nunca fizeram parte do pedido dos 3 mapas.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Decisões tomadas durante a construção</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>"Líder" pro Mapa 2 = tem pelo menos 1 liderado direto no organograma (funcionarios.gestor_id), não a marcação manual usada em Avaliação de Pares — confirmado com o Igor.</li>
              <li>Quem ainda não tem tipo mapeado continua vendo o menu "Autoconhecimento" normalmente, com um aviso de que o perfil ainda não foi cadastrado, em vez de esconder o módulo inteiro — confirmado com o Igor.</li>
              <li>Nos Mapas 2 e 3, o tipo da OUTRA pessoa nunca é devolvido pro navegador — só é lido dentro de funções do banco chamadas pelas rotas de API, que embutem o perfil no prompt da IA e nunca no JSON de resposta (mesma regra desde 09/09/2026). Mesmo assim, o acesso aos Mapas 2 e 3 ficou restrito a Igor/Priscila (ver item de acesso acima) — a proteção técnica reduz o risco, mas não elimina a falta de teste com uso real.</li>
            </ul>
          </div>
        </div>
      </details>

      {erroPerfil && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {erroPerfil}
        </div>
      )}

      {/* Mapa 1 — Autoliderança (todos) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Mapa 1 · Autoliderança</h2>
        </div>

        {tipo ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Tipo {tipo.numero} — {tipo.motivacao}</h3>
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
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Talento de autoliderança</p>
                <p className="text-foreground">{tipo.talentoAutolideranca.nome} — {tipo.talentoAutolideranca.potencial}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Desafio de autoliderança</p>
                <p className="text-foreground">{tipo.talentoAutolideranca.desafio}</p>
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
            <p className="text-muted-foreground text-sm">
              {souAdminPiloto
                ? 'Você não tem um perfil de Eneagrama próprio mapeado — normal pra quem administra o sistema. Confira abaixo o perfil de toda a equipe.'
                : 'Seu perfil de Eneagrama ainda não foi mapeado. Fale com a liderança/RH pra ser incluído no Programa Foco — assim que seu tipo for cadastrado, este mapa e o assistente abaixo aparecem automaticamente.'}
            </p>
          </div>
        )}

        {tipo && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Pergunte ao assistente</h3>

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
        )}
      </div>

      {/* Mapa 2 — Liderando o time. Fala do tipo de OUTRA pessoa (o
          liderado), por isso o Igor pediu (10/09/2026) pra manter restrito a
          Igor/Priscila por enquanto, além de exigir liderado — diferente do
          Mapa 1, que só fala de quem pergunta e por isso já abriu geral. */}
      {souAdminPiloto && souLider && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Mapa 2 · Liderando o time</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Escolha um dos seus liderados diretos e descreva a situação — a resposta orienta como delegar, dar
              feedback, desenvolver ou conduzir um conflito com essa pessoa, sem nunca revelar o tipo comportamental
              dela.
            </p>
            {liderados.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum dos seus liderados diretos tem tipo mapeado ainda.</p>
            ) : (
              <ChatSobreOutraPessoa
                pessoas={liderados}
                placeholder="Selecione um liderado..."
                situacoesSugeridas={SITUACOES_SUGERIDAS_LIDERANCA}
                endpoint="/api/liderar-liderado"
              />
            )}
          </div>
        </div>
      )}

      {/* Mapa 3 — Relacionando com o time. Mesmo raciocínio do Mapa 2: fala
          do tipo de OUTRA pessoa, restrito a Igor/Priscila por enquanto
          (pedido 10/09/2026) — ver comentário na declaração de `colegas`
          acima e nas rotas de API dos Mapas 2/3. */}
      {souAdminPiloto && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Mapa 3 · Relacionando com o time</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <p className="text-xs text-muted-foreground">
              Escolha a pessoa e descreva a situação — a resposta orienta a melhor forma de conduzir a conversa, sem
              nunca revelar o tipo comportamental dela.
            </p>
            {colegas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ainda não há colegas com tipo mapeado nesta empresa.</p>
            ) : (
              <ChatSobreOutraPessoa
                pessoas={colegas}
                placeholder="Selecione um colega..."
                situacoesSugeridas={SITUACOES_SUGERIDAS}
                endpoint="/api/como-abordar-colega"
              />
            )}
          </div>
        </div>
      )}

      {/* Visão de administrador do protótipo — só Igor/Priscila, ver
          souAdminPiloto acima. Não faz parte dos 3 mapas do pedido, é a
          ferramenta de conferência de mapeamento que já existia. */}
      {souAdminPiloto && todosPerfis.length > 0 && (
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
                                      Análise do Eneagrama para este cargo
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
    </div>
  )
}
