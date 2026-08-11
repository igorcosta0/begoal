import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TourPasso {
  id: string
  pagina: string
  /** valor do atributo data-tour do elemento a destacar; null = popup centralizado na tela */
  alvo: string | null
  titulo: string
  texto: string
  /** 'center' destaca o alvo com o spotlight mas mantém o pop-up centralizado na tela
   *  — útil quando o alvo é grande/fica perto da borda e um pop-up ancorado cortaria. */
  posicao?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export const TOUR_PASSOS: TourPasso[] = [
  {
    id: 'boas-vindas',
    pagina: '/inicio',
    alvo: null,
    titulo: 'Bem-vindo(a) ao Begoal 👋',
    texto: 'Vamos dar uma volta pelos principais lugares da plataforma — como um guia turístico, só que pela sua gestão estratégica. Leva menos de 2 minutos.',
  },
  {
    id: 'sidebar',
    pagina: '/inicio',
    alvo: 'tour-sidebar',
    titulo: 'Seu mapa da cidade',
    texto: 'O menu lateral é como você se desloca entre as áreas. Cada ícone leva a um lugar diferente — nem todo mundo vê os mesmos itens; alguns são só pra administradores.',
    posicao: 'right',
  },
  {
    id: 'inicio-hero',
    pagina: '/inicio',
    alvo: 'tour-hero',
    titulo: 'A praça central: Início',
    texto: 'Aqui fica a visão de futuro da empresa e um resumo rápido: quantos KRs estão ativos e o progresso geral dos objetivos.',
    posicao: 'bottom',
  },
  {
    id: 'inicio-mercado',
    pagina: '/inicio',
    alvo: 'tour-mercado',
    titulo: 'Mercado e recados',
    texto: 'De um lado, onde a empresa atua. Do outro, um mural de recados fixados pra equipe — dá pra comentar direto ali.',
    posicao: 'bottom',
  },
  {
    id: 'inicio-okrs',
    pagina: '/inicio',
    alvo: 'tour-okr-panel',
    titulo: 'O painel de resultados',
    texto: 'Cada barra é um objetivo estratégico — a altura mostra o quanto já foi entregue até agora.',
    posicao: 'top',
  },
  {
    id: 'inicio-valores',
    pagina: '/inicio',
    alvo: 'tour-valores',
    titulo: 'A vitrine de valores',
    texto: 'Os valores que guiam as decisões da empresa no dia a dia, sempre à vista de todo mundo.',
    posicao: 'left',
  },
  {
    id: 'okrs',
    pagina: '/okr',
    alvo: 'tour-okr-page',
    titulo: 'A oficina dos OKRs',
    texto: 'Aqui você cria objetivos, lança os resultados de cada KR e acompanha o progresso — o motor de tudo.',
    posicao: 'bottom',
  },
  {
    id: 'taticas',
    pagina: '/taticas',
    alvo: 'tour-taticas-board',
    titulo: 'O quadro de tarefas',
    texto: 'Um Kanban de verdade: arraste os cartões entre "Não Iniciado", "Em Andamento" e "Concluído" conforme o trabalho avança.',
    posicao: 'center',
  },
  {
    id: 'sinais-vitais',
    pagina: '/sinais-vitais',
    alvo: 'tour-sv-grid',
    titulo: 'O painel de sinais vitais',
    texto: 'KPIs contínuos da empresa — os números que você acompanha sempre, sem uma "linha de chegada" como um KR.',
    posicao: 'center',
  },
  {
    id: 'estrategia',
    pagina: '/estrategia',
    alvo: 'tour-estrategia-tabs',
    titulo: 'A sala de estratégia',
    texto: 'Quem somos, melhores clientes, mercados potenciais e o perfil de cliente ideal — tudo num diagnóstico só, dividido em abas.',
    posicao: 'bottom',
  },
  {
    id: 'funcionarios',
    pagina: '/funcionarios',
    alvo: 'tour-funcionarios-lista',
    titulo: 'O time',
    texto: 'Cadastro de cada pessoa: cargo, setor e gestor direto — é daqui que vêm os responsáveis de KR, tática e avaliação.',
    posicao: 'top',
  },
  {
    id: 'avaliacao',
    pagina: '/avaliacao',
    alvo: 'tour-avaliacao',
    titulo: 'A sala de avaliação',
    texto: 'Ciclo semestral de avaliação de desempenho: metade cultura, metade metas técnicas da vertical de cada pessoa.',
    posicao: 'top',
  },
  {
    id: 'biblioteca',
    pagina: '/biblioteca',
    alvo: 'tour-biblioteca',
    titulo: 'A biblioteca',
    texto: 'Documentos da empresa organizados por categoria — código de cultura, revisões estratégicas e outros materiais.',
    posicao: 'top',
  },
  {
    id: 'fim',
    pagina: '/guia',
    alvo: null,
    titulo: 'Você já conhece o Begoal!',
    texto: 'Pode refazer esse tour quando quiser, direto pelo Guia de Uso. Bom trabalho por aí 🎉',
  },
]

interface TourState {
  ativo: boolean
  passoIndex: number
  iniciar: () => void
  proximo: () => void
  voltar: () => void
  sair: () => void
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      ativo: false,
      passoIndex: 0,
      iniciar: () => set({ ativo: true, passoIndex: 0 }),
      proximo: () => {
        const next = get().passoIndex + 1
        if (next >= TOUR_PASSOS.length) {
          set({ ativo: false, passoIndex: 0 })
        } else {
          set({ passoIndex: next })
        }
      },
      voltar: () => set((s) => ({ passoIndex: Math.max(0, s.passoIndex - 1) })),
      sair: () => set({ ativo: false, passoIndex: 0 }),
    }),
    { name: 'begoal-tour' }
  )
)
