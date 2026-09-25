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
