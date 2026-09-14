'use client'

import { useEffect, useRef, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import {
  getMeuPerfilEneagrama,
  getTodosPerfisEneagrama,
  getSouLiderDeAlguem,
  getColegasComPerfilMapeado,
  getMeusLideradosComPerfilMapeado,
  getResumoTimeLiderado,
  getOrganogramaEmpresa,
  type PerfilEneagramaComNome,
  type ColegaComPerfilMapeado,
  type ResumoTime,
  type FuncionarioOrganograma,
} from '@/lib/queries/eneagrama'
import { getTodosCargosPerfil, getMinhaDicaCargo, type FuncionarioCargoPerfil } from '@/lib/queries/cargosPerfil'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'
import { Sparkles, Loader2, Send, ChevronDown, ChevronRight, Wand2, Crown } from 'lucide-react'

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

// Mapa 2, chat "Pergunte sobre o seu time" (pedido 14/09/2026) — sobre o
// time como um todo, não uma pessoa específica.
const PERGUNTAS_SOBRE_TIME = [
  'Como esse time costuma reagir a mudança de prioridade em cima da hora?',
  'Como eu conduzo uma reunião de decisão em grupo com esse time?',
  'O que esse time mais precisa de mim como líder agora?',
]

function formatarSequencia(sequencia: string) {
  return sequencia
    .split('/')
    .map((i) => NOME_INSTINTO[i.trim() as Instinto] ?? i.trim())
    .join(' → ')
}

// Mapa 2 (pedido 14/09/2026): transforma os 5 números agregados de
// resumo_time_liderado() num parágrafo em português — nunca cita tipo
// individual, só a composição em conjunto do time, agrupada nos 3 centros do
// Eneagrama (mesmo agrupamento de TIPOS_ENEAGRAMA[n].centro): Racional
// (5/6/7, "mais técnico/analítico"), Emocional (2/3/4, "mais
// sentimental/relacional") e Instintivo (8/9/1, "mais orientado à ação e ao
// resultado prático" — o pedido original também citou "mais cultural", mas
// isso não é uma categoria formal do Eneagrama, então virou esta 3ª opção,
// mais próxima do que os centros realmente descrevem). Time com menos de 3
// pessoas mapeadas não é resumido — a quebra em 3 grupos já daria pra
// adivinhar quem é quem.
function resumirTime(resumo: ResumoTime): string {
  const { instintivo, emocional, racional, totalLiderados, totalMapeados } = resumo
  if (totalMapeados === 0) {
    return totalLiderados > 0
      ? 'Nenhum dos seus liderados diretos tem perfil de Eneagrama mapeado ainda.'
      : 'Você não tem liderados diretos no organograma.'
  }
  if (totalMapeados < 3) {
    return 'Seu time mapeado ainda é pequeno demais (menos de 3 pessoas) pra resumir sem risco de dar pra identificar quem é quem individualmente.'
  }
  const pct = (n: number) => Math.round((n / totalMapeados) * 100)
  const centros = [
    { nome: 'mais técnico e analítico', valor: racional, pct: pct(racional) },
    { nome: 'mais sentimental e relacional', valor: emocional, pct: pct(emocional) },
    { nome: 'mais orientado à ação e ao resultado prático', valor: instintivo, pct: pct(instintivo) },
  ]
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)

  const frasePartes = centros.map((c) => `${c.pct}% ${c.nome}`).join(', ')
  const naoMapeados = totalLiderados - totalMapeados
  return `Seu time (${totalMapeados} de ${totalLiderados} liderados diretos com perfil mapeado) tende a ser ${frasePartes}.${
    naoMapeados > 0 ? ` ${naoMapeados} ainda não tem perfil mapeado.` : ''
  }`
}

