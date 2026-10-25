'use client'

import { useState } from 'react'
import { CircleHelp, Lock, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILARES_CULTURAIS } from '@/lib/pilaresCulturais'
import { PERGUNTAS_EM_ABERTO, PESSOAS, type PessoaId, type TipoFeedback } from '@/lib/feedbackPrototipo'

const campo = 'w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'

function Moldura({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={titulo} className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function OpcoesPessoas({ eu }: { eu: PessoaId }) {
  return (
    <>
      {(Object.keys(PESSOAS) as PessoaId[]).filter((k) => k !== eu).map((k) => (
        <option key={k} value={k}>{PESSOAS[k].nome} · {PESSOAS[k].cargo}</option>
      ))}
    </>
  )
}

function Opcao({ ativo, onClick, titulo, detalhe }: { ativo: boolean; onClick: () => void; titulo: string; detalhe: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn('flex-1 min-w-[120px] text-left rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors', ativo ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary')}
    >
      {titulo}
      <span className="block text-[11.5px] font-normal text-muted-foreground">{detalhe}</span>
    </button>
  )
}

export interface NovoFeedback { para: PessoaId; tipo: TipoFeedback; texto: string; pilar: number | null; publico: boolean }

export function ModalDarFeedback({ eu, paraInicial, onClose, onEnviar }: {
  eu: PessoaId
  paraInicial: PessoaId
  onClose: () => void
  onEnviar: (f: NovoFeedback) => void
}) {
  const [para, setPara] = useState<PessoaId>(paraInicial)
  const [tipo, setTipo] = useState<TipoFeedback>('elogio')
  const [texto, setTexto] = useState('')
  const [pilar, setPilar] = useState('')
  const [publico, setPublico] = useState(true)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    onEnviar({ para, tipo, texto: texto.trim(), pilar: pilar === '' ? null : Number(pilar), publico: tipo === 'elogio' && publico })
  }

  return (
    <Moldura titulo="Dar feedback" onClose={onClose}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          Para quem
          <select value={para} onChange={(e) => setPara(e.target.value as PessoaId)} className={cn(campo, 'font-normal')}><OpcoesPessoas eu={eu} /></select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Tipo</span>
          <div className="flex flex-wrap gap-1.5">
            <Opcao ativo={tipo === 'elogio'} onClick={() => setTipo('elogio')} titulo="Elogio" detalhe="reconhecer algo que deu certo" />
            <Opcao ativo={tipo === 'construtivo'} onClick={() => setTipo('construtivo')} titulo="Construtivo" detalhe="algo para melhorar" />
            <Opcao ativo={tipo === 'sugestao'} onClick={() => setTipo('sugestao')} titulo="Sugestão" detalhe="uma ideia, sem cobrança" />
          </div>
        </div>
        {tipo === 'construtivo' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Um jeito simples de escrever</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-foreground">
              {[['Situação', 'Quando e onde aconteceu'], ['Comportamento', 'O que a pessoa fez, sem julgar'], ['Impacto', 'O que isso causou e o que você espera']].map(([t, d]) => (
                <div key={t} className="rounded-lg bg-secondary px-2.5 py-2">
                  <b className="block text-[10.5px] uppercase tracking-wider text-accent-foreground">{t}</b>{d}
                </div>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          Mensagem
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            placeholder={tipo === 'construtivo' ? 'Situação… Comportamento… Impacto…' : 'Conte o que aconteceu e por que fez diferença'}
            className={cn(campo, 'font-normal min-h-[120px] resize-y leading-relaxed')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          Ligado a um valor da CTZ (opcional)
          <select value={pilar} onChange={(e) => setPilar(e.target.value)} className={cn(campo, 'font-normal')}>
            <option value="">Nenhum</option>
            {PILARES_CULTURAIS.map((p, i) => <option key={p.numero} value={i}>{p.titulo}</option>)}
          </select>
        </label>
        {tipo === 'elogio' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Quem pode ver</span>
            <div className="flex flex-wrap gap-1.5">
              <Opcao ativo={publico} onClick={() => setPublico(true)} titulo="No mural" detalhe="a empresa toda vê e aplaude" />
              <Opcao ativo={!publico} onClick={() => setPublico(false)} titulo="Privado" detalhe="só vocês dois" />
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /> Feedback construtivo e sugestão são sempre privados.</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancelar</button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"><Send className="w-4 h-4" /> Enviar feedback</button>
        </div>
      </form>
    </Moldura>
  )
}

export function ModalPedirFeedback({ eu, onClose, onEnviar }: { eu: PessoaId; onClose: () => void; onEnviar: (para: PessoaId, sobre: string) => void }) {
  const [para, setPara] = useState<PessoaId>(PESSOAS[eu].gestor ?? (eu === 'marina' ? 'ricardo' : 'marina'))
  const [sobre, setSobre] = useState('')
  return (
    <Moldura titulo="Pedir feedback" onClose={onClose}>
      <form
        onSubmit={(e) => { e.preventDefault(); if (sobre.trim()) onEnviar(para, sobre.trim()) }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          Para quem você quer pedir
          <select value={para} onChange={(e) => setPara(e.target.value as PessoaId)} className={cn(campo, 'font-normal')}><OpcoesPessoas eu={eu} /></select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
          Sobre o quê
          <input value={sobre} onChange={(e) => setSobre(e.target.value)} required placeholder="Ex.: minha apresentação de quinta para a diretoria" className={cn(campo, 'font-normal')} />
          <span className="font-normal text-muted-foreground">Pedidos específicos recebem respostas melhores.</span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancelar</button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"><CircleHelp className="w-4 h-4" /> Enviar pedido</button>
        </div>
      </form>
    </Moldura>
  )
}

export function GavetaDecisoes({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label="O que falta decidir" className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">O que falta decidir</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">Perguntas para a reunião. As respostas definem as regras de acesso e o banco antes de construir o módulo de verdade.</p>
        <ol className="list-decimal pl-5 mt-4 flex flex-col gap-3.5">
          {PERGUNTAS_EM_ABERTO.map(([t, d]) => (
            <li key={t} className="text-sm">
              <b className="block font-semibold text-foreground">{t}</b>
              <span className="text-muted-foreground">{d}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
