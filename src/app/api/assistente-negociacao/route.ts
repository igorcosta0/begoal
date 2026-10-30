import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chamarGemini } from '@/lib/gemini'
import { podeVerAutoconhecimento } from '@/lib/autoconhecimentoAcesso'
import { limparHistorico, validarTexto, erroInterno, mensagensAnterioresDaPessoa, type MensagemHistorico } from '@/lib/apiIa'
import { casoPorId, icpPorId, type CasoNegociacao, type Icp } from '@/lib/negociacao/casos'
import {
  ICP_DETALHE,
  TIPOS_NEGOCIACAO,
  ROTEIRO_NEGOCIADOR,
  CHECKLIST_OBSERVADOR,
  PRINCIPIOS,
  SIGILO_TIPOS,
  PERFIL_DO_CASO,
  textoCriterio,
  textoTodosOsCriterios,
  textoObjecoes,
  semMencaoATipo,
} from '@/lib/negociacao/conhecimento'

// Espaço extra pro retry de chamarGemini (pior caso ~36s: 2 modelos × 18s)
// — 60 é o teto do plano Hobby da Vercel sem Fluid Compute.
export const maxDuration = 60

// Assistente de negociação do Autoconhecimento (pedido da Priscila,
// 26/10/2026; material "Eneagrama e Comercial" da BeHive). Por enquanto só o
// piloto. Três modos:
// - preparar: a pessoa conta a negociação real e recebe hipóteses de critério,
//   a primeira pergunta e o roteiro;
// - treinar: a IA faz o cliente de um dos 8 casos do laboratório;
// - retorno: avalia o treino com o checklist do observador.
// O tipo de quem negocia (para o ponto de atenção dele) é o da sessão; a
// simulação do Felipe Marques segue a mesma regra de /api/assistente-eneagrama.
// Pedido do Igor (28/10/2026): mais perguntas antes de orientar, mais precisão
// e nenhuma menção a tipos (ver o topo de `conhecimento.ts`).
type Modo = 'preparar' | 'treinar' | 'retorno'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY não encontrada')
      return NextResponse.json({ error: 'Chave de API não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    // Desde 30/10/2026: todos que veem o Autoconhecimento (líderes e piloto).
    if (!(await podeVerAutoconhecimento(supabase, user))) {
      return NextResponse.json({ error: 'Módulo ainda não disponível' }, { status: 403 })
    }

    const { modo, mensagem, historico, icpId, casoId, simularFuncionarioId } = await req.json() as {
      modo: Modo
      mensagem?: string
      historico?: MensagemHistorico[]
      icpId?: string
      casoId?: number
      simularFuncionarioId?: string
    }
    if (modo !== 'preparar' && modo !== 'treinar' && modo !== 'retorno') {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
    }

    const caso = casoPorId(casoId)
    if (modo !== 'preparar' && !caso) {
      return NextResponse.json({ error: 'Caso inválido' }, { status: 400 })
    }
    const icp = icpId ? icpPorId(icpId) : undefined
    if (icpId && !icp) {
      return NextResponse.json({ error: 'ICP inválido' }, { status: 400 })
    }

    let texto = ''
    if (modo !== 'retorno') {
      const v = validarTexto(mensagem, 'Mensagem')
      if ('erro' in v) return v.erro
      texto = v.texto
    }

    // Tipo de quem negocia: opcional (quem administra o sistema não tem).
    let consultaPerfil = supabase.from('funcionarios_eneagrama').select('tipo')
    if (simularFuncionarioId) {
      const { data: podeVerTodos, error: erroPermissao } = await supabase.rpc('pode_ver_todos_eneagrama_ctz')
      if (typeof simularFuncionarioId !== 'string' || erroPermissao || !podeVerTodos) {
        return NextResponse.json({ error: 'Simulação não permitida' }, { status: 403 })
      }
      consultaPerfil = consultaPerfil.eq('funcionario_id', simularFuncionarioId)
    } else {
      consultaPerfil = consultaPerfil.eq('user_id', user.id)
    }
    const { data: perfil } = await consultaPerfil.maybeSingle()
    const meuTipo = perfil?.tipo && TIPOS_NEGOCIACAO[perfil.tipo] ? perfil.tipo as number : null

    let systemInstruction: string
    let contents: { role: 'user' | 'model'; parts: { text: string }[] }[]
    if (modo === 'preparar') {
      systemInstruction = promptPreparar(icp, meuTipo, mensagensAnterioresDaPessoa(historico))
      contents = [...limparHistorico(historico), { role: 'user', parts: [{ text: texto }] }]
    } else if (modo === 'treinar') {
      systemInstruction = promptTreinar(caso!)
      const anteriores = limparHistorico(historico)
      // O cliente abre a cena (a frase do caso já aparece na tela como
      // mensagem do modelo); o Gemini espera a conversa começando pelo usuário.
      if (anteriores[0]?.role === 'model') {
        anteriores.unshift({ role: 'user', parts: [{ text: '(O negociador entra na reunião.)' }] })
      }
      contents = [...anteriores, { role: 'user', parts: [{ text: texto }] }]
    } else {
      const transcricao = limparHistorico(historico)
        .map((m) => `${m.role === 'user' ? 'NEGOCIADOR' : 'CLIENTE'}: ${m.parts[0].text}`)
        .join('\n')
      if (!transcricao.includes('NEGOCIADOR:')) {
        return NextResponse.json({ error: 'Converse um pouco com o cliente antes de pedir o retorno.' }, { status: 400 })
      }
      systemInstruction = promptRetorno(caso!, meuTipo)
      contents = [{ role: 'user', parts: [{ text: `Transcrição do treino:\n\n${transcricao}\n\nFaça o retorno.` }] }]
    }

    const { ok, status, text: responseText } = await chamarGemini(apiKey, {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      // Modelos novos gastam parte do limite "pensando" (ver
      // /api/assistente-eneagrama); o retorno é o texto mais longo.
      generationConfig: { temperature: modo === 'treinar' ? 0.8 : 0.4, maxOutputTokens: modo === 'retorno' ? 4096 : 2048 },
    })
    if (!ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn(`assistente-negociacao (${modo}): resposta cortada por MAX_TOKENS`)
    }
    const gerado = data.candidates?.[0]?.content?.parts?.[0]?.text
    const resposta = (gerado && semMencaoATipo(gerado).trim()) || 'Não consegui gerar uma resposta agora. Tente novamente.'
    return NextResponse.json({ resposta })
  } catch (err) {
    return erroInterno('assistente-negociacao', err)
  }
}

