'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ICPS, CASOS_NEGOCIACAO, type IcpId, type CasoNegociacao } from '@/lib/negociacao/casos'
import Conversa from '@/components/autoconhecimento/Conversa'

const ENDPOINT = '/api/assistente-negociacao'

const SITUACOES_PREPARAR = [
  'Tenho reunião com uma família dona de fazenda que gostou da proposta, mas não decide.',
  'Um investidor pediu mais uma rodada de números e sumiu.',
  'Um corretor diz que outra loteadora oferece entrada ao dono da área.',
  'O cliente achou nosso projeto caro e recebeu um orçamento menor.',
]

// Assistente de negociação (pedido da Priscila, 26/10/2026; só o piloto por
// enquanto). Preparar = negociação real; Treinar = a IA faz o cliente de um
// dos 8 casos do laboratório e, no fim, dá o retorno com o checklist do
// observador. `simularFuncionarioId`: simulação do Felipe Marques (Igor/
// Priscila/Sandra), para o "Eu × Outro" usar o tipo dele.
export default function AssistenteNegociacao({ simularFuncionarioId }: { simularFuncionarioId?: string }) {
  const [aba, setAba] = useState<'preparar' | 'treinar'>('preparar')
  const [icpId, setIcpId] = useState<IcpId | ''>('')
  const [casoId, setCasoId] = useState<number | null>(null)
  const extra = simularFuncionarioId ? { simularFuncionarioId } : {}
  const caso = CASOS_NEGOCIACAO.find((c) => c.id === casoId)

  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-xl bg-secondary text-xs font-semibold">
        {([['preparar', 'Preparar uma negociação'], ['treinar', 'Treinar com um caso']] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              aba === valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* As duas abas ficam montadas: trocar de aba não perde a conversa. */}
      <div className={cn('space-y-3', aba !== 'preparar' && 'hidden')}>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Com quem é a negociação?</p>
          <div className="flex flex-wrap gap-2">
            {ICPS.map((icp) => (
              <button
                key={icp.id}
                type="button"
                onClick={() => setIcpId(icpId === icp.id ? '' : icp.id)}
                title={icp.precisaDe}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-xs transition-colors',
                  icpId === icp.id ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {icp.nome}
              </button>
            ))}
          </div>
          {icpId && (
            <p className="text-xs text-muted-foreground">
              Precisa de: {ICPS.find((i) => i.id === icpId)?.precisaDe}
            </p>
          )}
        </div>
        <Conversa
          endpoint={ENDPOINT}
          montarCorpo={(msg, historico) => ({ modo: 'preparar', mensagem: msg, historico, icpId: icpId || undefined, ...extra })}
          sugestoes={SITUACOES_PREPARAR}
          placeholder="Conte quem é o cliente, o que ele disse e onde a negociação está..."
          introducao={{
            titulo: 'Conte a negociação que você tem pela frente: quem é o cliente, o que ele disse ou fez e onde a conversa travou.',
            detalhe: 'Se faltar algo, faço até 3 perguntas. Depois monto a primeira pergunta, o roteiro e o que evitar com esse cliente.',
          }}
        />
      </div>

      <div className={cn('space-y-3', aba !== 'treinar' && 'hidden')}>
        {caso ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Caso {caso.id} · {caso.rotuloIcp}
              </p>
              <button type="button" onClick={() => setCasoId(null)} className="text-xs text-primary hover:underline">
                Trocar de caso
              </button>
            </div>
            <PreparacaoCaso caso={caso} />
            <Conversa
              key={caso.id}
              endpoint={ENDPOINT}
              mensagensIniciais={[{ role: 'model', texto: caso.frase }]}
              montarCorpo={(msg, historico) => ({ modo: 'treinar', casoId: caso.id, mensagem: msg, historico, ...extra })}
              encerrar={{
                rotulo: 'Encerrar e pedir retorno',
                tituloResposta: 'Retorno do treino',
                montarCorpo: (historico) => ({ modo: 'retorno', casoId: caso.id, historico, ...extra }),
              }}
              sugestoes={[]}
              placeholder="Você é o negociador. Responda ao cliente..."
            />
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Escolha um caso. O assistente faz o papel do cliente e só avança se você fizer o que ele precisa. No fim, clique em
              &quot;Encerrar e pedir retorno&quot; para ver a avaliação com o checklist do observador.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CASOS_NEGOCIACAO.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCasoId(c.id)}
                  className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors space-y-1.5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Caso {c.id} · {c.rotuloIcp} · Tipo {c.tipo}
                  </p>
                  <p className="text-sm font-bold text-foreground">{c.titulo}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.situacao}</p>
                  <p className="text-xs text-foreground italic">&quot;{c.frase}&quot;</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Folha "Preparação do negociador" do caso, como no laboratório.
function PreparacaoCaso({ caso }: { caso: CasoNegociacao }) {
  const necessidade = ICPS.find((i) => i.id === caso.icp)?.precisaDe
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">{caso.titulo}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{caso.situacao}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-semibold text-foreground">Seu desafio</p>
          <p className="text-muted-foreground">{caso.desafio}</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Tipo {caso.tipo} · olha para {caso.olhaPara}</p>
          <p className="text-muted-foreground">O ICP precisa de: {necessidade}</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Como abordar</p>
          <ul className="text-muted-foreground list-disc pl-4">
            {caso.comoAbordar.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground">Evite</p>
          <ul className="text-muted-foreground list-disc pl-4">
            {caso.evite.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      </div>
      <p className="text-xs">
        <span className="font-semibold text-foreground">Sua pergunta (pulo do gato): </span>
        <span className="text-muted-foreground">{caso.puloDoGato}</span>
      </p>
    </div>
  )
}
