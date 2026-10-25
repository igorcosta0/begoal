'use client'

import { ArrowRight, Globe, Hand, Lock, Send, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILARES_CULTURAIS } from '@/lib/pilaresCulturais'
import {
  PESSOAS, ROTULO_TIPO, diaMes, haQuanto,
  type AcoesFeedback, type Feedback, type ParOneOnOne, type PedidoFeedback, type PessoaId, type SubFeedback,
} from '@/lib/feedbackPrototipo'
import { AvatarPessoa, ESTILO_TIPO, Painel, Selo, Vazio, primeiroNome } from './comum'

export function ItemFeedback({ f, modo }: { f: Feedback; modo: 'recebido' | 'enviado' | 'time' }) {
  const outro = modo === 'enviado' ? f.para : f.de
  return (
    <div className="flex gap-3 py-3.5 border-t border-border first:border-t-0 first:pt-0.5">
      <AvatarPessoa id={outro} tamanho="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {modo === 'enviado'
            ? <span>Para <b className="font-semibold">{PESSOAS[f.para].nome}</b></span>
            : <span><b className="font-semibold">{PESSOAS[f.de].nome}</b>{modo === 'time' && <> para <b className="font-semibold">{PESSOAS[f.para].nome}</b></>}</span>}
          <Selo className={ESTILO_TIPO[f.tipo]}>{ROTULO_TIPO[f.tipo]}</Selo>
          {f.publico
            ? <Selo className="bg-secondary text-muted-foreground font-medium"><Globe className="w-3 h-3" /> No mural</Selo>
            : <Selo className="bg-secondary text-muted-foreground font-medium"><Lock className="w-3 h-3" /> Privado</Selo>}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground max-w-[72ch]">{f.texto}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          <span>{haQuanto(f.data)} · {diaMes(f.data)}</span>
          {f.pilar != null && <span className="rounded-md bg-accent text-accent-foreground px-1.5 py-px">{PILARES_CULTURAIS[f.pilar].titulo}</span>}
        </div>
      </div>
    </div>
  )
}

export function ItemPedido({ p, paraMim, acoes }: { p: PedidoFeedback; paraMim: boolean; acoes: AcoesFeedback }) {
  return (
    <div className="flex gap-3 py-3.5 border-t border-border first:border-t-0 first:pt-0.5">
      <AvatarPessoa id={paraMim ? p.de : p.para} tamanho="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {paraMim
            ? <span><b className="font-semibold">{PESSOAS[p.de].nome}</b> pediu seu feedback</span>
            : <span>Você pediu a <b className="font-semibold">{PESSOAS[p.para].nome}</b></span>}
          {p.respondido
            ? <Selo className="bg-emerald-100 text-emerald-800">Respondido</Selo>
            : <Selo className="bg-secondary text-muted-foreground">Aguardando</Selo>}
        </div>
        <p className="mt-1.5 text-sm text-foreground">{p.sobre}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
          <span>{haQuanto(p.data)}</span>
          {paraMim && !p.respondido && (
            <button
              onClick={() => acoes.responderPedido(p.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              <Send className="w-3 h-3" /> Responder
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Mural({ feedbacks, acoes }: { feedbacks: Feedback[]; acoes: AcoesFeedback }) {
  const lista = feedbacks.filter((f) => f.publico).sort(porData)
  if (!lista.length) return <Vazio>Nenhum elogio no mural ainda.</Vazio>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
      {lista.map((f) => (
        <article key={f.id} className="rounded-2xl border border-border bg-card shadow-glass p-4 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <AvatarPessoa id={f.de} tamanho="xs" /><b className="font-semibold">{primeiroNome(f.de)}</b>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <AvatarPessoa id={f.para} tamanho="xs" /><b className="font-semibold">{primeiroNome(f.para)}</b>
            <span className="ml-auto text-muted-foreground tabular-nums">{diaMes(f.data)}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">“{f.texto}”</p>
          {f.pilar != null && <span className="self-start text-[11px] rounded-md bg-accent text-accent-foreground px-1.5 py-px">{PILARES_CULTURAIS[f.pilar].titulo}</span>}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{PESSOAS[f.para].area}</span>
            <button
              onClick={() => acoes.aplaudir(f.id)}
              aria-pressed={!!f.bati}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
                f.bati ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
              )}
            >
              <Hand className="w-3.5 h-3.5" /> <span className="tabular-nums">{f.palmas}</span>
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

export function porData(a: { data: string }, b: { data: string }) {
  return a.data < b.data ? 1 : -1
}

export default function AbaFeedback({ eu, sub, feedbacks, pedidos, pares, acoes }: {
  eu: PessoaId
  sub: SubFeedback
  feedbacks: Feedback[]
  pedidos: PedidoFeedback[]
  pares: ParOneOnOne[]
  acoes: AcoesFeedback
}) {
  const time = pares.filter((p) => p.lider === eu).map((p) => p.liderado)
  const subs: [SubFeedback, string][] = [['recebidos', 'Recebidos'], ['enviados', 'Enviados'], ['pedidos', 'Pedidos']]
  if (time.length) subs.push(['time', 'Do meu time'])
  subs.push(['mural', 'Mural'])

  let conteudo: React.ReactNode
  if (sub === 'mural') {
    conteudo = <Mural feedbacks={feedbacks} acoes={acoes} />
  } else {
    let itens: React.ReactNode[] = []
    if (sub === 'recebidos') itens = feedbacks.filter((f) => f.para === eu).sort(porData).map((f) => <ItemFeedback key={f.id} f={f} modo="recebido" />)
    if (sub === 'enviados') itens = feedbacks.filter((f) => f.de === eu).sort(porData).map((f) => <ItemFeedback key={f.id} f={f} modo="enviado" />)
    if (sub === 'time') itens = feedbacks.filter((f) => time.includes(f.para) && f.de !== eu).sort(porData).map((f) => <ItemFeedback key={f.id} f={f} modo="time" />)
    if (sub === 'pedidos') itens = pedidos.filter((p) => p.para === eu || p.de === eu).sort(porData).map((p) => <ItemPedido key={p.id} p={p} paraMim={p.para === eu} acoes={acoes} />)
    conteudo = (
      <Painel>
        {sub === 'time' && (
          <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 rounded-xl text-[13px] bg-primary/5 border border-primary/20">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Você vê o que seu time <b>recebeu</b>, para conversar no 1:1. Os privados aparecem aqui só para o líder direto (a decidir).</span>
          </div>
        )}
        {itens.length ? itens : <Vazio>Nada por aqui ainda.</Vazio>}
      </Painel>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {subs.map(([v, rotulo]) => (
          <button
            key={v}
            onClick={() => acoes.irPara('feedback', v)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
              sub === v ? 'border-primary/30 bg-primary/10 text-primary font-semibold' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {conteudo}
    </div>
  )
}