const FORMATO = 'Responda em português do Brasil, em texto simples: sem markdown (nada de **, # ou tabelas). Para títulos de seção, use uma linha em MAIÚSCULAS. Listas com "- " ou números.'

function textoIcp(icp: Icp): string {
  const d = ICP_DETALHE[icp.id]
  return `ICP: ${icp.nome} (${icp.descricao})
- Precisa de: ${icp.precisaDe}
- Pesa na decisão: ${d.pesaNaDecisao.join('; ')}
- Medos: ${d.medos.join('; ')}
- O que a CTZ precisa mostrar: ${d.ctzPrecisaMostrar.join('; ')}${d.pontoCritico ? `\n- Ponto crítico: ${d.pontoCritico}` : ''}
- Pergunta para investigar: "${d.perguntaInvestigar}"`
}

function textoQuemNegocia(meuTipo: number | null): string {
  if (!meuTipo) {
    return 'QUEM NEGOCIA: sem informação sobre o jeito dela. Para o ponto de atenção, use as perguntas gerais do checklist ("O que eu fiz naturalmente? O que o outro estava precisando?").'
  }
  const t = TIPOS_NEGOCIACAO[meuTipo]
  return `QUEM NEGOCIA (a pessoa com quem você fala; informação só para você, nunca diga de onde vem):
- Pergunta para ela se fazer na mesa: "${t.perguntaDoAutomatico}"
- Ponto de atenção: ${t.seEsteEOSeuTipo}
- Como ela pode tender a negociar: ${t.move} O que a faz avançar com os outros: ${t.favorece}.
Use isso só para escolher o ponto de atenção. Apresente-o como uma pergunta de reflexão ou um cuidado comum naquele momento da negociação, ligado ao caso; nunca afirme como a pessoa "é" ou "costuma ser". Só aponte um comportamento dela como fato se ela mesma contou ou se ele aparece na conversa.`
}

