'use client'

import { useState } from 'react'
import { Check, Flag, Heart, ListChecks, Lock, Plus, StickyNote, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HOJE, HUMOR, METAS, PESSOAS, ROTULO_TIPO,
  combinadosAbertos, diaMes, diaSemana, diasEntre, proximaReuniao, situacaoPar, ultimaReuniao,
  type AcoesFeedback, type Feedback, type ParOneOnOne, type PessoaId,
} from '@/lib/feedbackPrototipo'
import { AvatarPessoa, Caixinha, ESTILO_SITUACAO, ESTILO_TIPO, Selo, primeiroNome } from './comum'
import { porData } from './AbaFeedback'

function Bloco({ titulo, dica, icon: Icon, children }: {
  titulo: string
  dica?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-foreground mb-2.5">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />} {titulo}
        {dica && <span className="font-normal text-xs text-muted-foreground">{dica}</span>}
      </h3>
      {children}
    </div>
  )
}

const campo = 'border border-border bg-background rounded-xl px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function AbaOneOnOne({ eu, pares, parId, feedbacks, acoes }: {
  eu: PessoaId
  pares: ParOneOnOne[]
  parId: number
  feedbacks: Feedback[]
  acoes: AcoesFeedback
}) {
  const meus = pares.filter((p) => p.lider === eu || p.liderado === eu)
  const time = meus.filter((p) => p.lider === eu)
  const comLider = meus.filter((p) => p.liderado === eu)
  const par = meus.find((p) => p.id === parId) ?? time[0] ?? meus[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
      <aside className="rounded-2xl border border-border bg-card shadow-glass p-2.5">
        {time.length > 0 && <Grupo titulo={`Seu time · ${time.length}`} pares={time} eu={eu} selecionado={par.id} acoes={acoes} />}
        {comLider.length > 0 && <Grupo titulo="Com seu líder" pares={comLider} eu={eu} selecionado={par.id} acoes={acoes} />}
      </aside>
      <DetalhePar key={par.id} par={par} eu={eu} feedbacks={feedbacks} acoes={acoes} />
    </div>
  )
}

function Grupo({ titulo, pares, eu, selecionado, acoes }: {
  titulo: string; pares: ParOneOnOne[]; eu: PessoaId; selecionado: number; acoes: AcoesFeedback
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      {pares.map((p) => {
        const outro = p.lider === eu ? p.liderado : p.lider
        const u = ultimaReuniao(p)
        const s = situacaoPar(p)
        return (
          <button
            key={p.id}
            onClick={() => acoes.abrirPar(p.id)}
            className={cn(
              'flex items-center gap-2.5 text-left rounded-xl border px-2.5 py-2 transition-colors',
              p.id === selecionado ? 'bg-accent border-primary/25' : 'border-transparent hover:bg-secondary'
            )}
          >
            <AvatarPessoa id={outro} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-foreground truncate">{PESSOAS[outro].nome}</span>
              <span className="block text-xs text-muted-foreground">{u ? `Último ${diaMes(u.data)}` : 'Nenhum ainda'}</span>
            </span>
            <Selo className={ESTILO_SITUACAO[s.tom]}>{s.texto}</Selo>
          </button>
        )
      })}
    </div>
  )
}

