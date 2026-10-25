// Feedback e One on One — protótipo (24/10/2026). Tudo aqui é fictício e fica
// só na memória do navegador: nada vai para o banco. Serve para mostrar a ideia
// na reunião e discutir as regras antes de construir o módulo de verdade.
// Pessoas inventadas de propósito (não usar nomes de funcionários reais).

export type PessoaId = 'marina' | 'ricardo' | 'rafael' | 'juliana' | 'bruno' | 'camila' | 'tiago' | 'paula'
export type VerComo = 'marina' | 'rafael' | 'rh'
export type TipoFeedback = 'elogio' | 'construtivo' | 'sugestao'

export interface Pessoa { nome: string; cargo: string; area: string; gestor?: PessoaId }

export const PESSOAS: Record<PessoaId, Pessoa> = {
  marina: { nome: 'Marina Duarte', cargo: 'Coordenadora Comercial', area: 'Comercial', gestor: 'ricardo' },
  ricardo: { nome: 'Ricardo Lemos', cargo: 'Diretor Comercial', area: 'Comercial' },
  rafael: { nome: 'Rafael Antunes', cargo: 'Analista Comercial', area: 'Comercial', gestor: 'marina' },
  juliana: { nome: 'Juliana Prado', cargo: 'Executiva de Vendas', area: 'Comercial', gestor: 'marina' },
  bruno: { nome: 'Bruno Teixeira', cargo: 'Analista de Marketing', area: 'Comercial', gestor: 'marina' },
  camila: { nome: 'Camila Rocha', cargo: 'Assistente Comercial', area: 'Comercial', gestor: 'marina' },
  tiago: { nome: 'Tiago Mendes', cargo: 'Engenheiro de Obras', area: 'Engenharia', gestor: 'ricardo' },
  paula: { nome: 'Paula Siqueira', cargo: 'Analista Financeira', area: 'Financeiro' },
}

export const ROTULO_TIPO: Record<TipoFeedback, string> = { elogio: 'Elogio', construtivo: 'Construtivo', sugestao: 'Sugestão' }
export const HUMOR = ['', 'Difícil', 'Puxado', 'Ok', 'Bem', 'Ótimo']

export interface Feedback {
  id: number
  de: PessoaId
  para: PessoaId
  tipo: TipoFeedback
  /** índice em PILARES_CULTURAIS */
  pilar: number | null
  publico: boolean
  data: string
  texto: string
  palmas: number
  bati?: boolean
}

export interface PedidoFeedback { id: number; de: PessoaId; para: PessoaId; sobre: string; data: string; respondido: boolean }

export interface ItemPauta { texto: string; autor: PessoaId; feito: boolean }
export interface Combinado { id: number; texto: string; responsavel: PessoaId; prazo: string; feito: boolean }
export interface Reuniao {
  id: number
  data: string
  status: 'realizada' | 'agendada'
  humor: number | null
  pauta: ItemPauta[]
  combinados: Combinado[]
  notas: string
  privadas: string
}
export interface ParOneOnOne { id: number; lider: PessoaId; liderado: PessoaId; cadencia: string; mensal?: boolean; reunioes: Reuniao[] }

export type Aba = 'geral' | 'feedback' | 'oneonone' | 'acomp' | 'mural'
export type SubFeedback = 'recebidos' | 'enviados' | 'pedidos' | 'time' | 'mural'

/** O que as abas pedem para a página fazer (a página guarda o estado). */
export interface AcoesFeedback {
  irPara: (aba: Aba, sub?: SubFeedback) => void
  abrirPar: (parId: number) => void
  responderPedido: (pedidoId: number) => void
  aplaudir: (feedbackId: number) => void
  alternarCombinado: (combinadoId: number) => void
  alternarPauta: (reuniaoId: number, indice: number) => void
  definirHumor: (reuniaoId: number, humor: number) => void
  adicionarPauta: (reuniaoId: number, texto: string) => void
  adicionarCombinado: (reuniaoId: number, texto: string, responsavel: PessoaId) => void
  editarNota: (reuniaoId: number, campo: 'notas' | 'privadas', valor: string) => void
  concluirReuniao: (parId: number, reuniaoId: number) => void
}

export const HOJE = '2026-10-24'

let seq = 100
export function novoId() { return ++seq }

