'use client'

import { useEffect, useState } from 'react'
import { Check, CircleHelp, FlaskConical, MessagesSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HOJE, dadosIniciais, diaMes, diasEntre, novoId, somarDias,
  type Aba, type AcoesFeedback, type PessoaId, type SubFeedback, type VerComo,
} from '@/lib/feedbackPrototipo'
import AbaVisaoGeral from '@/components/feedback/AbaVisaoGeral'
import AbaFeedback, { Mural } from '@/components/feedback/AbaFeedback'
import AbaOneOnOne from '@/components/feedback/AbaOneOnOne'
import AbaAcompanhamento from '@/components/feedback/AbaAcompanhamento'
import { GavetaDecisoes, ModalDarFeedback, ModalPedirFeedback } from '@/components/feedback/ModaisFeedback'
import { primeiroNome } from '@/components/feedback/comum'

// Conteúdo do protótipo de Feedback e One on One. Guarda tudo em memória
// (dados fictícios de src/lib/feedbackPrototipo.ts); quem confere o acesso é
// a página /feedback.

type Dados = ReturnType<typeof dadosIniciais>

export default function FeedbackPrototipo() {
  const [dados, setDados] = useState<Dados>(dadosIniciais)
  const [verComo, setVerComo] = useState<VerComo>('marina')
  const [aba, setAba] = useState<Aba>('geral')
  const [sub, setSub] = useState<SubFeedback>('recebidos')
  const [parId, setParId] = useState(1)
  const [modal, setModal] = useState<{ tipo: 'dar'; para: PessoaId; pedidoId?: number } | { tipo: 'pedir' } | null>(null)
  const [decisoes, setDecisoes] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(t)
  }, [aviso])

  // O RH não é uma pessoa da lista fictícia: vê só o Acompanhamento e o Mural.
  const rh = verComo === 'rh'
  const eu: PessoaId = rh ? 'marina' : verComo

  function mudar(fn: (d: Dados) => void) {
    setDados((d) => { const c = structuredClone(d); fn(c); return c })
  }
  function acharReuniao(d: Dados, reuniaoId: number) {
    for (const p of d.pares) for (const r of p.reunioes) if (r.id === reuniaoId) return r
    throw new Error('Encontro não encontrado')
  }

  const acoes: AcoesFeedback = {
    irPara: (a, s) => { setAba(a); if (s) setSub(s) },
    abrirPar: (id) => { setParId(id); setAba('oneonone') },
    responderPedido: (id) => {
      const p = dados.pedidos.find((x) => x.id === id)
      if (p) setModal({ tipo: 'dar', para: p.de, pedidoId: id })
    },
    aplaudir: (id) => mudar((d) => {
      const f = d.feedbacks.find((x) => x.id === id)
      if (f) { f.bati = !f.bati; f.palmas += f.bati ? 1 : -1 }
    }),
    alternarCombinado: (id) => {
      const atual = dados.pares.flatMap((p) => p.reunioes.flatMap((r) => r.combinados)).find((c) => c.id === id)
      mudar((d) => {
        for (const p of d.pares) for (const r of p.reunioes) for (const c of r.combinados) {
          if (c.id === id) c.feito = !c.feito
        }
      })
      if (atual && !atual.feito) setAviso('Combinado concluído')
    },
    alternarPauta: (rid, i) => mudar((d) => { const r = acharReuniao(d, rid); r.pauta[i].feito = !r.pauta[i].feito }),
    definirHumor: (rid, n) => {
      mudar((d) => { acharReuniao(d, rid).humor = n })
      const par = dados.pares.find((p) => p.reunioes.some((r) => r.id === rid))
      if (par) setAviso(`Resposta enviada para ${primeiroNome(par.lider)}`)
    },
    adicionarPauta: (rid, texto) => mudar((d) => { acharReuniao(d, rid).pauta.push({ texto, autor: eu, feito: false }) }),
    adicionarCombinado: (rid, texto, responsavel) => mudar((d) => {
      const r = acharReuniao(d, rid)
      r.combinados.push({ id: novoId(), texto, responsavel, prazo: somarDias(r.data, 14), feito: false })
    }),
    editarNota: (rid, campo, valor) => mudar((d) => { acharReuniao(d, rid)[campo] = valor }),
    concluirReuniao: (pid, rid) => {
      const par = dados.pares.find((p) => p.id === pid)
      const r = par?.reunioes.find((x) => x.id === rid)
      if (!par || !r) return
      // Se o encontro ficou para trás sem registro, o próximo conta a partir de hoje.
      const base = diasEntre(r.data, HOJE) > 0 ? HOJE : r.data
      const data = somarDias(base, par.mensal ? 28 : 14)
      mudar((d) => {
        const p = d.pares.find((x) => x.id === pid)!
        acharReuniao(d, rid).status = 'realizada'
        p.reunioes.push({ id: novoId(), data, status: 'agendada', humor: null, pauta: [], combinados: [], notas: '', privadas: '' })
      })
      setAviso(`1:1 registrado. O próximo ficou para ${diaMes(data)}, com os combinados em aberto.`)
    },
  }

  const abas: [Aba, string][] = rh
    ? [['acomp', 'Acompanhamento'], ['mural', 'Mural']]
    : verComo === 'rafael'
      ? [['geral', 'Visão geral'], ['feedback', 'Feedback'], ['oneonone', 'One on One']]
      : [['geral', 'Visão geral'], ['feedback', 'Feedback'], ['oneonone', 'One on One'], ['acomp', 'Acompanhamento']]
  const abaAtual = abas.some(([a]) => a === aba) ? aba : abas[0][0]
  const pendentes = dados.pedidos.filter((p) => p.para === eu && !p.respondido).length

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 rounded-xl text-[13px] border border-dashed border-violet-300 bg-violet-50 text-violet-800">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span><b className="font-semibold">Protótipo para discussão.</b> Pessoas e textos fictícios, nada é salvo. Só você e a Priscila veem esta página.</span>
        <span className="flex-1" />
        <label className="flex items-center gap-2">
          Ver como
          <select
            value={verComo}
            onChange={(e) => { setVerComo(e.target.value as VerComo); setAba(e.target.value === 'rh' ? 'acomp' : 'geral'); setSub('recebidos') }}
            className="rounded-full border border-violet-300 bg-card text-foreground px-2.5 py-1 text-xs"
          >
            <option value="marina">Marina Duarte · líder</option>
            <option value="rafael">Rafael Antunes · liderado</option>
            <option value="rh">Equipe de RH</option>
          </select>
        </label>
        <button onClick={() => setDecisoes(true)} className="rounded-full border border-violet-300 px-3 py-1 text-xs font-semibold hover:bg-violet-100">O que falta decidir</button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <MessagesSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Feedback e One on One</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {rh ? 'Como estão as conversas entre líderes e times. O RH vê números, não o que foi escrito.' : 'Conversas que fazem o time crescer, sem esperar o ciclo de avaliação.'}
            </p>
          </div>
        </div>
        {!rh && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setModal({ tipo: 'pedir' })} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary">
              <CircleHelp className="w-4 h-4" /> Pedir feedback
            </button>
            <button
              onClick={() => setModal({ tipo: 'dar', para: eu === 'marina' ? 'rafael' : 'marina' })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Send className="w-4 h-4" /> Dar feedback
            </button>
          </div>
        )}
      </div>

      <div role="tablist" className="flex gap-0.5 bg-secondary rounded-2xl p-1 w-fit max-w-full overflow-x-auto">
        {abas.map(([a, rotulo]) => (
          <button
            key={a}
            role="tab"
            aria-selected={abaAtual === a}
            onClick={() => setAba(a)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm whitespace-nowrap transition-colors',
              abaAtual === a ? 'bg-card text-foreground font-semibold shadow-sm' : 'text-muted-foreground font-medium hover:text-foreground'
            )}
          >
            {rotulo}
            {a === 'feedback' && pendentes > 0 && <span className="font-mono text-[11px] bg-primary text-primary-foreground rounded-full px-1.5">{pendentes}</span>}
          </button>
        ))}
      </div>

      {abaAtual === 'geral' && <AbaVisaoGeral eu={eu} {...dados} acoes={acoes} />}
      {abaAtual === 'feedback' && <AbaFeedback eu={eu} sub={sub} {...dados} acoes={acoes} />}
      {abaAtual === 'mural' && <Mural feedbacks={dados.feedbacks} acoes={acoes} />}
      {abaAtual === 'oneonone' && <AbaOneOnOne eu={eu} pares={dados.pares} parId={parId} feedbacks={dados.feedbacks} acoes={acoes} />}
      {abaAtual === 'acomp' && <AbaAcompanhamento verComo={verComo} pares={dados.pares} feedbacks={dados.feedbacks} />}

      {modal?.tipo === 'dar' && (
        <ModalDarFeedback
          eu={eu}
          paraInicial={modal.para}
          onClose={() => setModal(null)}
          onEnviar={(f) => {
            const pedidoId = modal.pedidoId
            mudar((d) => {
              d.feedbacks.unshift({ id: novoId(), de: eu, data: HOJE, palmas: 0, ...f })
              if (pedidoId) d.pedidos.forEach((p) => { if (p.id === pedidoId) p.respondido = true })
            })
            setModal(null); setAba('feedback'); setSub('enviados')
            setAviso(`Feedback enviado para ${primeiroNome(f.para)}`)
          }}
        />
      )}
      {modal?.tipo === 'pedir' && (
        <ModalPedirFeedback
          eu={eu}
          onClose={() => setModal(null)}
          onEnviar={(para, sobre) => {
            mudar((d) => { d.pedidos.unshift({ id: novoId(), de: eu, para, sobre, data: HOJE, respondido: false }) })
            setModal(null); setAba('feedback'); setSub('pedidos')
            setAviso(`Pedido enviado para ${primeiroNome(para)}`)
          }}
        />
      )}
      {decisoes && <GavetaDecisoes onClose={() => setDecisoes(false)} />}
      {aviso && (
        <div role="status" className="fixed z-50 left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-medium shadow-glass-lg max-w-[calc(100%-2rem)]">
          <Check className="w-4 h-4 shrink-0" /> {aviso}
        </div>
      )}
    </div>
  )
}
