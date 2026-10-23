import type { ModeloPesquisa, PerguntaRascunho, PublicoPesquisa } from '@/lib/queries/pesquisas'

// Guia do módulo de Pesquisa (Miro, 23/10/2026), etapa 1:
// F08–F12 modelos prontos e F16 banco de perguntas. `{empresa}` é trocado pelo
// nome da empresa quando a pergunta entra na pesquisa.

export interface Modelo {
  id: ModeloPesquisa
  nome: string
  quando: string        // em uma frase, para quem nunca montou uma pesquisa
  publico: PublicoPesquisa
  titulo: string
  descricao: string
  perguntas: PerguntaRascunho[]
}

const escala = (enunciado: string, obrigatoria = true): PerguntaRascunho =>
  ({ tipo: 'escala_0_10', enunciado, opcoes: [], obrigatoria })
const nps = (enunciado: string): PerguntaRascunho =>
  ({ tipo: 'nps', enunciado, opcoes: [], obrigatoria: true })
const aberta = (enunciado: string, obrigatoria = false): PerguntaRascunho =>
  ({ tipo: 'texto', enunciado, opcoes: [], obrigatoria })
const uma = (enunciado: string, opcoes: string[]): PerguntaRascunho =>
  ({ tipo: 'multipla', enunciado, opcoes, obrigatoria: true })
const varias = (enunciado: string, opcoes: string[]): PerguntaRascunho =>
  ({ tipo: 'multipla_varias', enunciado, opcoes, obrigatoria: true })

