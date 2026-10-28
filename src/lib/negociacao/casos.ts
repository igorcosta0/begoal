// Assistente de negociação do Autoconhecimento (pedido da Priscila, 26/10/2026).
// Conteúdo: material "Eneagrama e Comercial" (Letícia Leite · BeHive), em
// `Adições futuras/Assistente de negociação/`. Este arquivo vai para o
// navegador (a tela mostra os ICPs e os casos); o resto do conteúdo, que só
// entra nos prompts, fica em `conhecimento.ts`.

export type IcpId = 'empresas' | 'familias' | 'corretores' | 'investidores'

export interface Icp {
  id: IcpId
  nome: string
  descricao: string
  precisaDe: string
}

export const ICPS: Icp[] = [
  {
    id: 'empresas',
    nome: 'Empresas',
    descricao: 'Área de projetos e engenharia',
    precisaDe: 'Um projeto tecnicamente sólido, aprovado e executável, sem surpresas de prazo ou retrabalho.',
  },
  {
    id: 'familias',
    nome: 'Famílias donas de fazenda',
    descricao: 'Captação de terra para o loteamento',
    precisaDe: 'Rentabilizar o patrimônio da família sem perder controle, valor ou segurança.',
  },
  {
    id: 'corretores',
    nome: 'Corretores',
    descricao: 'Captam fazendas e terrenos e apresentam à CTZ',
    precisaDe: 'Transformar a área captada em negócio fechado, com comissão garantida.',
  },
  {
    id: 'investidores',
    nome: 'Investidores',
    descricao: 'Financiam as obras em busca de rentabilidade',
    precisaDe: 'Rentabilidade superior às alternativas, com risco compreendido e controlado.',
  },
]

// Os 8 casos do Laboratório de negociação (role play), como na folha
// "Casos do negociador", sem o tipo do cliente (nunca vai para a tela; fica
// em `PERFIL_DO_CASO`, em `conhecimento.ts`). O negociador vê o critério.
export interface CasoNegociacao {
  id: number
  titulo: string
  icp: IcpId
  rotuloIcp: string
  situacao: string
  desafio: string
  frase: string
  olhaPara: string
  comoAbordar: string[]
  evite: string[]
  puloDoGato: string
}