function reuniao(data: string, status: Reuniao['status'], extra: Partial<Reuniao> = {}): Reuniao {
  return { id: novoId(), data, status, humor: null, pauta: [], combinados: [], notas: '', privadas: '', ...extra }
}
function cb(texto: string, responsavel: PessoaId, prazo: string, feito: boolean): Combinado {
  return { id: novoId(), texto, responsavel, prazo, feito }
}
function pt(texto: string, autor: PessoaId, feito: boolean): ItemPauta {
  return { texto, autor, feito }
}

export function dadosIniciais() {
  const feedbacks: Feedback[] = [
    { id: 1, de: 'marina', para: 'rafael', tipo: 'elogio', pilar: 0, publico: true, data: '2026-10-22', palmas: 7,
      texto: 'Na proposta para o condomínio Vale Verde você revisou todos os números antes do prazo e achou o erro na tabela de preços. O cliente fechou sem pedir correção. Isso nos poupou uma semana.' },
    { id: 2, de: 'tiago', para: 'rafael', tipo: 'elogio', pilar: 2, publico: true, data: '2026-10-15', palmas: 4,
      texto: 'Obrigado por ter ido à obra comigo explicar ao cliente o cronograma. Ele saiu bem mais tranquilo.' },
    { id: 3, de: 'marina', para: 'rafael', tipo: 'construtivo', pilar: 3, publico: false, data: '2026-10-08', palmas: 0,
      texto: 'Situação: na reunião de pipeline de segunda. Comportamento: os três negócios atrasados apareceram só quando perguntei. Impacto: perdi a chance de ajudar antes. Quando um negócio travar, me avisa no mesmo dia, mesmo sem solução.' },
    { id: 4, de: 'juliana', para: 'marina', tipo: 'elogio', pilar: 1, publico: true, data: '2026-10-20', palmas: 9,
      texto: 'Você assumiu a negociação difícil com a imobiliária parceira quando eu estava de férias e deixou tudo registrado. Voltei e consegui continuar sem perder nada.' },
    { id: 5, de: 'ricardo', para: 'marina', tipo: 'sugestao', pilar: null, publico: false, data: '2026-10-11', palmas: 0,
      texto: 'Experimenta mandar o resumo semanal do time na sexta, e não na segunda. Assim chego na reunião de diretoria já sabendo os números.' },
    { id: 6, de: 'paula', para: 'camila', tipo: 'elogio', pilar: 3, publico: true, data: '2026-10-17', palmas: 5,
      texto: 'Os contratos chegaram ao financeiro com todos os anexos certos este mês. Fechamos o repasse dois dias antes.' },
    { id: 7, de: 'marina', para: 'bruno', tipo: 'construtivo', pilar: 0, publico: false, data: '2026-09-30', palmas: 0,
      texto: 'O material da feira saiu sem a revisão do jurídico. Da próxima vez, inclui o jurídico no cronograma desde o começo, mesmo que o prazo pareça curto.' },
    { id: 8, de: 'rafael', para: 'juliana', tipo: 'elogio', pilar: 2, publico: true, data: '2026-10-09', palmas: 3,
      texto: 'Você me passou os contatos da carteira antiga sem eu precisar pedir. Ajudou demais no primeiro mês.' },
  ]

  const pedidos: PedidoFeedback[] = [
    { id: 1, de: 'rafael', para: 'marina', sobre: 'Minha apresentação para a diretoria na quinta (proposta Vale Verde)', data: '2026-10-23', respondido: false },
    { id: 2, de: 'camila', para: 'marina', sobre: 'Como estou indo na organização dos contratos', data: '2026-10-21', respondido: false },
    { id: 3, de: 'marina', para: 'ricardo', sobre: 'Minha condução da reunião de metas do trimestre', data: '2026-10-19', respondido: false },
  ]

  const pares: ParOneOnOne[] = [
    { id: 1, lider: 'marina', liderado: 'rafael', cadencia: 'Quinzenal · sextas, 10h', reunioes: [
      reuniao('2026-09-18', 'realizada', { humor: 3,
        pauta: [pt('Adaptação à carteira nova', 'rafael', true), pt('Treinamento de negociação', 'marina', true)],
        combinados: [cb('Fazer o curso de negociação da plataforma', 'rafael', '2026-10-10', true)],
        notas: 'Rafael ainda se sente inseguro com os clientes maiores. Combinamos que ele acompanha a Juliana em duas visitas.' }),
      reuniao('2026-10-02', 'realizada', { humor: 4,
        pauta: [pt('Visitas com a Juliana: como foram', 'marina', true), pt('Quero entender o plano de carreira de executivo', 'rafael', true)],
        combinados: [cb('Enviar a trilha de carreira de Executivo de Vendas', 'marina', '2026-10-09', true)],
        notas: 'Visitas foram ótimas. Rafael quer chegar a executivo em 2027. Falamos do que falta: carteira própria e fechamentos acima de R$ 1 mi.' }),
      reuniao('2026-10-16', 'realizada', { humor: 4,
        pauta: [pt('Negócios atrasados no pipeline', 'marina', true), pt('Folga para a formatura da irmã (07/11)', 'rafael', true)],
        combinados: [
          cb('Atualizar o CRM até toda segunda, 9h', 'rafael', '2026-10-20', true),
          cb('Montar o roteiro da apresentação Vale Verde', 'rafael', '2026-10-29', false),
          cb('Pedir ao jurídico o modelo novo de proposta', 'marina', '2026-10-23', false)],
        notas: 'Conversamos sobre avisar cedo quando um negócio travar. Folga do dia 07/11 aprovada.',
        privadas: 'Bom momento para dar a ele uma conta grande. Conferir com o Ricardo se o Vale Verde pode ficar com ele.' }),
      reuniao('2026-10-30', 'agendada', {
        pauta: [pt('Ensaio da apresentação para a diretoria', 'rafael', false), pt('Retorno do feedback sobre o pipeline', 'marina', false), pt('Metas do semestre: como estou?', 'rafael', false)],
        privadas: 'Levar a proposta de ele assumir o Vale Verde.' }),
    ]},
    { id: 2, lider: 'marina', liderado: 'juliana', cadencia: 'Quinzenal · quintas, 15h', reunioes: [
      reuniao('2026-09-25', 'realizada', { humor: 5, pauta: [pt('Parceria com imobiliárias', 'juliana', true)],
        combinados: [cb('Levantar as 10 imobiliárias que mais vendem na região', 'juliana', '2026-10-06', true)], notas: 'Juliana bem animada com o canal de parceiros.' }),
      reuniao('2026-10-09', 'realizada', { humor: 4, pauta: [pt('Volta das férias', 'marina', true)],
        combinados: [cb('Apresentar a proposta de comissão para parceiros', 'juliana', '2026-10-22', false)] }),
      reuniao('2026-10-23', 'agendada', { pauta: [pt('Comissão de parceiros', 'juliana', false)] }),
    ]},
    { id: 3, lider: 'marina', liderado: 'bruno', cadencia: 'Quinzenal · terças, 14h', reunioes: [
      reuniao('2026-09-04', 'realizada', { humor: 3, pauta: [pt('Feira de imóveis', 'bruno', true)] }),
      reuniao('2026-09-18', 'realizada', { humor: 2, pauta: [pt('Sobrecarga com a feira e o site ao mesmo tempo', 'bruno', true)],
        combinados: [cb('Repriorizar as entregas de outubro', 'marina', '2026-09-25', false)], notas: 'Bruno cansado. Precisamos tirar algo da mesa dele.' }),
    ]},
    { id: 4, lider: 'marina', liderado: 'camila', cadencia: 'Mensal · primeira segunda, 9h', mensal: true, reunioes: [
      reuniao('2026-10-05', 'realizada', { humor: 5, pauta: [pt('Checklist de contratos', 'camila', true)],
        combinados: [cb('Compartilhar o checklist com o time todo', 'camila', '2026-10-15', true)], notas: 'Checklist funcionando muito bem.' }),
      reuniao('2026-11-03', 'agendada'),
    ]},
    { id: 5, lider: 'ricardo', liderado: 'marina', cadencia: 'Quinzenal · quartas, 8h30', reunioes: [
      reuniao('2026-10-07', 'realizada', { humor: 4, pauta: [pt('Fechamento do trimestre', 'ricardo', true)],
        combinados: [cb('Trazer a projeção de VGV para dezembro', 'marina', '2026-10-21', true)], notas: 'Trimestre fechou em 94% da meta.',
        privadas: 'Marina pronta para assumir também o canal de parceiros?' }),
      reuniao('2026-10-21', 'realizada', { humor: 4, pauta: [pt('Projeção de dezembro', 'marina', true), pt('Contratação de mais um analista', 'marina', true)],
        combinados: [cb('Abrir a vaga de analista comercial com o RH', 'ricardo', '2026-10-31', false)], notas: 'Projeção aprovada. Vaga nova autorizada.' }),
      reuniao('2026-11-04', 'agendada', { pauta: [pt('Plano para o canal de parceiros', 'marina', false)] }),
    ]},
  ]

  return { feedbacks, pedidos, pares }
}

