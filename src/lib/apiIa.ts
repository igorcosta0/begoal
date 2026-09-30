import { NextResponse } from 'next/server'

// Pente fino (M5): proteções comuns das rotas de IA.

export const LIMITE_PERGUNTA = 2000
const LIMITE_MENSAGENS_HISTORICO = 20
const LIMITE_TEXTO_HISTORICO = 4000

export interface MensagemHistorico {
  role: 'user' | 'model'
  texto: string
}

// O histórico vem do navegador: aceita só os dois papéis válidos, corta o
// tamanho e o número de mensagens (custo e tamanho do prompt). Continua sendo
// dado do cliente — as respostas "model" não são verificadas; a regra de não
// revelar o perfil de outra pessoa fica no system prompt e no filtro de saída.
export function limparHistorico(historico: unknown): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  if (!Array.isArray(historico)) return []
  return historico
    .filter((m): m is MensagemHistorico =>
      !!m && typeof m === 'object' &&
      ((m as any).role === 'user' || (m as any).role === 'model') &&
      typeof (m as any).texto === 'string')
    .slice(-LIMITE_MENSAGENS_HISTORICO)
    .map((m) => ({ role: m.role, parts: [{ text: m.texto.slice(0, LIMITE_TEXTO_HISTORICO) }] }))
}

// Quantas mensagens a pessoa já mandou antes desta (usado pelo método de conversa).
export function mensagensAnterioresDaPessoa(historico: unknown): number {
  return limparHistorico(historico).filter((m) => m.role === 'user').length
}

// Pedido (30/09/2026): as respostas dos chats do Autoconhecimento estavam
// genéricas. A IA passa a investigar a dificuldade antes de sugerir: primeiro
// pergunta, depois orienta em cima do que a pessoa contou.
// `assunto` completa a frase "entender ..." (ex.: "a dificuldade que a pessoa está vivendo").
export function metodoConversa(assunto: string, anteriores: number): string {
  const rodada = anteriores + 1
  return `MÉTODO DA CONVERSA (siga sempre):
Esta é a mensagem nº ${rodada} da pessoa nesta conversa. O que ela já contou está no histórico; use tudo, não só a última mensagem.

1. INVESTIGAR ANTES DE SUGERIR. Seu primeiro trabalho é entender ${assunto}. Antes de orientar, você precisa saber:
   - o que aconteceu de fato (um exemplo concreto e recente, não uma descrição geral);
   - o que a pessoa já tentou e como foi;
   - o que ela sente ou o que mais a incomoda nisso;
   - o que ela quer que mude (qual seria um bom resultado).
2. Enquanto faltar parte disso, NÃO dê conselho. Responda com uma frase curta mostrando que entendeu o que ela disse (sem julgar) e faça no máximo 3 perguntas, específicas e ligadas ao que ela escreveu — nada de questionário genérico. Numere as perguntas.
3. Na mensagem nº 1, pergunte quase sempre. Só pule direto para a orientação se a pessoa já trouxe um exemplo concreto, o que tentou e o que quer.
4. Depois de no máximo 2 rodadas de perguntas (mensagem nº 3 em diante), oriente mesmo com informação parcial e diga qual suposição fez. Se a pessoa pedir para ir direto à sugestão, oriente na hora.
5. QUANDO ORIENTAR: ligue cada sugestão a um detalhe que ela contou (cite o detalhe). Proibido conselho que serviria para qualquer pessoa. Dê 2 ou 3 passos concretos, inclua pelo menos uma frase de exemplo que ela pode usar na conversa, e diga o que evitar. Termine com uma pergunta curta para ela voltar e contar como foi ou ajustar o plano.`
}

// Texto livre digitado pela pessoa: obrigatório e com limite de tamanho.
export function validarTexto(valor: unknown, nome: string): { texto: string } | { erro: NextResponse } {
  if (typeof valor !== 'string' || !valor.trim()) {
    return { erro: NextResponse.json({ error: `${nome} ausente` }, { status: 400 }) }
  }
  if (valor.length > LIMITE_PERGUNTA) {
    return { erro: NextResponse.json({ error: `${nome} muito longa (máximo ${LIMITE_PERGUNTA} caracteres)` }, { status: 400 }) }
  }
  return { texto: valor.trim() }
}

// Erro inesperado: detalhe só no log do servidor, nunca na resposta
// (antes ia `String(err)` para o navegador).
export function erroInterno(rota: string, err: unknown) {
  console.error(`[${rota}]`, err)
  return NextResponse.json({ error: 'Não foi possível gerar a resposta agora. Tente novamente em instantes.' }, { status: 500 })
}
