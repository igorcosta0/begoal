'use client'

import { CalendarDays, CircleHelp, Flag, Heart } from 'lucide-react'
import {
  PESSOAS, HOJE, combinadosAbertos, diaMes, diaSemana, diasEntre, proximaReuniao,
  type AcoesFeedback, type Feedback, type ParOneOnOne, type PedidoFeedback, type PessoaId,
} from '@/lib/feedbackPrototipo'
import { AvatarPessoa, Caixinha, Painel, Selo, Vazio, primeiroNome } from './comum'
import { ItemFeedback, ItemPedido, porData } from './AbaFeedback'

export default function AbaVisaoGeral({ eu, feedbacks, pedidos, pares, acoes }: {
  eu: PessoaId
  feedbacks: Feedback[]
  pedidos: PedidoFeedback[]
  pares: ParOneOnOne[]
  acoes: AcoesFeedback
}) {
  const meus = pares.filter((p) => p.lider === eu || p.liderado === eu)
  const proximos = meus
    .map((p) => ({ par: p, r: proximaReuniao(p) }))
    .filter((x): x is { par: ParOneOnOne; r: NonNullable<typeof x.r> } => !!x.r)
    .sort((a, b) => (a.r.data < b.r.data ? -1 : 1))
  const meusCombinados = meus.flatMap((p) =>
    combinadosAbertos(p).filter((a) => a.combinado.responsavel === eu).map((a) => ({ ...a, par: p }))
  )
  const pendentes = pedidos.filter((p) => p.para === eu && !p.respondido)
  const recentes = feedbacks.filter((f) => f.para === eu).sort(porData).slice(0, 2)
  const verTodos = (onClick: () => void) => (
    <button onClick={onClick} className="text-xs font-semibold text-primary hover:underline">Ver todos</button>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <Painel titulo="Próximos 1:1" icon={CalendarDays} acao={verTodos(() => acoes.irPara('oneonone'))}>
          {!proximos.length && <Vazio>Nenhum 1:1 agendado.</Vazio>}
          <div className="flex flex-col gap-1">
            {proximos.slice(0, 4).map(({ par, r }) => {
              const outro = par.lider === eu ? par.liderado : par.lider
              const atrasado = diasEntre(r.data, HOJE) > 0
              return (
                <button key={par.id} onClick={() => acoes.abrirPar(par.id)} className="flex items-center gap-3 text-left rounded-xl px-2.5 py-2 hover:bg-secondary transition-colors">
                  <AvatarPessoa id={outro} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{PESSOAS[outro].nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {diaSemana(r.data)}, {diaMes(r.data)} · {r.pauta.length} {r.pauta.length === 1 ? 'assunto' : 'assuntos'} na pauta
                    </span>
                  </span>
                  {atrasado
                    ? <Selo className="bg-rose-100 text-rose-700">Não registrado</Selo>
                    : <Selo className="bg-secondary text-muted-foreground">{par.lider === eu ? 'Você conduz' : 'Com seu líder'}</Selo>}
                </button>
              )
            })}
          </div>
        </Painel>

        <Painel titulo="Seus combinados em aberto" icon={Flag} acao={<span className="text-xs text-muted-foreground tabular-nums">{meusCombinados.length}</span>}>
          {!meusCombinados.length && <Vazio>Tudo em dia.</Vazio>}
          {meusCombinados.map(({ combinado: c, reuniao: r, par }) => {
            const atrasado = diasEntre(c.prazo, HOJE) > 0
            const outro = par.lider === eu ? par.liderado : par.lider
            return (
              <div key={c.id} className="flex items-start gap-2.5 py-2">
                <Caixinha marcado={c.feito} onClick={() => acoes.alternarCombinado(c.id)} rotulo="Marcar como feito" />
                <div className="min-w-0 text-sm">
                  {c.texto}
                  <div className="flex flex-wrap gap-2 text-[11.5px] text-muted-foreground mt-0.5">
                    <span className={atrasado ? 'text-amber-700 font-medium' : ''}>Prazo {diaMes(c.prazo)}{atrasado && ' · atrasado'}</span>
                    <span>Do 1:1 com {primeiroNome(outro)} em {diaMes(r.data)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </Painel>
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <Painel titulo="Pediram seu feedback" icon={CircleHelp}>
          {pendentes.length ? pendentes.map((p) => <ItemPedido key={p.id} p={p} paraMim acoes={acoes} />) : <Vazio>Nenhum pedido esperando você.</Vazio>}
        </Painel>
        <Painel titulo="Recebidos recentemente" icon={Heart} acao={verTodos(() => acoes.irPara('feedback', 'recebidos'))}>
          {recentes.length ? recentes.map((f) => <ItemFeedback key={f.id} f={f} modo="recebido" />) : <Vazio>Você ainda não recebeu feedback.</Vazio>}
        </Painel>
      </div>
    </div>
  )
}
