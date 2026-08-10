'use client'

import { useEmpresaStore } from '@/store/useEmpresaStore'
import { isEmpresaCTZ } from '@/lib/utils'
import { PILARES_CULTURAIS, VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'
import Link from 'next/link'
import {
  Compass, Home, Target, Flag, Zap, Activity, Map, Users, ClipboardList, Library,
  ArrowRight, LogIn, LayoutList, Sparkles, ChevronDown,
} from 'lucide-react'

const AREAS = [
  {
    href: '/inicio', icon: Home, titulo: 'Início',
    descricao: 'Sua página de entrada: visão de futuro, mercado, valores da empresa e o andamento geral dos OKRs, tudo num só lugar.',
  },
  {
    href: '/okr', icon: Target, titulo: 'OKRs',
    descricao: 'Onde os Objetivos e seus Key Results (KRs) vivem de fato: lançar resultados, acompanhar progresso, arquivar o que já foi concluído.',
  },
  {
    href: '/objetivo', icon: Flag, titulo: 'Objetivos',
    descricao: 'Lista enxuta só dos objetivos estratégicos — bom pra criar ou editar um objetivo sem entrar no detalhe dos KRs.',
  },
  {
    href: '/taticas', icon: Zap, titulo: 'Táticas',
    descricao: 'Board Kanban (Não Iniciado / Em Andamento / Concluído) com as ações do dia a dia vinculadas a cada KR. Arraste o cartão pra mudar o status.',
  },
  {
    href: '/sinais-vitais', icon: Activity, titulo: 'Sinais Vitais',
    descricao: 'KPIs contínuos da empresa — métricas que você acompanha sempre, sem prazo de "conclusão" como um KR.',
  },
  {
    href: '/estrategia', icon: Map, titulo: 'Estratégia de Mercado',
    descricao: 'Diagnóstico estratégico: quem somos, melhores clientes, mercados potenciais e o perfil de cliente ideal (ICP).',
  },
  {
    href: '/funcionarios', icon: Users, titulo: 'Funcionários',
    descricao: 'Cadastro da equipe: cargo, setor, gestor direto e status. É esse cadastro que alimenta responsáveis de KR, tática e avaliação.',
  },
  {
    href: '/avaliacao', icon: ClipboardList, titulo: 'Avaliação de Desempenho',
    descricao: 'Ciclo semestral com autoavaliação, avaliação do gestor e calibração — metade cultura, metade metas técnicas da vertical.',
  },
  {
    href: '/biblioteca', icon: Library, titulo: 'Biblioteca',
    descricao: 'Documentos da empresa: código de cultura, revisões estratégicas e outros materiais, organizados por categoria.',
  },
]

const PASSOS = [
  {
    icon: LogIn,
    titulo: 'Entre com o e-mail e senha que o administrador cadastrou',
    texto: 'Se for a sua primeira vez, peça o acesso pra quem administra a conta da sua empresa no Begoal.',
  },
  {
    icon: Home,
    titulo: 'Você já cai direto na Início da sua empresa',
    texto: 'Se você só tem acesso a uma empresa, o login já leva direto pra lá — sem tela de seleção no meio do caminho.',
  },
  {
    icon: LayoutList,
    titulo: 'Use o menu à esquerda pra navegar',
    texto: 'Cada área tem seu próprio ícone. Nem todo mundo vê os mesmos itens: Administração e Importar, por exemplo, são só pra administradores.',
  },
  {
    icon: Target,
    titulo: 'Comece pelos OKRs pra entender a hierarquia',
    texto: 'Objetivo é a meta grande; KR (Key Result) é como você mede se chegou lá; Tática é a ação concreta que empurra o KR pra frente.',
  },
]

const FAQ = [
  {
    pergunta: 'Esqueci minha senha, e agora?',
    resposta: 'Na tela de login, clique em "Esqueceu a senha?" e siga o link enviado por e-mail.',
  },
  {
    pergunta: 'Tenho acesso a mais de uma empresa, como troco?',
    resposta: 'Se você é administrador, use "Mudar Empresa" no rodapé do menu lateral. Usuários comuns normalmente têm acesso a uma única empresa.',
  },
  {
    pergunta: 'Quem vê minha autoavaliação de desempenho?',
    resposta: 'Só você, até o seu gestor concluir a avaliação dele. As notas do gestor e o resultado final só aparecem depois que ele marcar "Revelar avaliação".',
  },
  {
    pergunta: 'Posso editar um Sinal Vital depois de lançado?',
    resposta: 'Sim — abra o histórico do Sinal Vital pra ver ou ajustar os lançamentos anteriores.',
  },
]

export default function GuiaPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Guia de Uso</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {empresa?.company_name} — Um raio-x da plataforma pra quem está chegando agora
          </p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-foreground leading-relaxed">
          O <strong>Begoal</strong> é onde a {empresa?.company_name ?? 'sua empresa'} organiza a gestão estratégica: os{' '}
          <strong>OKRs</strong> (Objetivos e Key Results) do ano, as <strong>táticas</strong> do dia a dia que os
          empurram pra frente, os <strong>KPIs</strong> que rodam continuamente e a <strong>avaliação de desempenho</strong> do
          time — tudo no mesmo lugar, atualizado por quem realmente faz o trabalho.
        </p>
      </div>

      {/* Primeiros passos */}
      <div>
        <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Primeiros passos</h2>
        <div className="space-y-3">
          {PASSOS.map((passo, idx) => (
            <div key={passo.titulo} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <passo.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {passo.titulo}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{passo.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conheça cada área */}
      <div>
        <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Conheça cada área</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AREAS.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <area.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  {area.titulo}
                  <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{area.descricao}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bloco específico CTZ */}
      {ctz && (
        <div className="rounded-3xl border border-border overflow-hidden">
          <div
            className="relative px-6 py-5 overflow-hidden"
            style={{ background: 'linear-gradient(160deg, rgba(139,92,246,0.14), rgba(139,92,246,0.03) 70%)' }}
          >
            <div
              className="absolute inset-0 opacity-[0.35] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.35) 1px, transparent 0)',
                backgroundSize: '16px 16px',
                maskImage: 'linear-gradient(180deg, black, transparent)',
                WebkitMaskImage: 'linear-gradient(180deg, black, transparent)',
              }}
            />
            <div className="relative flex items-center gap-1.5 text-violet-600">
              <Sparkles className="w-3.5 h-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Específico da CTZ</p>
            </div>
            <p className="relative text-lg font-extrabold text-foreground mt-1 tracking-tight">
              Cultura e verticais do grupo
            </p>
            <p className="relative text-xs text-muted-foreground mt-1 max-w-lg">
              A avaliação de desempenho e os critérios de performance da CTZ seguem os 4 pilares culturais e as
              verticais de negócio abaixo — vale conhecer antes de preencher sua primeira avaliação.
            </p>
          </div>

          <div className="p-5 space-y-5 bg-card">
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Os 4 pilares culturais</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PILARES_CULTURAIS.map((p) => (
                  <div key={p.numero} className="rounded-xl border border-border p-3">
                    <p className="text-xs font-bold text-violet-600">{p.numero}. {p.titulo}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.como_se_vive}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Verticais de negócio</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(VERTICAIS_CTZ).map((v) => (
                  <span key={v.label} className="text-[11px] px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                    {v.label}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O código de cultura completo e as revisões estratégicas estão na{' '}
              <Link href="/biblioteca" className="text-primary font-medium hover:underline">Biblioteca</Link>.
            </p>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div>
        <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Perguntas frequentes</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {FAQ.map((item) => (
            <details key={item.pergunta} className="group p-4 open:bg-accent/20">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-medium text-foreground">
                {item.pergunta}
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