/** Metas individuais fictícias, como viriam da Avaliação de Desempenho. */
export const METAS: Partial<Record<PessoaId, [string, number][]>> = {
  rafael: [['Fechar 12 contratos no semestre', 67], ['Reduzir o tempo de proposta para 3 dias', 40]],
  juliana: [['R$ 4,2 mi em VGV no semestre', 81], ['Ativar 5 imobiliárias parceiras', 60]],
  bruno: [['Gerar 300 leads qualificados', 52], ['Lançar o site do Vale Verde', 90]],
  camila: [['Contratos sem pendência no repasse', 95]],
  marina: [['Bater 100% da meta do time', 72], ['Fazer 1:1 quinzenal com todo o time', 75]],
}

/** Números do RH por área: fictícios, só para mostrar o painel. */
export const ACOMPANHAMENTO_AREAS: { area: string; lideres: number; liderados: number; emDia: number; feedbacks: number }[] = [
  { area: 'Comercial', lideres: 3, liderados: 11, emDia: 82, feedbacks: 19 },
  { area: 'Engenharia', lideres: 4, liderados: 18, emDia: 72, feedbacks: 12 },
  { area: 'Obras', lideres: 5, liderados: 26, emDia: 69, feedbacks: 8 },
  { area: 'Financeiro', lideres: 1, liderados: 4, emDia: 100, feedbacks: 5 },
  { area: 'Administrativo', lideres: 1, liderados: 6, emDia: 83, feedbacks: 2 },
]

