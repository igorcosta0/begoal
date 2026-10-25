'use client'

import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACOMPANHAMENTO_AREAS, HUMOR, PESSOAS,
  combinadosAbertos, diaMes, proximaReuniao, situacaoPar, ultimaReuniao,
  type Feedback, type ParOneOnOne, type VerComo,
} from '@/lib/feedbackPrototipo'
import { AvatarPessoa, ESTILO_SITUACAO, Painel, Selo } from './comum'

function Numero({ valor, rotulo, detalhe, tom }: { valor: string; rotulo: string; detalhe: string; tom?: 'bom' | 'atencao' }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-glass p-5">
      <p className="font-display text-3xl font-bold text-foreground tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{rotulo}</p>
      <p className={cn('text-xs mt-2', tom === 'bom' ? 'text-emerald-700' : tom === 'atencao' ? 'text-amber-700' : 'text-muted-foreground')}>{detalhe}</p>
    </div>
  )
}

const th = 'text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border'
const td = 'px-3 py-2.5 border-b border-border tabular-nums'

export default function AbaAcompanhamento({ verComo, pares, feedbacks }: { verComo: VerComo; pares: ParOneOnOne[]; feedbacks: Feedback[] }) {
  if (verComo === 'rh') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm bg-primary/5 border border-primary/20">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>O RH acompanha a <b>frequência</b> das conversas e o <b>volume</b> de feedbacks. O conteúdo dos feedbacks privados e as anotações dos 1:1 não aparecem aqui.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Numero valor="78%" rotulo="das pessoas com 1:1 nos últimos 30 dias" detalhe="+12 pontos desde setembro" tom="bom" />
          <Numero valor="46" rotulo="feedbacks dados em outubro" detalhe="31 elogios · 12 construtivos · 3 sugestões" />
          <Numero valor="6" rotulo="pessoas sem 1:1 há mais de 30 dias" detalhe="em 3 áreas" tom="atencao" />
        </div>
        <Painel titulo="Por área" acao={<span className="text-xs text-muted-foreground">outubro de 2026</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead><tr><th className={th}>Área</th><th className={th}>Líderes</th><th className={th}>Liderados</th><th className={th}>1:1 em dia</th><th className={th}>Feedbacks no mês</th></tr></thead>
              <tbody>
                {ACOMPANHAMENTO_AREAS.map((a) => (
                  <tr key={a.area} className="last:[&>td]:border-b-0">
                    <td className={cn(td, 'font-semibold')}>{a.area}</td>
                    <td className={td}>{a.lideres}</td>
                    <td className={td}>{a.liderados}</td>
                    <td className={td}>
                      <span className="inline-block align-middle w-24 h-1.5 bg-secondary rounded-full overflow-hidden mr-2">
                        <span className={cn('block h-full rounded-full', a.emDia < 75 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${a.emDia}%` }} />
                      </span>
                      {a.emDia}%
                    </td>
                    <td className={td}>{a.feedbacks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>
    )
  }

  const time = pares.filter((p) => p.lider === verComo)
  const emDia = time.filter((p) => situacaoPar(p).tom === 'ok').length
  const abertos = time.reduce((n, p) => n + combinadosAbertos(p).length, 0)
  const dadosNoMes = feedbacks.filter((f) => f.de === verComo && f.data >= '2026-10-01').length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Numero
          valor={`${emDia} de ${time.length}`}
          rotulo="liderados com 1:1 em dia"
          detalhe={time.length - emDia ? `${time.length - emDia} pedem atenção` : 'tudo certo'}
          tom={time.length - emDia ? 'atencao' : 'bom'}
        />
        <Numero valor={String(abertos)} rotulo="combinados em aberto com o time" detalhe="somando você e eles" />
        <Numero valor={String(dadosNoMes)} rotulo="feedbacks que você deu em outubro" detalhe="sugestão: 1 por pessoa no mês" />
      </div>
      <Painel titulo="Seu time">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead><tr><th className={th}>Pessoa</th><th className={th}>Último 1:1</th><th className={th}>Próximo</th><th className={th}>Termômetro</th><th className={th}>Combinados abertos</th><th className={th}>Situação</th></tr></thead>
            <tbody>
              {time.map((p) => {
                const u = ultimaReuniao(p), px = proximaReuniao(p), s = situacaoPar(p)
                return (
                  <tr key={p.id} className="last:[&>td]:border-b-0">
                    <td className={td}><span className="flex items-center gap-2"><AvatarPessoa id={p.liderado} tamanho="xs" /><b className="font-semibold">{PESSOAS[p.liderado].nome}</b></span></td>
                    <td className={cn(td, 'font-mono')}>{u ? diaMes(u.data) : '—'}</td>
                    <td className={cn(td, 'font-mono')}>{px ? diaMes(px.data) : '—'}</td>
                    <td className={td}>{u?.humor ? `${u.humor} · ${HUMOR[u.humor]}` : '—'}</td>
                    <td className={td}>{combinadosAbertos(p).length}</td>
                    <td className={td}><Selo className={ESTILO_SITUACAO[s.tom]}>{s.texto}</Selo></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  )
}