export const MODELOS: Modelo[] = [
  {
    id: 'clima',
    nome: 'Clima Organizacional',
    quando: 'Fotografia completa de como as pessoas se sentem trabalhando aqui. Uma ou duas vezes por ano.',
    publico: 'interna',
    titulo: 'Pesquisa de Clima Organizacional',
    descricao: 'Queremos entender como é trabalhar na {empresa} hoje. Suas respostas são anônimas e levam cerca de 10 minutos.',
    perguntas: [
      nps('De 0 a 10, quanto você recomendaria a {empresa} como um bom lugar para trabalhar?'),
      escala('De 0 a 10, quanto você se sente satisfeito trabalhando na {empresa}?'),
      escala('De 0 a 10, quanto seu líder direto apoia o seu trabalho no dia a dia?'),
      escala('De 0 a 10, quanto você recebe retorno (feedback) sobre o seu trabalho com a frequência de que precisa?'),
      escala('De 0 a 10, quanto a comunicação entre as áreas funciona bem?'),
      escala('De 0 a 10, quanto você se sente reconhecido pelo trabalho que entrega?'),
      escala('De 0 a 10, quanto você enxerga oportunidades de crescer aqui?'),
      escala('De 0 a 10, quanto o seu volume de trabalho é equilibrado com a sua vida pessoal?'),
      escala('De 0 a 10, quanto você confia nas decisões da liderança da empresa?'),
      varias('O que mais contribui para você gostar de trabalhar aqui?', [
        'As pessoas e o time', 'Meu líder', 'O trabalho que eu faço', 'Remuneração e benefícios',
        'Oportunidades de crescimento', 'Flexibilidade', 'O propósito da empresa',
      ]),
      aberta('Se você pudesse mudar uma coisa na {empresa} amanhã, o que seria?'),
      aberta('Quer deixar mais algum comentário?'),
    ],
  },
  {
    id: 'pulse',
    nome: 'Pulse',
    quando: 'Pesquisa curta e frequente (mensal ou quinzenal) para sentir o termômetro do time.',
    publico: 'interna',
    titulo: 'Pulse do time',
    descricao: 'Três minutos para contar como você está. Suas respostas são anônimas.',
    perguntas: [
      escala('De 0 a 10, como você avalia a sua semana de trabalho?'),
      escala('De 0 a 10, quanto você se sente motivado neste momento?'),
      escala('De 0 a 10, quanto você tem clareza do que é prioridade para você agora?'),
      uma('Como está o seu volume de trabalho?', ['Abaixo do que eu consigo', 'Na medida certa', 'Um pouco acima', 'Muito acima, não estou dando conta']),
      aberta('Tem algo atrapalhando o seu trabalho que a gente deveria saber?'),
    ],
  },
  {
    id: 'nps',
    nome: 'NPS',
    quando: 'Mede o quanto clientes ou funcionários recomendariam a empresa. Bom para repetir a cada 3 meses.',
    publico: 'externa',
    titulo: 'Pesquisa NPS',
    descricao: 'Uma pergunta rápida sobre a sua experiência com a {empresa}.',
    perguntas: [
      nps('De 0 a 10, quanto você recomendaria a {empresa} a um amigo ou colega?'),
      aberta('Qual o principal motivo da sua nota?', true),
    ],
  },
  {
    id: 'satisfacao',
    nome: 'Satisfação',
    quando: 'Entender o quanto clientes estão satisfeitos com o atendimento, o produto e o serviço.',
    publico: 'externa',
    titulo: 'Pesquisa de Satisfação',
    descricao: 'Sua opinião ajuda a {empresa} a melhorar. Leva cerca de 5 minutos.',
    perguntas: [
      escala('De 0 a 10, qual o seu nível de satisfação geral com a {empresa}?'),
      escala('De 0 a 10, como você avalia o atendimento que recebeu?'),
      escala('De 0 a 10, como você avalia a qualidade do que foi entregue?'),
      escala('De 0 a 10, quanto os prazos combinados foram cumpridos?'),
      escala('De 0 a 10, quanto foi fácil falar com a gente quando você precisou?'),
      nps('De 0 a 10, quanto você recomendaria a {empresa} a um amigo ou colega?'),
      aberta('O que podemos melhorar?'),
    ],
  },
  {
    id: 'cultura',
    nome: 'Cultura',
    quando: 'Ver se os valores da empresa aparecem de verdade no dia a dia das pessoas.',
    publico: 'interna',
    titulo: 'Pesquisa de Cultura',
    descricao: 'Queremos saber como a nossa cultura aparece na prática. Suas respostas são anônimas.',
    perguntas: [
      escala('De 0 a 10, quanto você conhece os valores da {empresa}?'),
      escala('De 0 a 10, quanto esses valores aparecem nas decisões do dia a dia?'),
      escala('De 0 a 10, quanto a liderança age de acordo com o que fala?'),
      escala('De 0 a 10, quanto você se sente à vontade para dar a sua opinião, mesmo discordando?'),
      escala('De 0 a 10, quanto as pessoas colaboram entre áreas em vez de competir?'),
      escala('De 0 a 10, quanto os erros são tratados como aprendizado, e não com punição?'),
      aberta('Que comportamento você gostaria de ver mais por aqui?'),
      aberta('Que comportamento você gostaria de ver menos?'),
    ],
  },
]

export const MODELO_EM_BRANCO = {
  id: 'personalizada' as const,
  nome: 'Começar do zero',
  quando: 'Monte a pesquisa do seu jeito, escolhendo perguntas do banco ou escrevendo as suas.',
}

export const NOME_MODELO: Record<ModeloPesquisa, string> = {
  ...Object.fromEntries(MODELOS.map((m) => [m.id, m.nome])) as Record<ModeloPesquisa, string>,
  personalizada: 'Personalizada',
}

export interface TemaBanco {
  tema: string
  perguntas: PerguntaRascunho[]
}