export const PERGUNTAS_EM_ABERTO: [string, string][] = [
  ['Quem pode dar feedback para quem?', 'Só entre líder e liderado, ou também entre colegas e de baixo para cima? O protótipo mostra todos.'],
  ['Quem lê um feedback privado?', 'No protótipo: quem deu, quem recebeu e o líder direto de quem recebeu. O RH lê ou vê só números?'],
  ['Mural público de elogios', 'Queremos? Elogio vai para o mural por padrão ou só se quem escreveu escolher?'],
  ['Frequência do 1:1', 'Regra da empresa (ex.: quinzenal para todos) ou cada líder define com seu time?'],
  ['Ligação com a Avaliação de Desempenho', 'Ao avaliar, o líder vê os feedbacks e combinados do período? Isso muda o tom do que as pessoas escrevem.'],
  ['Lembretes', 'Avisar por e-mail antes do 1:1 e quando alguém fica mais de 30 dias sem conversa?'],
  ['Feedback anônimo', 'Deve existir? No protótipo todo feedback mostra quem escreveu.'],
]

// ---------- datas ----------
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
function dt(iso: string) { return new Date(iso + 'T12:00:00') }
const pad = (n: number) => String(n).padStart(2, '0')
export function diaMes(iso: string) { const d = dt(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }
export function diaSemana(iso: string) { return SEMANA[dt(iso).getDay()] }
export function diasEntre(a: string, b: string) { return Math.round((dt(b).getTime() - dt(a).getTime()) / 86400000) }
export function somarDias(iso: string, n: number) {
  const d = dt(iso); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function haQuanto(iso: string) {
  const n = diasEntre(iso, HOJE)
  return n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`
}

// ---------- regras do 1:1 ----------
export function ultimaReuniao(p: ParOneOnOne) { return p.reunioes.filter((r) => r.status === 'realizada').slice(-1)[0] as Reuniao | undefined }
export function proximaReuniao(p: ParOneOnOne) { return p.reunioes.find((r) => r.status === 'agendada') }

export type Situacao = { tom: 'ok' | 'atencao' | 'atrasado'; texto: string }
export function situacaoPar(p: ParOneOnOne): Situacao {
  const u = ultimaReuniao(p), px = proximaReuniao(p)
  if (px && diasEntre(px.data, HOJE) > 0) return { tom: 'atrasado', texto: 'Atrasado' }
  if (!px) return { tom: 'atencao', texto: 'Sem próximo' }
  if (u && diasEntre(u.data, HOJE) > 30) return { tom: 'atencao', texto: `Há ${diasEntre(u.data, HOJE)} dias` }
  return { tom: 'ok', texto: 'Em dia' }
}

/** Combinados não concluídos de encontros já realizados (passam para o próximo). */
export function combinadosAbertos(p: ParOneOnOne) {
  return p.reunioes.flatMap((r) => (r.status === 'realizada' ? r.combinados.filter((c) => !c.feito).map((c) => ({ combinado: c, reuniao: r })) : []))
}
