'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Send, Sparkles, RotateCcw, Flag } from 'lucide-react'

export interface Mensagem {
  role: 'user' | 'model'
  texto: string
}

interface ConversaProps {
  endpoint: string
  // Monta o corpo da requisição a partir da mensagem nova e do histórico.
  montarCorpo: (mensagem: string, historico: Mensagem[]) => Record<string, unknown>
  sugestoes: string[]
  placeholder: string
  // Texto do estado vazio (padrão: o do método "pergunta antes de sugerir").
  introducao?: { titulo: string; detalhe: string }
  // Conversa que já começa com mensagens (ex.: o cliente abre o treino de negociação).
  mensagensIniciais?: Mensagem[]
  // Botão que encerra a conversa e pede uma última resposta à parte (ex.:
  // retorno do treino de negociação). Depois dele, só "Nova conversa".
  encerrar?: { rotulo: string; tituloResposta: string; montarCorpo: (historico: Mensagem[]) => Record<string, unknown> }
}

// Janela de conversa com o assistente (repaginada 30/09/2026), usada pelos dois
// mapas. Para trocar de assunto/pessoa, o componente pai muda a `key`, o que
// zera a conversa.
// Desde 30/09/2026 a IA pergunta antes de sugerir (ver metodoConversa em
// src/lib/apiIa.ts): o histórico enviado cresceu para 12 mensagens, senão as
// respostas às perguntas dela se perdiam.
export default function Conversa({ endpoint, montarCorpo, sugestoes, placeholder, introducao, mensagensIniciais = [], encerrar }: ConversaProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais)
  const [respostaFinal, setRespostaFinal] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens, enviando, respostaFinal])

  async function pedir(corpo: Record<string, unknown>): Promise<string> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    if (!res.ok) {
      const erroCorpo = await res.json().catch(() => ({}))
      throw new Error(erroCorpo.error || 'Erro ao consultar o assistente.')
    }
    const data = await res.json()
    return data.resposta
  }

  async function encerrarConversa() {
    if (!encerrar || enviando) return
    setErro('')
    setEnviando(true)
    try {
      setRespostaFinal(await pedir(encerrar.montarCorpo(mensagens.slice(-20))))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar o assistente. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  async function enviar(msg: string) {
    if (!msg.trim() || enviando) return
    setErro('')
    const historico = mensagens.slice(-12)
    setMensagens((prev) => [...prev, { role: 'user', texto: msg.trim() }])
    setTexto('')
    setEnviando(true)
    try {
      const resposta = await pedir(montarCorpo(msg.trim(), historico))
      setMensagens((prev) => [...prev, { role: 'model', texto: resposta }])
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao consultar o assistente. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background/70 overflow-hidden">
      <div ref={scrollRef} className="max-h-[440px] min-h-[200px] overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 && !respostaFinal ? (
          <div className="py-2">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 grid place-items-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="text-sm text-foreground leading-relaxed">
                <p>{introducao?.titulo ?? 'Conte o que está acontecendo, com um exemplo recente se puder.'}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {introducao?.detalhe ?? 'Antes de sugerir qualquer coisa, vou fazer algumas perguntas para entender bem a situação.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTexto(s)}
                  className="text-left text-xs leading-snug px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-colors text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          mensagens.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-auto max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap bg-primary text-primary-foreground">
                {m.texto}
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5 max-w-[92%]">
                <span className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 grid place-items-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-md text-sm whitespace-pre-wrap bg-secondary text-foreground leading-relaxed">
                  {m.texto}
                </div>
              </div>
            )
          )
        )}
        {respostaFinal && encerrar && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400 mb-2">{encerrar.tituloResposta}</p>
            <div className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{respostaFinal}</div>
          </div>
        )}
        {enviando && (
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 grid place-items-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="px-4 py-2.5 rounded-2xl bg-secondary text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
            </span>
          </div>
        )}
      </div>

      {erro && <p className="px-4 pb-2 text-xs text-destructive">{erro}</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); enviar(texto) }}
        className="border-t border-border bg-card/60 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar(texto)
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={placeholder}
            disabled={enviando || !!respostaFinal}
            className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim() || !!respostaFinal}
            aria-label="Enviar"
            className="shrink-0 h-10 w-10 grid place-items-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-muted-foreground">Enter envia · Shift+Enter quebra a linha</p>
          <div className="flex items-center gap-3">
            {encerrar && !respostaFinal && mensagens.some((m) => m.role === 'user') && (
              <button
                type="button"
                onClick={encerrarConversa}
                disabled={enviando}
                className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-400 hover:underline disabled:opacity-50"
              >
                <Flag className="w-3 h-3" /> {encerrar.rotulo}
              </button>
            )}
            {mensagens.length > mensagensIniciais.length && (
              <button
                type="button"
                onClick={() => { setMensagens(mensagensIniciais); setRespostaFinal(null); setErro('') }}
                className={cn('flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors')}
              >
                <RotateCcw className="w-3 h-3" /> Nova conversa
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
