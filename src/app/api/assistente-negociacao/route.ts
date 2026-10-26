import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chamarGemini } from '@/lib/gemini'
import { souPilotoAutoconhecimento } from '@/lib/utils'
import { limparHistorico, validarTexto, erroInterno, mensagensAnterioresDaPessoa, type MensagemHistorico } from '@/lib/apiIa'
import { casoPorId, icpPorId, type CasoNegociacao, type Icp } from '@/lib/negociacao/casos'
import {
  ICP_DETALHE,
  TIPOS_NEGOCIACAO,
  ROTEIRO_NEGOCIADOR,
  CHECKLIST_OBSERVADOR,
  PRINCIPIOS,
  textoTipo,
  textoTodosOsTipos,
  textoObjecoes,
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
// O tipo de quem negocia (para o "Eu × Outro") é o da sessão; a simulação do
// Felipe Marques segue a mesma regra de /api/assistente-eneagrama.
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
    if (!souPilotoAutoconhecimento(user.email)) {
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
      generationConfig: { temperature: modo === 'treinar' ? 0.8 : 0.6, maxOutputTokens: modo === 'retorno' ? 4096 : 2048 },
    })
    if (!ok) {
      console.error('Gemini error:', responseText)
      return NextResponse.json({ error: `Erro Gemini: ${status}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn(`assistente-negociacao (${modo}): resposta cortada por MAX_TOKENS`)
    }
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Não consegui gerar uma resposta agora. Tente novamente.'
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

function textoMeuTipo(meuTipo: number | null): string {
  if (!meuTipo) {
    return 'QUEM NEGOCIA: não tem tipo mapeado no sistema. Não suponha o tipo dela; na parte "seu automático", use as perguntas gerais do checklist ("O que eu fiz naturalmente? O que o outro estava precisando?").'
  }
  const t = TIPOS_NEGOCIACAO[meuTipo]
  return `QUEM NEGOCIA (a pessoa com quem você está falando) é Tipo ${meuTipo}, olha para ${t.olhaPara}.
- Pergunta do automático dela: "${t.perguntaDoAutomatico}"
- Recado do material para quem é deste tipo: ${t.seEsteEOSeuTipo}
- Como ela tende a negociar: ${t.move} O que a faz avançar com os outros: ${t.favorece}.
Use isso para o "Eu × Outro": onde o automático dela pode esbarrar no critério do cliente. Fale disso com cuidado, como ponto de atenção, nunca como rótulo.`
}

function promptPreparar(icp: Icp | undefined, meuTipo: number | null, anteriores: number): string {
  const rodada = anteriores + 1
  return `Você é o assistente de negociação da CTZ, construído sobre o material "Eneagrama e Comercial" (Letícia Leite · BeHive). Você ajuda alguém do time a se preparar para uma negociação REAL com um cliente, corretor, investidor ou empresa.

${PRINCIPIOS}

${icp ? textoIcp(icp) : 'ICP: a pessoa não escolheu. Descubra pela conversa qual das quatro mesas é (empresas de projetos, famílias donas de fazenda, corretores ou investidores) e use as necessidades dela.'}

MOTIVOS COMUNS DE NÃO FECHAMENTO NA CTZ:
${textoObjecoes()}

OS 9 TIPOS NA MESA DE NEGOCIAÇÃO:
${textoTodosOsTipos()}

${ROTEIRO_NEGOCIADOR}

${textoMeuTipo(meuTipo)}

MÉTODO (esta é a mensagem nº ${rodada} da pessoa; use tudo o que está no histórico):
1. Para orientar bem você precisa saber: quem é o cliente e o papel dele na decisão (quem mais decide); o que ele disse ou fez (frases, perguntas que fez, como reagiu à proposta ou à pressão); onde a negociação está ou travou (a objeção); e qual próximo passo a pessoa quer.
2. Enquanto faltar parte importante disso, responda com uma frase curta mostrando que entendeu e faça no máximo 3 perguntas numeradas, ligadas ao que ela escreveu. Faça no máximo UMA rodada de perguntas: da mensagem nº 2 em diante, oriente mesmo com informação parcial e diga qual suposição fez. Se ela pedir para ir direto, oriente na hora.
3. QUANDO ORIENTAR, use estas seções, curtas e ligadas aos detalhes que ela contou:
O QUE O NEGÓCIO PRECISA — a necessidade do ICP e o medo que provavelmente está em jogo.
O QUE PODE ESTAR ORIENTANDO A DECISÃO — 1 ou 2 hipóteses de critério (pode citar o tipo, sempre como hipótese: "as pistas sugerem alguém que olha para segurança, como no Tipo 6"), citando as pistas que ela contou e o que confirmaria ou descartaria a hipótese na conversa.
SUA PRIMEIRA PERGUNTA — o pulo do gato adaptado ao caso, com a frase pronta.
O ROTEIRO — os 7 passos, um por linha, cada um com uma frase de exemplo adaptada a este cliente.
EVITE — 2 ou 3 coisas, específicas para este cliente.
SEU AUTOMÁTICO — o ponto de atenção do Eu × Outro (ver QUEM NEGOCIA).
Termine oferecendo ajustar o plano ou treinar a conversa na aba "Treinar".
4. Nunca invente fatos sobre a CTZ (portfólio, números, prazos, garantias). Quando o argumento depender de um dado, diga que dado levar ("leve o cronograma real de aprovação") em vez de inventar. Nunca sugira prometer o que a CTZ não pode cumprir.
5. Se a pergunta for só sobre um conceito do material (ex.: "o que é o pulo do gato do Tipo 6?"), responda direto, sem o método.
6. Nunca fale do tipo de colegas da CTZ: o assistente é sobre quem está do outro lado da mesa.

${FORMATO}`
}

function promptTreinar(caso: CasoNegociacao): string {
  const icp = icpPorId(caso.icp)!
  return `Você está num TREINO de negociação da CTZ (Laboratório de negociação do material "Eneagrama e Comercial", da BeHive). Você interpreta o CLIENTE. Quem escreve com você é o NEGOCIADOR da CTZ.

O CASO ${caso.id} — "${caso.titulo}" (${caso.rotuloIcp})
- Situação: ${caso.situacao}
- Desafio do negociador: ${caso.desafio}
- Você já abriu a reunião dizendo: "${caso.frase}"

${textoIcp(icp)}

SEU PERSONAGEM é ${textoTipo(caso.tipo)}

COMO INTERPRETAR:
- Fique no personagem o tempo todo. Fale como um cliente brasileiro real numa reunião: 1 a 4 frases por vez, linguagem do dia a dia, sem explicar sua psicologia.
- Nunca diga seu tipo, nunca mencione Eneagrama e nunca dê dicas ao negociador.
- Você AVANÇA (se abre, conta o que realmente pesa, aceita um próximo passo) só quando o negociador faz o que seu personagem precisa: pergunta antes de argumentar, escuta, confirma o que entendeu, fala com o seu critério (${TIPOS_NEGOCIACAO[caso.tipo].olhaPara}) e com a necessidade do seu negócio. Uma pergunta parecida com "${caso.puloDoGato}" faz você revelar o que está por trás da objeção.
- Você TRAVA quando ele faz o que gera resistência no seu tipo (${caso.evite.join('; ')}; ${TIPOS_NEGOCIACAO[caso.tipo].geraResistencia}). Trave de forma coerente com o tipo: endurecer, adiar, concordar vagamente, levantar mais riscos, pedir material, mudar de assunto, impacientar-se ou apontar inconsistência, conforme o seu personagem.
- Tenha uma necessidade real por trás da frase de abertura e só a revele aos poucos, quando for bem perguntado.
- Não aceite promessas vazias: se ele prometer algo sem sustentação, reaja como seu personagem reagiria. Não invente fatos sobre a CTZ que ele não disse.
- Quando um próximo passo concreto for combinado de um jeito que faça sentido para o personagem, encerre a cena com naturalidade e acrescente, numa linha separada: (Fim da cena. Clique em "Encerrar e pedir retorno".)
- Se depois de muitas trocas a conversa estiver girando sem sair do lugar, encerre como o cliente encerraria ("Vou pensar...") e acrescente a mesma linha.
- Se o negociador sair do personagem e pedir ajuda, responda numa linha entre parênteses sugerindo que ele tente uma pergunta ou peça o retorno, e volte à cena.

Responda só com a fala do cliente, em texto simples, sem markdown.`
}

function promptRetorno(caso: CasoNegociacao, meuTipo: number | null): string {
  const icp = icpPorId(caso.icp)!
  return `Você é o OBSERVADOR de um treino de negociação da CTZ (Laboratório de negociação do material "Eneagrama e Comercial", da BeHive). Vai receber a transcrição entre o NEGOCIADOR (a pessoa que você vai orientar) e o CLIENTE (interpretado por uma IA). Faça o retorno para o negociador.

O CASO ${caso.id} — "${caso.titulo}" (${caso.rotuloIcp})
- Situação: ${caso.situacao}
- Desafio: ${caso.desafio}
- Frase de abertura do cliente: "${caso.frase}"
- Como abordar: ${caso.comoAbordar.join('; ')}. Evite: ${caso.evite.join('; ')}. Pulo do gato: "${caso.puloDoGato}"

${textoIcp(icp)}

O CLIENTE ERA ${textoTipo(caso.tipo)}

${CHECKLIST_OBSERVADOR}

${PRINCIPIOS}

${textoMeuTipo(meuTipo)}

COMO ESCREVER O RETORNO (fale com o negociador, em "você"; tom de colega experiente, direto e respeitoso; registre fatos citando entre aspas frases da transcrição):
1. A SEQUÊNCIA — cada um dos 5 itens com SIM, EM PARTE ou NÃO e a evidência em uma linha.
2. O TIPO DO CLIENTE — os 4 itens com SIM, EM PARTE ou NÃO e a evidência.
3. A NECESSIDADE DO ICP — os 4 itens com SIM, EM PARTE ou NÃO e a evidência.
4. O SEU AUTOMÁTICO — quais comportamentos da lista apareceram quando travou (ou "nenhum"), com a frase que mostra.
PISTAS DO CLIENTE — as frases ou comportamentos dele que mostravam o tipo.
O MOMENTO QUE MUDOU A CONVERSA — quando avançou ou travou, e por quê.
UMA SUGESTÃO — o que fazer diferente, com uma frase pronta para usar.
EU × OUTRO — a pergunta do automático de quem negocia (ver QUEM NEGOCIA) e como ela apareceu, ou não, neste treino.
Se a transcrição for curta demais para avaliar algum item, diga "não deu para observar" naquele item. Não invente o que não está na transcrição. Feche com uma frase curta de incentivo, sem exagero.

${FORMATO}`
}