export const CASOS_NEGOCIACAO: CasoNegociacao[] = [
  {
    id: 1,
    titulo: 'Onde eu vejo isso pronto?',
    icp: 'familias',
    rotuloIcp: 'Donos de fazenda',
    situacao: 'Três irmãos herdaram uma fazenda e querem lotear. Gostaram da proposta, mas a decisão está parada.',
    desafio: 'Gerar confiança sem portfólio em andamento.',
    frase: 'Onde eu consigo ver um loteamento de vocês funcionando hoje?',
    olhaPara: 'segurança',
    comoAbordar: ['Seja transparente', 'Antecipe dúvidas', 'Apresente evidências'],
    evite: ['Pressão', 'Promessas de certeza absoluta', 'Minimizar riscos reais'],
    puloDoGato: 'Qual é o principal risco que você está tentando evitar?',
  },
  {
    id: 2,
    titulo: 'A terra é minha',
    icp: 'familias',
    rotuloIcp: 'Donos de fazenda',
    situacao: 'Um corretor trouxe a área. O proprietário topa a parceria, mas quer dinheiro na entrada.',
    desafio: 'Negociar sem permuta 100% e sem virar disputa.',
    frase: 'Ou tem dinheiro na mesa no início, ou não tem negócio.',
    olhaPara: 'autonomia e controle',
    comoAbordar: ['Seja direto', 'Sustente sua posição', 'Seja claro sobre limites'],
    evite: ['Disputar poder', 'Usar pressão para obter adesão', 'Responder intensidade com intensidade'],
    puloDoGato: 'O que é realmente inegociável para esse cliente?',
  },
  {
    id: 3,
    titulo: 'Como eu defendo vocês sem nada pronto?',
    icp: 'corretores',
    rotuloIcp: 'Corretores',
    situacao: 'Um corretor parceiro tem um novo proprietário interessado, mas ficou sem resposta quando perguntaram pelo portfólio.',
    desafio: 'Dar segurança ao corretor sem prometer para agradar.',
    frase: 'Como eu defendo a CTZ para o dono se não tem nada pronto?',
    olhaPara: 'conexão, necessidades e vínculos',
    comoAbordar: ['Demonstre interesse genuíno', 'Escute antes de oferecer', 'Construa parceria'],
    evite: ['Criar intimidade artificial', 'Prometer para agradar', 'Fazer concessões para manter o vínculo'],
    puloDoGato: 'O que é realmente importante para esse cliente — e como minha solução pode contribuir para isso?',
  },
  {
    id: 4,
    titulo: 'Tenho três loteadoras querendo essa área',
    icp: 'corretores',
    rotuloIcp: 'Corretores',
    situacao: 'Um corretor traz uma área ótima e diz que outra loteadora oferece entrada ao dono.',
    desafio: 'Transformar entusiasmo em próximo passo, sem esconder a questão do aporte.',
    frase: 'A área tem fila! O que vocês têm de diferente?',
    olhaPara: 'possibilidades',
    comoAbordar: ['Abra possibilidades', 'Mostre oportunidades', 'Apresente alternativas relevantes'],
    evite: ['Apresentar opções demais', 'Fazer promessas sem verificar a viabilidade', 'Usar entusiasmo para esconder limitações'],
    puloDoGato: 'Qual dessas possibilidades faz mais sentido para você?',
  },
  {
    id: 5,
    titulo: 'Depois da eleição a gente vê',
    icp: 'investidores',
    rotuloIcp: 'Investidores',
    situacao: 'Um investidor gosta da CTZ, mas em ano de eleição adia a decisão.',
    desafio: 'Descobrir o que segura a decisão, sem pressionar.',
    frase: 'Vamos esperar passar a eleição, né?',
    olhaPara: 'harmonia',
    comoAbordar: ['Crie um ambiente respeitoso', 'Dê espaço para o cliente se posicionar', 'Explore os diferentes interesses envolvidos'],
    evite: ['Interpretar silêncio como concordância', 'Pressionar por uma decisão imediata', 'Fazer concessões desnecessárias para preservar a relação'],
    puloDoGato: 'O que é realmente importante para esse cliente — e ele está conseguindo dizer isso?',
  },
  {
    id: 6,
    titulo: 'Entusiasmo demais, dados de menos',
    icp: 'investidores',
    rotuloIcp: 'Investidores',
    situacao: 'A primeira apresentação foi entusiasmada demais. O investidor saiu inseguro e pediu tempo.',
    desafio: 'Recomeçar dando os dados que ele precisa para decidir.',
    frase: 'Me manda o material que eu estudo com calma.',
    olhaPara: 'conhecimento e compreensão',
    comoAbordar: ['Seja objetivo', 'Apresente informações relevantes', 'Demonstre domínio'],
    evite: ['Pressionar por uma decisão', 'Usar informação apenas para impressionar', 'Sobrecarregar o cliente com dados irrelevantes'],
    puloDoGato: 'O que você precisa compreender para se sentir seguro para avançar?',
  },
  {
    id: 7,
    titulo: 'O concorrente faz mais barato',
    icp: 'empresas',
    rotuloIcp: 'Empresas de projetos',
    situacao: 'O diretor de uma loteadora recebeu um orçamento bem mais baixo de um concorrente.',
    desafio: 'Mostrar valor sem entrar na guerra de preço.',
    frase: 'Me dá um motivo para pagar mais.',
    olhaPara: 'resultado',
    comoAbordar: ['Vá ao ponto', 'Mostre resultados e benefícios', 'Use indicadores quando forem relevantes'],
    evite: ['Falar sem propósito', 'Apresentar solução sem mostrar benefício', 'Excesso de teoria'],
    puloDoGato: 'O que será considerado "sucesso" por esse cliente?',
  },
  {
    id: 8,
    titulo: 'Vocês não conhecem os órgãos daqui',
    icp: 'empresas',
    rotuloIcp: 'Empresas de projetos',
    situacao: 'Uma empresa de outra cidade compara a Concretize com um escritório local que conhece a prefeitura.',
    desafio: 'Responder com método e critério, sem prometer o que não pode cumprir.',
    frase: 'Como vocês vão garantir a aprovação aqui?',
    olhaPara: 'critério e funcionalidade',
    comoAbordar: ['Abordagem cautelosa e planejada', 'Seja objetivo', 'Apresente critérios'],
    evite: ['Improvisar', 'Minimizar erros', 'Combinar o que não pode cumprir'],
    puloDoGato: 'O que esse cliente considera "certo" ou "adequado" para tomar uma decisão?',
  },
]

export function casoPorId(id: unknown): CasoNegociacao | undefined {
  return CASOS_NEGOCIACAO.find((c) => c.id === id)
}

export function icpPorId(id: unknown): Icp | undefined {
  return ICPS.find((i) => i.id === id)
}