function DetalhePar({ par, eu, feedbacks, acoes }: { par: ParOneOnOne; eu: PessoaId; feedbacks: Feedback[]; acoes: AcoesFeedback }) {
  const [reuniaoId, setReuniaoId] = useState<number | null>(null)
  const [novaPauta, setNovaPauta] = useState('')
  const [novoComb, setNovoComb] = useState('')
  const [respComb, setRespComb] = useState<PessoaId>(par.liderado)

  const euLider = par.lider === eu
  const outro = euLider ? par.liderado : par.lider
  const r = par.reunioes.find((x) => x.id === reuniaoId) ?? proximaReuniao(par) ?? ultimaReuniao(par)!
  const agendada = r.status === 'agendada'
  const vemDeAntes = agendada ? combinadosAbertos(par).filter((a) => a.reuniao.data < r.data) : []
  const quemSou = (id: PessoaId) => (id === eu ? 'Você' : primeiroNome(id))

  const metas = METAS[par.liderado] ?? []
  const recentes = feedbacks
    .filter((f) => f.para === par.liderado && (f.publico || f.de === eu || par.liderado === eu))
    .sort(porData)
    .slice(0, 3)
  const historico = par.reunioes.filter((x) => x.status === 'realizada' && x.humor)

  function adicionarPauta(e: React.FormEvent) {
    e.preventDefault()
    if (!novaPauta.trim()) return
    acoes.adicionarPauta(r.id, novaPauta.trim())
    setNovaPauta('')
  }
  function adicionarCombinado(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComb.trim()) return
    acoes.adicionarCombinado(r.id, novoComb.trim(), respComb)
    setNovoComb('')
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-glass p-5 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <AvatarPessoa id={outro} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground tracking-tight">1:1 com {PESSOAS[outro].nome}</h2>
          <p className="text-xs text-muted-foreground">{PESSOAS[outro].cargo} · {par.cadencia}</p>
        </div>
        {agendada ? (
          <button
            onClick={() => { acoes.concluirReuniao(par.id, r.id); setReuniaoId(null) }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Check className="w-4 h-4" /> Concluir este 1:1
          </button>
        ) : (
          <Selo className="bg-emerald-100 text-emerald-800">Realizado em {diaMes(r.data)}</Selo>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto mt-4 pb-1" role="tablist" aria-label="Encontros">
        {par.reunioes.slice().reverse().map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === r.id}
            onClick={() => setReuniaoId(x.id)}
            className={cn(
              'shrink-0 text-left rounded-xl border px-3 py-1.5 transition-colors',
              x.id === r.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary'
            )}
          >
            <span className={cn('block font-mono text-xs font-semibold', x.id === r.id ? 'text-primary' : 'text-foreground')}>{diaSemana(x.data)} {diaMes(x.data)}</span>
            <span className="block text-[11px] text-muted-foreground">
              {x.status === 'agendada' ? (diasEntre(x.data, HOJE) > 0 ? 'Não registrado' : 'Próximo') : 'Realizado'}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-x-6">
        <div className="min-w-0">
          <Bloco
            titulo={euLider ? `Como ${primeiroNome(outro)} está?` : 'Como você está?'}
            dica={euLider ? 'quem responde é o liderado, antes do encontro' : 'só você e seu líder veem'}
          >
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const pode = !euLider && agendada
                return (
                  <button
                    key={n}
                    disabled={!pode}
                    onClick={() => acoes.definirHumor(r.id, n)}
                    className={cn(
                      'min-w-[62px] flex flex-col items-center rounded-xl border px-2.5 py-1.5',
                      r.humor === n ? 'border-primary bg-primary/5' : 'border-border bg-card',
                      pode ? 'hover:border-primary' : 'cursor-default'
                    )}
                  >
                    <span className={cn('font-mono text-[15px] font-semibold', r.humor === n ? 'text-primary' : 'text-foreground')}>{n}</span>
                    <span className="text-[11px] text-muted-foreground">{HUMOR[n]}</span>
                  </button>
                )
              })}
            </div>
            {r.humor == null && euLider && <p className="text-xs text-muted-foreground mt-1.5">{primeiroNome(outro)} ainda não respondeu.</p>}
          </Bloco>

          <Bloco titulo="Pauta" dica="os dois adicionam assuntos durante a quinzena" icon={ListChecks}>
            {!r.pauta.length && <p className="text-xs text-muted-foreground">Ninguém adicionou assuntos ainda.</p>}
            {r.pauta.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <Caixinha marcado={p.feito} onClick={() => acoes.alternarPauta(r.id, i)} rotulo="Marcar como conversado" />
                <div className={cn('min-w-0 text-sm', p.feito && 'line-through text-muted-foreground')}>
                  {p.texto}
                  <div className="text-[11.5px] text-muted-foreground no-underline">{quemSou(p.autor)} adicionou</div>
                </div>
              </div>
            ))}
            {agendada && (
              <form onSubmit={adicionarPauta} className="flex gap-2 mt-1.5">
                <input value={novaPauta} onChange={(e) => setNovaPauta(e.target.value)} placeholder="Adicionar assunto à pauta" aria-label="Novo assunto" className={cn(campo, 'flex-1 min-w-0')} />
                <button className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
              </form>
            )}
          </Bloco>

          <Bloco titulo="Combinados" dica="quem faz o quê, até quando" icon={Flag}>
            {vemDeAntes.map(({ combinado: c, reuniao: origem }) => (
              <div key={c.id} className="flex items-start gap-2.5 py-1.5">
                <Caixinha marcado={c.feito} onClick={() => acoes.alternarCombinado(c.id)} rotulo="Marcar como feito" />
                <div className="min-w-0 text-sm">
                  {c.texto}
                  <div className="flex flex-wrap gap-2 text-[11.5px] text-muted-foreground">
                    <span>{quemSou(c.responsavel)} · prazo {diaMes(c.prazo)}</span>
                    <span className="text-amber-700">Em aberto desde o 1:1 de {diaMes(origem.data)}</span>
                  </div>
                </div>
              </div>
            ))}
            {r.combinados.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 py-1.5">
                <Caixinha marcado={c.feito} onClick={() => acoes.alternarCombinado(c.id)} rotulo="Marcar como feito" />
                <div className={cn('min-w-0 text-sm', c.feito && 'line-through text-muted-foreground')}>
                  {c.texto}
                  <div className="text-[11.5px] text-muted-foreground">{quemSou(c.responsavel)} · prazo {diaMes(c.prazo)}</div>
                </div>
              </div>
            ))}
            {!r.combinados.length && !vemDeAntes.length && <p className="text-xs text-muted-foreground">Nenhum combinado.</p>}
            {agendada && (
              <form onSubmit={adicionarCombinado} className="flex flex-wrap gap-2 mt-1.5">
                <input value={novoComb} onChange={(e) => setNovoComb(e.target.value)} placeholder="Novo combinado" aria-label="Novo combinado" className={cn(campo, 'flex-1 min-w-[160px]')} />
                <select value={respComb} onChange={(e) => setRespComb(e.target.value as PessoaId)} aria-label="Responsável" className={campo}>
                  <option value={par.liderado}>{primeiroNome(par.liderado)}</option>
                  <option value={par.lider}>{primeiroNome(par.lider)}</option>
                </select>
                <button className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
              </form>
            )}
          </Bloco>

          <Bloco titulo="Anotações do encontro" dica="os dois veem" icon={StickyNote}>
            <textarea
              value={r.notas}
              onChange={(e) => acoes.editarNota(r.id, 'notas', e.target.value)}
              placeholder="O que foi conversado e decidido"
              aria-label="Anotações do encontro"
              className={cn(campo, 'w-full min-h-[92px] resize-y leading-relaxed text-sm')}
            />
          </Bloco>

          {euLider && (
            <div className="mt-4 rounded-2xl bg-secondary p-4">
              <h3 className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-foreground mb-2.5">
                <Lock className="w-4 h-4 text-muted-foreground" /> Suas anotações privadas
                <span className="font-normal text-xs text-muted-foreground">só você vê, {primeiroNome(outro)} não</span>
              </h3>
              <textarea
                value={r.privadas}
                onChange={(e) => acoes.editarNota(r.id, 'privadas', e.target.value)}
                placeholder="Percepções e lembretes para você"
                aria-label="Anotações privadas"
                className={cn(campo, 'w-full min-h-[80px] resize-y leading-relaxed text-sm bg-card')}
              />
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <Bloco titulo="Metas do ciclo" icon={Target}>
            {metas.map(([nome, pct]) => (
              <div key={nome} className="py-1.5">
                <div className="flex justify-between gap-2 text-[13px]"><span>{nome}</span><span className="font-mono text-muted-foreground">{pct}%</span></div>
                <div className="h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-1.5">Viria das metas individuais da Avaliação de Desempenho.</p>
          </Bloco>

          <Bloco titulo={`Feedbacks recentes de ${par.liderado === eu ? 'você' : primeiroNome(par.liderado)}`} icon={Heart}>
            {!recentes.length && <p className="text-xs text-muted-foreground">Nenhum ainda.</p>}
            {recentes.map((f) => (
              <div key={f.id} className="flex items-start gap-2 py-1.5">
                <Selo className={ESTILO_TIPO[f.tipo]}>{ROTULO_TIPO[f.tipo]}</Selo>
                <div className="min-w-0 text-xs text-foreground">
                  <p className="line-clamp-3">{f.texto}</p>
                  <p className="text-muted-foreground mt-0.5">{primeiroNome(f.de)} · {diaMes(f.data)}</p>
                </div>
              </div>
            ))}
          </Bloco>

          <Bloco titulo="Termômetro nos últimos encontros">
            <div className="flex items-end gap-2 h-16">
              {historico.map((x) => (
                <div key={x.id} title={`${diaMes(x.data)}: ${x.humor} · ${HUMOR[x.humor!]}`} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn('w-full max-w-[28px] rounded-md', x.humor! <= 2 ? 'bg-amber-500' : 'bg-primary')} style={{ height: `${x.humor! * 9}px` }} />
                  <span className="font-mono text-[10.5px] text-muted-foreground">{diaMes(x.data)}</span>
                </div>
              ))}
            </div>
          </Bloco>
        </aside>
      </div>
    </section>
  )
}