export const BANCO_PERGUNTAS: TemaBanco[] = [
  {
    tema: 'Satisfação geral',
    perguntas: [
      escala('De 0 a 10, quanto você se sente satisfeito trabalhando na {empresa}?'),
      nps('De 0 a 10, quanto você recomendaria a {empresa} como um bom lugar para trabalhar?'),
      escala('De 0 a 10, quanto você se vê trabalhando aqui daqui a dois anos?'),
      escala('De 0 a 10, quanto você sente orgulho de trabalhar na {empresa}?'),
    ],
  },
  {
    tema: 'Liderança',
    perguntas: [
      escala('De 0 a 10, quanto seu líder direto apoia o seu trabalho no dia a dia?'),
      escala('De 0 a 10, quanto seu líder deixa claro o que espera de você?'),
      escala('De 0 a 10, quanto seu líder está disponível quando você precisa?'),
      escala('De 0 a 10, quanto você confia nas decisões da liderança da empresa?'),
      aberta('O que seu líder poderia fazer diferente para ajudar você?'),
    ],
  },
  {
    tema: 'Comunicação',
    perguntas: [
      escala('De 0 a 10, quanto você fica sabendo a tempo das mudanças que afetam o seu trabalho?'),
      escala('De 0 a 10, quanto a comunicação entre as áreas funciona bem?'),
      escala('De 0 a 10, quanto você entende os objetivos da empresa para este ano?'),
      uma('Por onde você prefere receber as notícias da empresa?', ['Reunião com o líder', 'E-mail', 'WhatsApp', 'Mural ou sistema interno']),
    ],
  },
  {
    tema: 'Reconhecimento e feedback',
    perguntas: [
      escala('De 0 a 10, quanto você se sente reconhecido pelo trabalho que entrega?'),
      escala('De 0 a 10, quanto você recebe retorno (feedback) sobre o seu trabalho com a frequência de que precisa?'),
      escala('De 0 a 10, quanto você considera justa a sua remuneração para o que faz?'),
    ],
  },
  {
    tema: 'Crescimento',
    perguntas: [
      escala('De 0 a 10, quanto você enxerga oportunidades de crescer aqui?'),
      escala('De 0 a 10, quanto você aprendeu coisas novas nos últimos meses?'),
      varias('Em quais temas você gostaria de receber treinamento?', [
        'Liderança', 'Comunicação', 'Ferramentas e sistemas', 'Conhecimento técnico da minha área', 'Gestão do tempo', 'Atendimento ao cliente',
      ]),
    ],
  },
  {
    tema: 'Ambiente e bem-estar',
    perguntas: [
      escala('De 0 a 10, quanto o seu volume de trabalho é equilibrado com a sua vida pessoal?'),
      escala('De 0 a 10, quanto você tem as ferramentas e os recursos de que precisa?'),
      escala('De 0 a 10, quanto você se sente respeitado pelos colegas?'),
      uma('Como está o seu volume de trabalho?', ['Abaixo do que eu consigo', 'Na medida certa', 'Um pouco acima', 'Muito acima, não estou dando conta']),
    ],
  },
  {
    tema: 'Cultura e valores',
    perguntas: [
      escala('De 0 a 10, quanto os valores da {empresa} aparecem nas decisões do dia a dia?'),
      escala('De 0 a 10, quanto você se sente à vontade para dar a sua opinião, mesmo discordando?'),
      escala('De 0 a 10, quanto os erros são tratados como aprendizado, e não com punição?'),
      escala('De 0 a 10, quanto as pessoas colaboram entre áreas em vez de competir?'),
    ],
  },
  {
    tema: 'Clientes',
    perguntas: [
      nps('De 0 a 10, quanto você recomendaria a {empresa} a um amigo ou colega?'),
      escala('De 0 a 10, qual o seu nível de satisfação geral com a {empresa}?'),
      escala('De 0 a 10, como você avalia o atendimento que recebeu?'),
      escala('De 0 a 10, como você avalia a qualidade do que foi entregue?'),
      escala('De 0 a 10, quanto os prazos combinados foram cumpridos?'),
      uma('Há quanto tempo você é nosso cliente?', ['Menos de 6 meses', 'De 6 meses a 1 ano', 'De 1 a 3 anos', 'Mais de 3 anos']),
      aberta('Qual o principal motivo da sua nota?'),
    ],
  },
  {
    tema: 'Perguntas abertas',
    perguntas: [
      aberta('Se você pudesse mudar uma coisa na {empresa} amanhã, o que seria?'),
      aberta('O que a {empresa} faz bem e não pode deixar de fazer?'),
      aberta('O que podemos melhorar?'),
      aberta('Quer deixar mais algum comentário?'),
    ],
  },
]

export function comEmpresa(pergunta: PerguntaRascunho, empresa: string): PerguntaRascunho {
  return { ...pergunta, opcoes: [...pergunta.opcoes], enunciado: pergunta.enunciado.split('{empresa}').join(empresa) }
}
