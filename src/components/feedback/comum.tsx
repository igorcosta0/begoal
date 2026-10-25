import Avatar from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { PESSOAS, type PessoaId, type Situacao, type TipoFeedback } from '@/lib/feedbackPrototipo'

// Peças pequenas repetidas nas abas do protótipo de Feedback e One on One.
// As classes de cor ficam aqui (e não em src/lib) porque o Tailwind só gera
// as classes que encontra em src/app, src/components e src/pages.

const COR_PESSOA: Record<PessoaId, string> = {
  marina: 'bg-indigo-100 text-indigo-700',
  ricardo: 'bg-sky-100 text-sky-700',
  rafael: 'bg-emerald-100 text-emerald-700',
  juliana: 'bg-pink-100 text-pink-700',
  bruno: 'bg-orange-100 text-orange-700',
  camila: 'bg-violet-100 text-violet-700',
  tiago: 'bg-rose-100 text-rose-700',
  paula: 'bg-teal-100 text-teal-700',
}

export const ESTILO_TIPO: Record<TipoFeedback, string> = {
  elogio: 'bg-emerald-100 text-emerald-800',
  construtivo: 'bg-amber-100 text-amber-800',
  sugestao: 'bg-primary/10 text-primary',
}

export const ESTILO_SITUACAO: Record<Situacao['tom'], string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  atencao: 'bg-amber-100 text-amber-800',
  atrasado: 'bg-rose-100 text-rose-700',
}

export function AvatarPessoa({ id, tamanho = 'md' }: { id: PessoaId; tamanho?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const size = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[tamanho]
  return <Avatar nome={PESSOAS[id].nome} sizeClassName={size} corClassName={COR_PESSOA[id]} />
}

export function primeiroNome(id: PessoaId) {
  return PESSOAS[id].nome.split(' ')[0]
}

export function Selo({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

export function Painel({ titulo, icon: Icon, acao, children, className }: {
  titulo?: string
  icon?: React.ComponentType<{ className?: string }>
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card shadow-glass p-5 min-w-0', className)}>
      {titulo && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />} {titulo}
          </h2>
          {acao}
        </div>
      )}
      {children}
    </section>
  )
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</div>
}

export function Caixinha({ marcado, onClick, rotulo }: { marcado: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={marcado}
      className={cn(
        'mt-0.5 w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors',
        marcado ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-300 bg-card hover:border-primary'
      )}
    >
      {marcado && (
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      )}
    </button>
  )
}