// Card do Mapa 1 — extraído pra ser reaproveitado tanto no "meu perfil"
// quanto na simulação de administrador (pedido 14/09/2026: ver como outra
// pessoa veria a própria tela, sem precisar logar como ela).
function CardTipoMapa1({
  tipo,
  subtipoSequencia,
  dica,
}: {
  tipo: (typeof TIPOS_ENEAGRAMA)[number]
  subtipoSequencia: string | null
  dica: { texto: string; geradoEm: string } | null
}) {
  // Pedido (14/09/2026): o card já tem bastante informação (6 campos do
  // tipo + sequência de instintos) — a análise de cargo, que é o texto mais
  // longo de todos, começa OCULTA por padrão, só some/aparece no clique, em
  // vez de empilhar tudo de uma vez.
  const [mostrarDica, setMostrarDica] = useState(false)
  return (
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
      {dica && (
        <div className="pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setMostrarDica((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Análise para o seu cargo</span>
            <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
              {mostrarDica ? 'Ocultar' : 'Revelar'}
              {mostrarDica ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          </button>
          {mostrarDica && (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-foreground text-sm whitespace-pre-line">{dica.texto}</p>
              <p className="text-xs text-muted-foreground">Gerada em {new Date(dica.geradoEm).toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Chat livre, sem seleção de pessoa — reaproveitado pelo Mapa 2 ("Pergunte
// sobre o seu time", pedido 14/09/2026). Mais simples que os outros dois
// chats desta página porque não tem seletor nenhum: sempre manda só
// {pergunta, historico} pro endpoint.
function ChatGeral({
  endpoint,
  sugestoes,
  placeholder,
}: {
  endpoint: string
  sugestoes: string[]
  placeholder: string
}) {
  const [texto, setTexto] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens, enviando])

  async function enviar(msg: string) {
    if (!msg.trim() || enviando) return
    setErro('')
    const historicoAnterior = mensagens.slice(-8)
    setMensagens((prev) => [...prev, { role: 'user', texto: msg }])
    setTexto('')
    setEnviando(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: msg, historico: historicoAnterior }),
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
      {mensagens.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((s) => (
            <button
              key={s}
              onClick={() => setTexto(s)}
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
          enviar(texto)
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          disabled={enviando}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm flex items-center justify-center"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}

// Chat unificado do Mapa 1 (pedido 14/09/2026: Mapa 3 "Relacionando com o
// time" deixou de ser seção própria e virou um MODO deste mesmo chat). Um
// seletor só: "Eu mesmo" (padrão, sempre disponível — chama
// /api/assistente-eneagrama) ou um colega da lista (só aparece a opção
// quando `colegas` não está vazia — hoje só pra quem carrega colegas,
// souAdminPiloto — chama /api/como-abordar-colega). O seletor some sozinho
// quando não há colega nenhum pra oferecer, e o chat vira só sobre si mesmo,
// idêntico ao antigo "Pergunte ao assistente".
function ChatMapa1Unificado({
  colegas,
  permiteSobreSiMesmo,
}: {
  colegas: ColegaComPerfilMapeado[]
  // Achado (14/09/2026): quando quem abre não tem tipo próprio mapeado
  // (ex.: administrador do sistema), a opção "Eu mesmo" chamaria
  // /api/assistente-eneagrama, que exige tipo próprio — daria erro. Nesse
  // caso o seletor nasce SEM essa opção, começando direto num colega (ou o
  // card nem aparece, se também não há colega nenhum — ver gate na página).
  permiteSobreSiMesmo: boolean
}) {
  const [alvoId, setAlvoId] = useState('')
  const [texto, setTexto] = useState('')
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

  async function enviar(msg: string) {
    if (!msg.trim() || enviando || (!alvoId && !permiteSobreSiMesmo)) return
    setErro('')
    const historicoAnterior = mensagens.slice(-8)
    setMensagens((prev) => [...prev, { role: 'user', texto: msg }])
    setTexto('')
    setEnviando(true)
    try {
      const endpoint = alvoId ? '/api/como-abordar-colega' : '/api/assistente-eneagrama'
      const body = alvoId
        ? { funcionarioAlvoId: alvoId, situacao: msg, historico: historicoAnterior }
        : { pergunta: msg, historico: historicoAnterior }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || 'Erro ao consultar o assistente.')
      }
      const data = await res.json()
      setMensagens((prev) => [...prev, { role: 'model', texto: data.resposta }])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar o assistente. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const sugestoes = alvoId ? SITUACOES_SUGERIDAS : PERGUNTAS_SUGERIDAS
  // Só dá pra conversar se "eu mesmo" for permitido (alvoId vazio = eu
  // mesmo) OU se já escolheu um colega específico — sem isso, alguém sem
  // tipo próprio via o seletor cair automaticamente em "eu mesmo" (valor
  // inicial '') sem ter escolhido nada, e a pergunta ia pro endpoint errado.
  const podeConversar = permiteSobreSiMesmo || !!alvoId

  return (
    <div className="space-y-4">
      {colegas.length > 0 && (
        <select
          value={alvoId}
          onChange={(e) => selecionarAlvo(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {permiteSobreSiMesmo ? (
            <option value="">Eu mesmo (autoliderança)</option>
          ) : (
            <option value="" disabled>Selecione um colega...</option>
          )}
          {[...colegas]
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((p) => (
              <option key={p.funcionario_id} value={p.funcionario_id}>
                {p.full_name}
              </option>
            ))}
        </select>
      )}

      {podeConversar && mensagens.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((s) => (
            <button
              key={s}
              onClick={() => setTexto(s)}
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

      {podeConversar ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enviar(texto)
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={alvoId ? 'Descreva a situação...' : 'Escreva sua pergunta...'}
            disabled={enviando}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm flex items-center justify-center"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Selecione um colega acima pra começar.</p>
      )}
    </div>
  )
}

// Bloco de chat reaproveitado só pelo Mapa 2 (escolher um liderado
// específico e descrever a situação).
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
  // Mapa 1 (pedido 14/09/2026): a análise cargo x Eneagrama que o admin
  // piloto gera em "Perfis da equipe" (dicas_texto) também vai aparecer pra
  // cada pessoa sobre si mesma aqui — a RLS já libera a própria linha pra
  // QUALQUER usuário desde 01/09 (não é trava técnica). Mas o Igor pediu
  // (mesmo dia) pra manter a EXIBIÇÃO restrita só a ele/Priscila por
  // enquanto, pra validar o tom do texto antes de abrir geral — por isso
  // este flag é mais estreito que souAdminPiloto (que já inclui a Letícia).
  const [souVeDicaMapa1, setSouVeDicaMapa1] = useState(false)
  const [minhaDica, setMinhaDica] = useState<{ texto: string; geradoEm: string } | null>(null)

  // Mapa 2 "Liderando o time": só aparece pra quem tem liderado direto no
  // organograma (funcionarios.gestor_id) — ver sou_lider_de_alguem() no
  // banco (migration PENDENTE_20260910010000). Fala do tipo de OUTRA
  // pessoa (o liderado), então só é carregado/mostrado pra quem também é
  // souAdminPiloto (ver decisão abaixo).
  const [souLider, setSouLider] = useState(false)
  const [liderados, setLiderados] = useState<ColegaComPerfilMapeado[]>([])
  // Resumo do time (pedido 14/09/2026) — agregado, nunca tipo individual
  // (ver resumo_time_liderado(), migration PENDENTE_20260914030000).
  const [resumoTime, setResumoTime] = useState<ResumoTime | null>(null)
  // Colegas de QUALQUER pessoa (não só liderado direto) — desde 14/09/2026
  // isso deixou de ser "Mapa 3" separado e virou um modo do chat do Mapa 1
  // (ChatMapa1Unificado). Mesmo raciocínio de acesso — só carregado/mostrado
  // pra souAdminPiloto.
  const [colegas, setColegas] = useState<ColegaComPerfilMapeado[]>([])
  // Organograma da empresa inteira (id + gestor_id) — só pra simulação de
  // administrador (souVeDicaMapa1, mais abaixo), pra achar os liderados do
  // Felipe Marques sem precisar de RPC nova (a RLS de leitura de
  // `funcionarios` já libera qualquer membro da mesma empresa).
  const [organograma, setOrganograma] = useState<FuncionarioOrganograma[]>([])

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
      const emailAtual = user.email?.toLowerCase() ?? ''
      const veDicaMapa1 = ['igorecosta1@gmail.com', 'priscila.santos@behive.net.br'].includes(emailAtual)
      setSouVeDicaMapa1(veDicaMapa1)

      const { perfil, error } = await getMeuPerfilEneagrama()
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }

      if (veDicaMapa1) {
        getMinhaDicaCargo().then(({ dicas }) => setMinhaDica(dicas))
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
          getColegasComPerfilMapeado(empresa.id),
          getTodosPerfisEneagrama(empresa.id),
          getTodosCargosPerfil(empresa.id),
        ])
        setSouLider(liderDeAlguem)
        setColegas(colegasMapeados)
        if (liderDeAlguem) {
          getMeusLideradosComPerfilMapeado().then(({ liderados: l }) => setLiderados(l))
          getResumoTimeLiderado().then(({ resumo }) => setResumoTime(resumo))
        }
        if (!erroTodos) setTodosPerfis(perfis)
        setCargosPerfil(mapa)
        if (veDicaMapa1) {
          getOrganogramaEmpresa(empresa.id).then(({ organograma: o }) => setOrganograma(o))
        }
      }
      setLoading(false)
    }
    carregar()
  }, [ctz, empresa?.id])

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
            2 mapas baseados no seu perfil de Eneagrama: Autoliderança e Relacionamento, e Liderando o time
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
              <li>Nos Mapas 1 e 2, o tipo da OUTRA pessoa nunca é devolvido pro navegador — só é lido dentro de funções do banco chamadas pelas rotas de API, que embutem o perfil no prompt da IA e nunca no JSON de resposta (mesma regra desde 09/09/2026). Mesmo assim, falar de outra pessoa ficou restrito a Igor/Priscila (ver item de acesso acima) — a proteção técnica reduz o risco, mas não elimina a falta de teste com uso real.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Atualização (14/09/2026)</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>O antigo Mapa 3 ("Relacionando com o time") deixou de ser seção própria — virou um MODO do mesmo chat do Mapa 1: o seletor agora tem "Eu mesmo" (padrão) ou um colega, em vez de duas caixas de chat separadas.</li>
              <li>Mapa 2 ganhou um resumo do time (agregado nos 3 centros do Eneagrama — nunca o tipo de ninguém individualmente) e um segundo chat, mais livre, pra perguntas sobre o time como um todo (não uma pessoa específica). O chat de pessoa específica passou a considerar também o próprio perfil do líder, não só o do liderado, pra sugerir a melhor forma de dialogar entre os dois estilos.</li>
              <li>Os dois blocos de "Simulação (visão de administrador)" — como a tela apareceria pro Felipe Marques Santos — continuam restritos a Igor/Priscila, mesmo raciocínio de validar antes de abrir geral.</li>
            </ul>
          </div>
        </div>
      </details>

      {erroPerfil && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {erroPerfil}
        </div>
      )}

      {/* Mapa 1 — Autoliderança e Relacionamento (todos). Desde 14/09/2026 o
          antigo Mapa 3 ("Relacionando com o time") deixou de ser seção
          própria e virou um MODO do mesmo chat (ver ChatMapa1Unificado). */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Mapa 1 · Autoliderança e Relacionamento</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Como VOCÊ funciona, e como se relacionar melhor com qualquer colega mapeado — pra todo mundo com tipo mapeado.</p>

        {tipo ? (
          <CardTipoMapa1 tipo={tipo} subtipoSequencia={subtipoSequencia} dica={souVeDicaMapa1 ? minhaDica : null} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {souAdminPiloto
                ? 'Você não tem um perfil de Eneagrama próprio mapeado — normal pra quem administra o sistema. Confira abaixo o perfil de toda a equipe.'
                : 'Seu perfil de Eneagrama ainda não foi mapeado. Fale com a liderança/RH pra ser incluído no Programa Foco — assim que seu tipo for cadastrado, este mapa e o assistente abaixo aparecem automaticamente.'}
            </p>
          </div>
        )}

        {/* Simulação (pedido 14/09/2026): a análise de cargo x Eneagrama vai
            passar a aparecer no Mapa 1 de CADA pessoa (RLS já libera desde
            01/09), mas o Igor pediu pra validar o tom antes de abrir geral —
            por enquanto só ele/Priscila veem a própria (souVeDicaMapa1 acima).
            Este bloco simula como a tela ficaria pro Felipe Marques Santos
            (que já tem análise gerada) sem precisar logar como ele — usa os
            dados que a visão de admin ("Perfis da equipe", mais abaixo) já
            carregou, nenhuma query nova. */}
        {souVeDicaMapa1 && (() => {
          const felipe = todosPerfis.find((p) => p.full_name === 'Felipe Marques Santos')
          const felipeTipo = felipe ? TIPOS_ENEAGRAMA[felipe.tipo] : null
          const felipeCargo = felipe ? cargosPerfil[felipe.funcionario_id] : undefined
          const felipeDica = felipeCargo?.dicas_texto && felipeCargo.dicas_gerado_em
            ? { texto: felipeCargo.dicas_texto, geradoEm: felipeCargo.dicas_gerado_em }
            : null
          return (
            <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Simulação (visão de administrador) — só você/Priscila veem este bloco
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Como o Mapa 1 apareceria pro Felipe Marques Santos, se ele abrisse a própria tela agora — pra validar
                  o tom da análise antes de abrir esse recurso pra CTZ inteira.
                </p>
              </div>
              {felipeTipo ? (
                <CardTipoMapa1 tipo={felipeTipo} subtipoSequencia={felipe!.subtipo_sequencia} dica={felipeDica} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Felipe Marques Santos não apareceu nos perfis carregados — confira "Perfis da equipe" mais abaixo.
                </p>
              )}
            </div>
          )
        })()}

        {/* Achado (14/09/2026): antes da fusão, o chat sobre colega (antigo
            Mapa 3) aparecia pra qualquer souAdminPiloto, mesmo sem tipo
            próprio mapeado (ex.: Igor, que administra o sistema mas não é
            um dos 20 funcionários mapeados). Gate errado depois da fusão
            (`{tipo && (...)}`) fazia o card sumir inteiro pra esses casos —
            agora aparece se há tipo próprio OU colega pra conversar. */}
        {(tipo || colegas.length > 0) && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pergunte ao assistente</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tipo
                  ? 'Sobre você mesmo (padrão) ou, se disponível, escolha um colega pra saber a melhor forma de conduzir uma conversa com ele — sem nunca revelar o tipo comportamental dele.'
                  : 'Você não tem tipo próprio mapeado, mas pode escolher um colega abaixo pra saber a melhor forma de conduzir uma conversa com ele — sem nunca revelar o tipo comportamental dele.'}
              </p>
            </div>
            <ChatMapa1Unificado colegas={colegas} permiteSobreSiMesmo={!!tipo} />
          </div>
        )}
      </div>

      {/* Mapa 2 — Liderando o time. Fala do tipo de OUTRA pessoa (o
          liderado), por isso o Igor pediu (10/09/2026) pra manter restrito a
          Igor/Priscila por enquanto, além de exigir liderado — diferente do
          Mapa 1, que só fala de quem pergunta e por isso já abriu geral.
          Achado (14/09/2026): antes disso, quem é piloto mas não lidera
          ninguém (ex.: Igor, que não tem liderado direto no organograma de
          nenhuma empresa) via o mapa sumir sem explicação nenhuma — agora o
          cabeçalho sempre aparece pra piloto, e some só o conteúdo, com um
          aviso explicando o motivo. Ganhou (14/09/2026) o resumo do time e um
          segundo chat mais livre — ver comentários abaixo. */}
      {souAdminPiloto && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Mapa 2 · Liderando o time</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Como orientar quem lidera pra VOCÊ — delegação, feedback, desenvolvimento — pra quem tem liderado direto no organograma.</p>
          {souLider ? (
            <>
              {/* Resumo do time (pedido 14/09/2026) — agregado, nunca tipo
                  individual (ver resumirTime() e resumo_time_liderado()). */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Resumo do seu time</p>
                <p className="text-sm text-foreground">{resumoTime ? resumirTime(resumoTime) : 'Carregando...'}</p>
              </div>

              {/* Chat geral sobre o time (pedido 14/09/2026) — diferente do
                  chat abaixo, que fala de UMA pessoa. */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Pergunte sobre o seu time</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Perguntas gerais sobre como liderar o time como um todo — não sobre uma pessoa específica.
                  </p>
                </div>
                <ChatGeral
                  endpoint="/api/perguntar-sobre-time"
                  sugestoes={PERGUNTAS_SOBRE_TIME}
                  placeholder="Escreva sua pergunta sobre o time..."
                />
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Falar sobre uma pessoa específica</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Escolha um dos seus liderados diretos e descreva a situação — a resposta orienta como delegar,
                    dar feedback, desenvolver ou conduzir um conflito com essa pessoa (considerando também o seu
                    próprio jeito de liderar), sem nunca revelar o tipo comportamental dela.
                  </p>
                </div>
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
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-muted-foreground text-sm">
                Este mapa só aparece pra quem tem pelo menos 1 liderado direto no organograma — você não lidera
                ninguém em nenhuma empresa hoje, por isso não há nada pra mostrar aqui.
              </p>
            </div>
          )}

          {/* Simulação (pedido 14/09/2026) — mesmo raciocínio do bloco
              equivalente no Mapa 1: como a tela apareceria pro Felipe
              Marques Santos, sem precisar logar como ele. Usa o organograma
              (busca 14/09/2026, só pra piloto) + todosPerfis (já carregado)
              pra achar os liderados dele e computar o mesmo resumo
              agregado que resumirTime() usa pro time de verdade — nenhuma
              RPC nova, nenhum tipo individual exposto além do que o admin
              piloto já vê em "Perfis da equipe". */}
          {souVeDicaMapa1 && (() => {
            const felipe = todosPerfis.find((p) => p.full_name === 'Felipe Marques Santos')
            if (!felipe) {
              return (
                <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Simulação (visão de administrador) — só você/Priscila veem este bloco
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Felipe Marques Santos não apareceu nos perfis carregados — confira "Perfis da equipe" mais abaixo.
                  </p>
                </div>
              )
            }
            const idsLiderados = organograma.filter((o) => o.gestor_id === felipe.funcionario_id).map((o) => o.funcionario_id)
            const perfisLiderados = todosPerfis.filter((p) => idsLiderados.includes(p.funcionario_id))
            const resumoSimulado: ResumoTime = {
              instintivo: perfisLiderados.filter((p) => [8, 9, 1].includes(p.tipo)).length,
              emocional: perfisLiderados.filter((p) => [2, 3, 4].includes(p.tipo)).length,
              racional: perfisLiderados.filter((p) => [5, 6, 7].includes(p.tipo)).length,
              totalLiderados: idsLiderados.length,
              totalMapeados: perfisLiderados.length,
            }
            return (
              <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Simulação (visão de administrador) — só você/Priscila veem este bloco
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Como o resumo do time apareceria pro Felipe Marques Santos, se ele abrisse a própria tela do Mapa
                    2 agora.
                  </p>
                </div>
                <p className="text-sm text-foreground">{resumirTime(resumoSimulado)}</p>
              </div>
            )
          })()}
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
          {/* Lista em vez de tabela (achado 14/09/2026): com 4 colunas de
              texto (nome/tipo/sequência de instintos/cargo), uma tabela
              exigia rolagem horizontal pra ler em qualquer tela mais estreita
              que o conteúdo — aqui os campos quebram linha naturalmente
              (flex-wrap) em vez de forçar nowrap. */}
          <div className="divide-y divide-border/50">
            {todosPerfis.map((p) => {
              const t = TIPOS_ENEAGRAMA[p.tipo]
              const cargoInfo = cargosPerfil[p.funcionario_id]
              const cp = cargoInfo?.cargo_perfil
              const aberto = expandidoId === p.funcionario_id
              return (
                <div key={p.funcionario_id}>
                  <button
                    type="button"
                    onClick={() => setExpandidoId(aberto ? null : p.funcionario_id)}
                    className="w-full flex items-start gap-2 py-2.5 text-left hover:bg-accent/50 rounded-lg px-1.5 -mx-1.5 transition-colors"
                  >
                    <span className="text-muted-foreground mt-0.5 shrink-0">
                      {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm text-foreground font-medium">{p.full_name}</span>
                        <span className="text-xs text-muted-foreground">Tipo {p.tipo}{t ? ` — ${t.palavraSintese}` : ''}</span>
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span>{p.subtipo_sequencia ? formatarSequencia(p.subtipo_sequencia) : '—'}</span>
                        <span>{cp ? `${cp.cargo_base}${cp.nivel ? ` (${cp.nivel})` : ''}` : 'sem perfil de cargo mapeado'}</span>
                      </span>
                    </span>
                  </button>
                  {aberto && (
                    <div className="pb-4 px-1.5">
                      <div className="bg-secondary/30 rounded-xl p-4">
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
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
