'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TIPOS_ENEAGRAMA, NOME_INSTINTO, type Instinto } from '@/lib/eneagrama/tipos'
import type { ResumoTime } from '@/lib/queries/eneagrama'
import { ChevronDown } from 'lucide-react'

// Peças visuais do Mapa de si e do Mapa do time (saíram de
// autoconhecimento/page.tsx na repaginada de 30/09/2026). As travas de acesso
// continuam todas na página.

export type TipoEneagramaDados = (typeof TIPOS_ENEAGRAMA)[number]

export function formatarSequencia(sequencia: string) {
  return sequencia
    .split('/')
    .map((i) => NOME_INSTINTO[i.trim() as Instinto] ?? i.trim())
    .join(' → ')
}

// Mapa do time (pedido 14/09/2026): transforma os números agregados de
// resumo_time_liderado() num parágrafo — nunca cita tipo individual, só a
// composição do time nos 3 centros do Eneagrama. Time com menos de 3 pessoas
// mapeadas não é resumido: a divisão em 3 grupos já daria para adivinhar quem é quem.
export function resumirTime(resumo: ResumoTime): string {
  const { instintivo, emocional, racional, totalLiderados, totalMapeados } = resumo
  if (totalMapeados === 0) {
    return totalLiderados > 0
      ? 'Nenhum dos seus liderados diretos tem perfil de Eneagrama mapeado ainda.'
      : 'Você não tem liderados diretos no organograma.'
  }
  if (totalMapeados < 3) {
    return 'Seu time mapeado ainda é pequeno demais (menos de 3 pessoas) para resumir sem risco de dar para identificar quem é quem.'
  }
  const pct = (n: number) => Math.round((n / totalMapeados) * 100)
  const centros = [
    { nome: 'mais técnico e analítico', valor: racional },
    { nome: 'mais sentimental e relacional', valor: emocional },
    { nome: 'mais orientado à ação e ao resultado prático', valor: instintivo },
  ]
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const naoMapeados = totalLiderados - totalMapeados
  return `Seu time (${totalMapeados} de ${totalLiderados} liderados diretos com perfil mapeado) tende a ser ${centros
    .map((c) => `${pct(c.valor)}% ${c.nome}`)
    .join(', ')}.${naoMapeados > 0 ? ` ${naoMapeados} ainda não tem perfil mapeado.` : ''}`
}

// Abertura de cada mapa: número em destaque, título e descrição.
export function CabecalhoMapa({
  numero,
  titulo,
  descricao,
  tom,
}: {
  numero: number
  titulo: string
  descricao: string
  tom: 'primary' | 'amber'
}) {
  return (
    <header className="flex items-start gap-4">
      <span
        className={cn(
          'w-12 h-12 rounded-2xl grid place-items-center font-display text-xl font-bold shrink-0 shadow-sm',
          tom === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'
        )}
      >
        {numero}
      </span>
      <div>
        <p className={cn('text-[10px] font-bold uppercase tracking-widest', tom === 'primary' ? 'text-primary' : 'text-amber-600')}>
          Mapa {numero}
        </p>
        <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">{titulo}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{descricao}</p>
      </div>
    </header>
  )
}