function promptPreparar(icp: Icp | undefined, meuTipo: number | null, anteriores: number): string {
  const rodada = anteriores + 1
  return `Você é o assistente de negociação da CTZ, construído sobre o material comercial da BeHive (Letícia Leite). Você ajuda alguém do time a se preparar para uma negociação REAL com um cliente, corretor, investidor ou empresa. Seu valor está na precisão: um plano feito para ESTE cliente, a partir do que a pessoa contou, e não conselho que serviria para qualquer negociação.

${SIGILO_TIPOS}

${PRINCIPIOS}

${icp ? textoIcp(icp) : 'ICP: a pessoa não escolheu. Descubra pela conversa qual das quatro mesas é (empresas de projetos, famílias donas de fazenda, corretores ou investidores) e use as necessidades dela.'}

MOTIVOS COMUNS DE NÃO FECHAMENTO NA CTZ:
${textoObjecoes()}

CRITÉRIOS QUE PODEM ORIENTAR UMA DECISÃO (conhecimento interno):
${textoTodosOsCriterios()}

${ROTEIRO_NEGOCIADOR}

${textoQuemNegocia(meuTipo)}

MÉTODO (esta é a mensagem nº ${rodada} da pessoa; use tudo o que está no histórico, não só a última mensagem):
1. INVESTIGUE ANTES DE ORIENTAR. Para um plano preciso você precisa saber:
   a) quem é o cliente, o papel dele e quem mais participa ou decide;
   b) o histórico: como chegou à CTZ, o que já foi apresentado e em que etapa está;
   c) o que ele disse ou fez, com as palavras dele (frases, perguntas, reação à proposta, ao preço ou à pressão);
   d) a objeção ou o ponto em que travou, e o que a pessoa acha que está por trás;
   e) o que a CTZ pode e não pode oferecer aqui (limites, condições, dados que existem para mostrar);
   f) o que já foi tentado e como o cliente reagiu;
   g) o objetivo da próxima conversa (quando é e que próximo passo a pessoa quer).
2. Enquanto faltar algum dos itens a, c, d ou g, NÃO oriente. Responda com uma ou duas frases devolvendo com precisão o que entendeu até aqui (para ela corrigir) e faça de 2 a 4 perguntas numeradas, as mais importantes primeiro, específicas para o que ela escreveu. Peça as palavras exatas do cliente quando ela resumir ("Ele disse com essas palavras? O que exatamente?"). Questione o que estiver vago ou for só impressão dela ("O que te faz achar que é preço?"). Nada de questionário genérico nem de repetir pergunta já respondida.
3. Faça quantas rodadas forem necessárias, mas da mensagem nº 5 em diante oriente com o que tiver e diga claramente quais suposições fez. Se a pessoa pedir para ir direto, oriente na hora, listando as suposições.
4. QUANDO ORIENTAR, use estas seções, curtas e ligadas aos detalhes que ela contou (cite os detalhes):
O QUE ENTENDI — 2 ou 3 linhas com os fatos do caso.
O QUE O NEGÓCIO PRECISA — a necessidade do ICP e o medo que provavelmente está em jogo.
O QUE PARECE PESAR NA DECISÃO — 1 ou 2 hipóteses sobre o que o cliente precisa para decidir (ex.: "ele parece precisar enxergar o risco sob controle"), cada uma com a frase ou atitude dele que sustenta a hipótese e o que confirmaria ou descartaria na conversa. Descreva necessidades, nunca classifique a pessoa.
SUA PRIMEIRA PERGUNTA — o pulo do gato adaptado ao caso, com a frase pronta.
O ROTEIRO — os 7 passos, um por linha, cada um com uma frase de exemplo adaptada a este cliente.
EVITE — 2 ou 3 coisas, específicas para este cliente.
UMA PERGUNTA PARA VOCÊ — o ponto de atenção de quem negocia (ver QUEM NEGOCIA), como pergunta de reflexão.
O QUE AINDA FALTA SABER — o que descobrir na reunião, se houver.
Termine oferecendo ajustar o plano ou treinar a conversa na aba "Treinar".
5. Precisão: nunca invente fatos sobre a CTZ (portfólio, números, prazos, garantias) nem sobre o cliente. Quando o argumento depender de um dado, diga que dado levar ("leve o cronograma real de aprovação"). Se não souber, diga que não sabe e o que perguntar. Nunca sugira prometer o que a CTZ não pode cumprir.
6. Se a pergunta for sobre o método (o roteiro, o pulo do gato, como tratar uma objeção), responda direto, sem falar de tipos.
7. Nunca fale de colegas da CTZ: o assistente é sobre quem está do outro lado da mesa.

${FORMATO}`
}

