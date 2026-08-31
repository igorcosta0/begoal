'use client'

import { useEffect, useRef, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import { getMeuPerfilEneagrama, getTodosPerfisEneagrama, type PerfilEneagramaComNome } from '@/lib/queries/eneagrama'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'
import { Sparkles, Loader2, Send } from 'lucide-react'

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
      const [{ perfil, error }, { perfis, error: erroTodos }] = await Promise.all([
        getMeuPerfilEneagrama(),
        getTodosPerfisEneagrama(empresa.id),
      ])
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }
      if (!erroTodos) setTodosPerfis(perfis)
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 font-medium">Sequência de instintos</th>
                </tr>
              </thead>
              <tbody>
                {todosPerfis.map((p) => {
                  const t = TIPOS_ENEAGRAMA[p.tipo]
                  return (
                    <tr key={p.funcionario_id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 text-foreground whitespace-nowrap">{p.full_name}</td>
                      <td className="py-2 pr-4 text-foreground whitespace-nowrap">Tipo {p.tipo}{t ? ` — ${t.palavraSintese}` : ''}</td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">{p.subtipo_sequencia ? formatarSequencia(p.subtipo_sequencia) : '—'}</td>
                    </tr>
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