// Diagrama do Eneagrama: tipo em destaque, asas e as duas flechas (segurança e estresse).
// Posição de cada número no círculo: o 9 no topo, os demais a cada 40° no sentido horário.
function DiagramaEneagrama({ tipo }: { tipo: TipoEneagramaDados }) {
  const pos = (n: number) => {
    const ang = (((n % 9) * 40 - 90) * Math.PI) / 180
    return { x: 100 + 78 * Math.cos(ang), y: 100 + 78 * Math.sin(ang) }
  }
  const pts = (ns: number[]) => ns.map((n) => `${pos(n).x},${pos(n).y}`).join(' ')
  const eu = pos(tipo.numero)
  const seg = pos(tipo.flechas.seguranca.tipo)
  const est = pos(tipo.flechas.estresse.tipo)
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48" role="img" aria-label={`Diagrama do Eneagrama com o tipo ${tipo.numero} em destaque`}>
      <circle cx={100} cy={100} r={78} fill="none" stroke="hsl(var(--border))" strokeWidth={1.2} />
      <polygon points={pts([9, 3, 6])} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
      <polygon points={pts([1, 4, 2, 8, 5, 7])} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
      <line x1={eu.x} y1={eu.y} x2={seg.x} y2={seg.y} stroke="#10b981" strokeWidth={2.2} />
      <line x1={eu.x} y1={eu.y} x2={est.x} y2={est.y} stroke="#f97316" strokeWidth={2.2} strokeDasharray="4 3" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
        const p = pos(n)
        const ehEu = n === tipo.numero
        const ehAsa = tipo.asas.tipos.includes(n)
        const ehSeg = n === tipo.flechas.seguranca.tipo
        const ehEst = n === tipo.flechas.estresse.tipo
        const fill = ehEu ? 'hsl(var(--primary))' : ehSeg ? '#ecfdf5' : ehEst ? '#fff7ed' : ehAsa ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--card))'
        const stroke = ehEu || ehAsa ? 'none' : ehSeg ? '#10b981' : ehEst ? '#f97316' : 'hsl(var(--border))'
        const texto = ehEu ? '#fff' : ehSeg ? '#047857' : ehEst ? '#c2410c' : ehAsa ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
        return (
          <g key={n}>
            <circle cx={p.x} cy={p.y} r={ehEu ? 12 : 9} fill={fill} stroke={stroke} />
            <text x={p.x} y={p.y + (ehEu ? 3.8 : 3.2)} textAnchor="middle" fontSize={ehEu ? 11 : 9} fontWeight={600} fill={texto} className="font-mono">{n}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Abertura do Mapa de si: tipo, motivação, sequência de instintos e diagrama.
function PerfilHero({ tipo, subtipoSequencia }: { tipo: TipoEneagramaDados; subtipoSequencia: string | null }) {
  const instintos = (subtipoSequencia ?? '').split('/').map((i) => i.trim()).filter(Boolean) as Instinto[]
  const dominante = tipo.subtipos.find((s) => s.instinto === instintos[0])
  const rotulos = ['1º · dominante', '2º', '3º · menos usado']
  return (
    <section className="relative glass-panel rounded-3xl overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(120% 90% at 0% 0%, hsl(var(--primary) / 0.12), transparent 60%)' }}
      />
      <div className="relative grid grid-cols-1 md:grid-cols-[1.5fr_1fr]">
        <div className="p-6 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Seu perfil</p>
          <div className="flex items-end gap-4 mt-3">
            <span className="font-display text-7xl font-bold leading-none text-primary">{tipo.numero}</span>
            <div className="pb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tipo {tipo.numero} · o que move você</p>
              <p className="font-display text-2xl font-bold text-foreground tracking-tight">“{tipo.motivacao}”</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">{tipo.palavraSintese}</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-foreground">Centro {tipo.centro}</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Virtude · {tipo.virtude}</span>
          </div>

          {instintos.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sequência de instintos</p>
              <div className="grid grid-cols-3 gap-2">
                {instintos.map((inst, i) => (
                  <div
                    key={inst}
                    className={cn(
                      'rounded-xl px-3 py-2.5',
                      i === 0 ? 'bg-primary text-primary-foreground' : i === 1 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-wider opacity-80">{rotulos[i] ?? `${i + 1}º`}</p>
                    <p className="text-sm font-semibold">{NOME_INSTINTO[inst] ?? inst}</p>
                  </div>
                ))}
              </div>
              {dominante && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  <strong className="text-foreground">{dominante.palavraChave}:</strong> {dominante.comoAtua}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 border-t md:border-t-0 md:border-l border-border/70 flex flex-col items-center justify-center">
          <DiagramaEneagrama tipo={tipo} />
          <div className="space-y-2 text-[11px] mt-3 w-full max-w-xs leading-relaxed">
            <p className="flex gap-2">
              <span className="mt-1.5 w-3 h-0.5 bg-emerald-500 shrink-0" />
              <span><strong>Em segurança, vai ao {tipo.flechas.seguranca.tipo}:</strong> <span className="text-muted-foreground">{tipo.flechas.seguranca.descricao}</span></span>
            </p>
            <p className="flex gap-2">
              <span className="mt-1.5 w-3 h-0.5 bg-orange-500 shrink-0" />
              <span><strong>Sob estresse, vai ao {tipo.flechas.estresse.tipo}:</strong> <span className="text-muted-foreground">{tipo.flechas.estresse.descricao}</span></span>
            </p>
            <p className="flex gap-2">
              <span className="mt-1 w-2 h-2 rounded-full bg-primary/30 shrink-0" />
              <span><strong>Asas {tipo.asas.tipos.join(' e ')}:</strong> <span className="text-muted-foreground">{tipo.asas.desenvolver}</span></span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Luz e sombra lado a lado, com mecanismo de defesa e talento embaixo.
function LuzESombra({ tipo }: { tipo: TipoEneagramaDados }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Quando você está bem</p>
        <h3 className="font-display text-base font-bold text-foreground mt-1">Suas forças</h3>
        <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{tipo.forcas}</p>
      </div>
      <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">Fique de olho</p>
        <h3 className="font-display text-base font-bold text-foreground mt-1">Sua sombra</h3>
        <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{tipo.sombra}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No automático</p>
        <h3 className="font-display text-base font-bold text-foreground mt-1">Mecanismo de defesa</h3>
        <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{tipo.mecanismoDefesa}</p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Seu talento</p>
        <h3 className="font-display text-base font-bold text-foreground mt-1">{tipo.talentoAutolideranca.nome}</h3>
        <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{tipo.talentoAutolideranca.potencial}</p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          <strong className="text-foreground">Desafio:</strong> {tipo.talentoAutolideranca.desafio}
        </p>
      </div>
    </div>
  )
}

const COMPETENCIAS: { chave: keyof TipoEneagramaDados['competencias']; nome: string }[] = [
  { chave: 'comunicacao', nome: 'Comunicação' },
  { chave: 'feedback', nome: 'Feedback' },
  { chave: 'tomadaDecisao', nome: 'Tomada de decisão' },
  { chave: 'relacionamentoInterpessoal', nome: 'Relacionamento' },
  { chave: 'gestaoConflitos', nome: 'Conflitos' },
  { chave: 'orientacaoResultados', nome: 'Resultados' },
]

// As 6 competências relacionais: uma de cada vez (antes eram 6 cartões com 3
// itens cada, uma parede de texto).
function Competencias({ tipo }: { tipo: TipoEneagramaDados }) {
  const [ativa, setAtiva] = useState(COMPETENCIAS[0].chave)
  const c = tipo.competencias[ativa]
  const colunas = [
    { titulo: 'Como você age', texto: c.comoAge, cor: 'text-foreground', ponto: 'bg-foreground/60' },
    { titulo: 'Ponto de atenção', texto: c.pontoAtencao, cor: 'text-orange-700 dark:text-orange-400', ponto: 'bg-orange-500' },
    { titulo: 'Para desenvolver', texto: c.desenvolver, cor: 'text-emerald-700 dark:text-emerald-400', ponto: 'bg-emerald-500' },
  ]
  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-bold text-foreground">Você nas 6 competências do dia a dia</h3>
        <p className="text-[11px] text-muted-foreground">Escolha uma competência</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto mt-4 pb-1 -mx-1 px-1">
        {COMPETENCIAS.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setAtiva(item.chave)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              ativa === item.chave
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {item.nome}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {colunas.map((col) => (
          <div key={col.titulo} className="rounded-xl bg-secondary/50 p-4">
            <p className={cn('text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5', col.cor)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', col.ponto)} />
              {col.titulo}
            </p>
            <p className="text-sm text-foreground mt-2 leading-relaxed">{col.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// A análise gerada pela IA vem em seções "**Título**". Separa as 3 que viram
// cartões; se o texto não tiver as seções esperadas, mostra o texto inteiro.
function separarAnalise(texto: string) {
  const partes: Record<'ajuda' | 'atrapalha' | 'sugestao', string> = { ajuda: '', atrapalha: '', sugestao: '' }
  const blocos = texto.split(/\*\*(.+?)\*\*\s*\n/).slice(1)
  for (let i = 0; i < blocos.length; i += 2) {
    const titulo = blocos[i].toLowerCase()
    const corpo = (blocos[i + 1] ?? '').trim()
    if (titulo.includes('ajuda')) partes.ajuda = corpo
    else if (titulo.includes('atrapalh')) partes.atrapalha = corpo
    else if (titulo.includes('sugest')) partes.sugestao = corpo
  }
  return partes.ajuda || partes.atrapalha || partes.sugestao ? partes : null
}

function AnaliseCargo({ dica, cargo }: { dica: { texto: string; geradoEm: string }; cargo?: string | null }) {
  // Pedido (14/09/2026): a análise é o texto mais longo da página e começa oculta.
  const [aberta, setAberta] = useState(false)
  const partes = separarAnalise(dica.texto)
  const cartoes = partes
    ? [
        { titulo: 'O que ajuda', texto: partes.ajuda, cls: 'bg-emerald-500/5 border-emerald-500/20', cor: 'text-emerald-700 dark:text-emerald-400' },
        { titulo: 'O que pode atrapalhar', texto: partes.atrapalha, cls: 'bg-orange-500/5 border-orange-500/20', cor: 'text-orange-700 dark:text-orange-400' },
        { titulo: 'Sugestão prática', texto: partes.sugestao, cls: 'bg-primary/5 border-primary/15', cor: 'text-primary' },
      ].filter((c) => c.texto)
    : []
  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setAberta((v) => !v)} className="w-full p-5 md:p-6 flex items-center justify-between gap-3 text-left">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Seu perfil × seu cargo</p>
          <h3 className="font-display text-base font-bold text-foreground mt-1">{cargo || 'Análise para o seu cargo'}</h3>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          {aberta ? 'Ocultar' : 'Revelar'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', aberta && 'rotate-180')} />
        </span>
      </button>
      {aberta && (
        <div className="px-5 md:px-6 pb-5 space-y-3">
          {cartoes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {cartoes.map((c) => (
                <div key={c.titulo} className={cn('rounded-xl border p-4', c.cls)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-2', c.cor)}>{c.titulo}</p>
                  <p className="leading-relaxed text-foreground/90 whitespace-pre-line">{c.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-line">{dica.texto}</p>
          )}
          <p className="text-[11px] text-muted-foreground">Gerada em {new Date(dica.geradoEm).toLocaleDateString('pt-BR')} a partir do perfil do cargo e do seu tipo.</p>
        </div>
      )}
    </div>
  )
}

// Mapa de si completo de uma pessoa — reaproveitado no "meu perfil" e na
// simulação de administrador (como outra pessoa veria a própria tela).
export function PerfilMapaDeSi({
  tipo,
  subtipoSequencia,
  dica,
  cargo,
}: {
  tipo: TipoEneagramaDados
  subtipoSequencia: string | null
  dica: { texto: string; geradoEm: string } | null
  cargo?: string | null
}) {
  return (
    <div className="space-y-4">
      <PerfilHero tipo={tipo} subtipoSequencia={subtipoSequencia} />
      <LuzESombra tipo={tipo} />
      <Competencias tipo={tipo} />
      {dica && <AnaliseCargo dica={dica} cargo={cargo} />}
    </div>
  )
}

// Mapa do time: composição nos 3 centros, sempre agregada (nunca o tipo de
// alguém). Descrições e dicas dos grupos: texto provisório da repaginada de
// 29–30/09/2026, não vem do material da BeHive — o Igor pode pedir para reverter.
const GRUPOS_TIME = [
  {
    chave: 'emocional' as const,
    nome: 'Relacional',
    descricao: 'Movido por vínculos e reconhecimento.',
    engaja: 'Mostre o propósito e reconheça a contribuição.',
    cor: '#f43f5e',
    texto: 'text-rose-600 dark:text-rose-400',
  },
  {
    chave: 'racional' as const,
    nome: 'Técnico e analítico',
    descricao: 'Precisa de lógica, dados e tempo para processar.',
    engaja: 'Dê contexto e dados, e tempo antes de pedir decisão.',
    cor: '#0ea5e9',
    texto: 'text-sky-600 dark:text-sky-400',
  },
  {
    chave: 'instintivo' as const,
    nome: 'Ação e resultado',
    descricao: 'Direto, prefere autonomia e metas claras.',
    engaja: 'Seja direto, combine a meta e dê autonomia.',
    cor: '#f59e0b',
    texto: 'text-amber-600 dark:text-amber-400',
  },
]

export function ComposicaoTime({ resumo }: { resumo: ResumoTime | null }) {
  if (!resumo) return <p className="text-sm text-muted-foreground">Carregando...</p>
  const { totalMapeados, totalLiderados } = resumo
  if (totalMapeados < 3) return <p className="text-sm text-foreground">{resumirTime(resumo)}</p>
  const grupos = GRUPOS_TIME.map((g) => ({ ...g, qtd: resumo[g.chave], pct: Math.round((resumo[g.chave] / totalMapeados) * 100) }))
    .sort((a, b) => b.pct - a.pct)
  const naoMapeados = totalLiderados - totalMapeados
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-bold text-foreground">Como seu time funciona</h3>
        <p className="text-[11px] text-muted-foreground font-mono">{totalMapeados} de {totalLiderados} liderados mapeados</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mt-4 bg-secondary gap-0.5">
        {grupos.filter((g) => g.qtd > 0).map((g) => (
          <div key={g.chave} style={{ flexGrow: g.qtd, background: g.cor }} title={`${g.nome}: ${g.pct}%`} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {grupos.map((g) => (
          <div key={g.chave} className={cn('rounded-xl border border-border bg-card/70 p-4', g.qtd === 0 && 'opacity-60')}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.cor }} />
              <p className="text-sm font-semibold text-foreground">{g.nome}</p>
            </div>
            <p className={cn('font-display text-3xl font-bold mt-2 tabular-nums', g.texto)}>{g.pct}%</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{g.descricao}</p>
            <p className="text-xs text-foreground mt-2 leading-relaxed">
              <strong>Como engajar:</strong> {g.engaja}
            </p>
          </div>
        ))}
      </div>
      {naoMapeados > 0 && (
        <p className="text-[11px] text-muted-foreground mt-3">
          {naoMapeados} {naoMapeados === 1 ? 'liderado ainda sem perfil mapeado.' : 'liderados ainda sem perfil mapeado.'}
        </p>
      )}
    </div>
  )
}

// Escolha de pessoa em pílulas (lista curta, como os liderados diretos).
export function SeletorPessoas({
  pessoas,
  selecionada,
  onSelecionar,
}: {
  pessoas: { funcionario_id: string; full_name: string }[]
  selecionada: string
  onSelecionar: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[...pessoas]
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map((p) => {
          const ativa = p.funcionario_id === selecionada
          const iniciais = p.full_name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
          return (
            <button
              key={p.funcionario_id}
              type="button"
              onClick={() => onSelecionar(p.funcionario_id)}
              className={cn(
                'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs font-medium transition-colors',
                ativa ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-accent'
              )}
            >
              <span className={cn('w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold', ativa ? 'bg-primary-foreground/20' : 'bg-secondary text-muted-foreground')}>
                {iniciais}
              </span>
              {p.full_name.split(' ').slice(0, 2).join(' ')}
            </button>
          )
        })}
    </div>
  )
}