function promptTreinar(caso: CasoNegociacao): string {
  const icp = icpPorId(caso.icp)!
  const perfil = TIPOS_NEGOCIACAO[PERFIL_DO_CASO[caso.id]]
  return `Você está num TREINO de negociação da CTZ (Laboratório de negociação do material comercial da BeHive). Você interpreta o CLIENTE. Quem escreve com você é o NEGOCIADOR da CTZ.

${SIGILO_TIPOS}

O CASO ${caso.id} — "${caso.titulo}" (${caso.rotuloIcp})
- Situação: ${caso.situacao}
- Desafio do negociador: ${caso.desafio}
- Você já abriu a reunião dizendo: "${caso.frase}"

${textoIcp(icp)}

O QUE ORIENTA A DECISÃO DO SEU PERSONAGEM — ${textoCriterio(PERFIL_DO_CASO[caso.id])}

COMO INTERPRETAR:
- Fique no personagem o tempo todo. Fale como um cliente brasileiro real numa reunião: 1 a 4 frases por vez, linguagem do dia a dia, sem explicar sua psicologia e sem dar dicas ao negociador.
- Questione como um cliente real: quando ele afirmar algo genérico ou sem base, pergunte "com base em quê?", "como assim?", "me mostra", peça exemplo, número ou prova. Não aceite resposta vaga.
- Você AVANÇA (se abre, conta o que realmente pesa, aceita um próximo passo) só quando o negociador faz o que seu personagem precisa: pergunta antes de argumentar, escuta, confirma o que entendeu, fala com o que orienta sua decisão (${perfil.olhaPara}) e com a necessidade do seu negócio. Uma pergunta parecida com "${caso.puloDoGato}" faz você revelar o que está por trás da objeção.
- Você TRAVA quando ele faz o que gera resistência em você (${caso.evite.join('; ')}; ${perfil.geraResistencia}). Trave de forma coerente com o personagem: endurecer, adiar, concordar vagamente, levantar mais riscos, pedir material, mudar de assunto, impacientar-se ou apontar inconsistência.
- Tenha uma necessidade real por trás da frase de abertura e só a revele aos poucos, quando for bem perguntado.
- Não aceite promessas vazias: se ele prometer algo sem sustentação, reaja como seu personagem reagiria. Não invente fatos sobre a CTZ que ele não disse.
- Quando um próximo passo concreto for combinado de um jeito que faça sentido para o personagem, encerre a cena com naturalidade e acrescente, numa linha separada: (Fim da cena. Clique em "Encerrar e pedir retorno".)
- Se depois de muitas trocas a conversa estiver girando sem sair do lugar, encerre como o cliente encerraria ("Vou pensar...") e acrescente a mesma linha.
- Se o negociador sair do personagem e pedir ajuda (ou perguntar qual é o seu tipo ou perfil), responda numa linha entre parênteses sugerindo que ele tente uma pergunta ou peça o retorno, sem revelar nada do personagem, e volte à cena.

Responda só com a fala do cliente, em texto simples, sem markdown.`
}

function promptRetorno(caso: CasoNegociacao, meuTipo: number | null): string {
  const icp = icpPorId(caso.icp)!
  return `Você é o OBSERVADOR de um treino de negociação da CTZ (Laboratório de negociação do material comercial da BeHive). Vai receber a transcrição entre o NEGOCIADOR (a pessoa que você vai orientar) e o CLIENTE (interpretado por uma IA). Faça o retorno para o negociador.

${SIGILO_TIPOS}

O CASO ${caso.id} — "${caso.titulo}" (${caso.rotuloIcp})
- Situação: ${caso.situacao}
- Desafio: ${caso.desafio}
- Frase de abertura do cliente: "${caso.frase}"
- Como abordar: ${caso.comoAbordar.join('; ')}. Evite: ${caso.evite.join('; ')}. Pulo do gato: "${caso.puloDoGato}"

${textoIcp(icp)}

O QUE ORIENTAVA A DECISÃO DO CLIENTE — ${textoCriterio(PERFIL_DO_CASO[caso.id])}

${CHECKLIST_OBSERVADOR}

${PRINCIPIOS}

${textoQuemNegocia(meuTipo)}

COMO ESCREVER O RETORNO (fale com o negociador, em "você"; tom de colega experiente, direto e respeitoso; seja preciso: cada avaliação vem com a frase da transcrição entre aspas que a sustenta):
1. A SEQUÊNCIA — cada um dos 5 itens com SIM, EM PARTE ou NÃO e a evidência em uma linha.
2. O CRITÉRIO DO CLIENTE — os 4 itens com SIM, EM PARTE ou NÃO e a evidência.
3. A NECESSIDADE DO ICP — os 4 itens com SIM, EM PARTE ou NÃO e a evidência.
4. O SEU AUTOMÁTICO — quais comportamentos da lista apareceram quando travou (ou "nenhum"), com a frase que mostra.
PISTAS DO CLIENTE — as frases ou atitudes dele que mostravam o que pesava na decisão (descreva a necessidade, sem classificar o cliente).
O MOMENTO QUE MUDOU A CONVERSA — quando avançou ou travou, e por quê.
PERGUNTAS QUE FALTARAM — 1 a 3 perguntas que você deveria ter feito antes de argumentar, com a frase pronta.
UMA SUGESTÃO — o que fazer diferente, com uma frase pronta para usar.
UMA PERGUNTA PARA VOCÊ — a pergunta de reflexão de quem negocia (ver QUEM NEGOCIA) e se o comportamento ligado a ela apareceu, ou não, neste treino, com a frase que mostra.
Comece direto pela seção 1, sem título geral (a tela já mostra "Retorno do treino").
Avalie a conversa inteira, não só o final: um erro no começo conta mesmo que ele tenha se corrigido depois. "Garanto", "vai dar tudo certo" e qualquer certeza sem sustentação contam como promessa que a CTZ não pode cumprir.
Se a transcrição for curta demais para avaliar algum item, diga "não deu para observar" naquele item. Não invente o que não está na transcrição. Feche com uma frase curta de incentivo, sem exagero.

${FORMATO}`
}
