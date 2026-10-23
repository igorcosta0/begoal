import type { Pergunta, RespostaPesquisa, ValorResposta } from '@/lib/queries/pesquisas'

// Números de uma pergunta (guia do Miro, etapa 4: comparativos F52/F54/F59 e
// histórico F51). Mesmas contas da tela de resultados.

export interface MetricaPergunta {
  n: number
  media: number | null // escalas e NPS
  nps: number | null   // só NPS
  opcoes: Record<string, number> | null // múltipla escolha: % de quem respondeu
}

const temValor = (v: ValorResposta | undefined) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)

export function metricaPergunta(q: Pick<Pergunta, 'id' | 'tipo' | 'opcoes'>, respostas: RespostaPesquisa[]): MetricaPergunta {
  const valores = respostas.map((r) => r.itens[q.id]).filter(temValor)
  const n = valores.length
  if (q.tipo === 'escala_0_10' || q.tipo === 'nota_1_5' || q.tipo === 'nps') {
    const nums = valores.map(Number)
    const media = n ? nums.reduce((a, b) => a + b, 0) / n : null
    const nps = q.tipo === 'nps' && n ? Math.round(((nums.filter((x) => x >= 9).length - nums.filter((x) => x <= 6).length) / n) * 100) : null
    return { n, media, nps, opcoes: null }
  }
  if (q.tipo === 'multipla' || q.tipo === 'multipla_varias') {
    const opcoes: Record<string, number> = {}
    for (const op of q.opcoes) {
      const qtd = valores.filter((v) => (Array.isArray(v) ? v.includes(op) : v === op)).length
      opcoes[op] = n ? Math.round((qtd / n) * 100) : 0
    }
    return { n, media: null, nps: null, opcoes }
  }
  return { n, media: null, nps: null, opcoes: null }
}

// Valor principal para comparar e desenhar no histórico.
export function valorPrincipal(q: Pick<Pergunta, 'tipo'>, m: MetricaPergunta): number | null {
  return q.tipo === 'nps' ? m.nps : m.media
}

export function rotuloValorPrincipal(q: Pick<Pergunta, 'tipo'>): string {
  return q.tipo === 'nps' ? 'NPS' : q.tipo === 'nota_1_5' ? 'Média (1 a 5)' : 'Média (0 a 10)'
}

export const formatarNumero = (v: number | null, casas = 1) =>
  v === null ? '—' : v.toFixed(casas).replace('.', ',')

// F59: "a mesma pergunta" = mesmo tipo e mesmo enunciado (sem diferença de
// maiúscula, acento, espaço ou pontuação no fim).
export function chavePergunta(q: Pick<Pergunta, 'tipo' | 'enunciado'>): string {
  const texto = q.enunciado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').replace(/[?.!:\s]+$/, '').trim()
  return `${q.tipo}|${texto}`
}

export function casarPerguntas<A extends Pick<Pergunta, 'tipo' | 'enunciado'>, B extends Pick<Pergunta, 'tipo' | 'enunciado'>>(atuais: A[], anteriores: B[]) {
  const mapa = new Map(anteriores.map((q) => [chavePergunta(q), q]))
  const comuns: { atual: A; anterior: B }[] = []
  const soAtual: A[] = []
  for (const q of atuais) {
    const outra = mapa.get(chavePergunta(q))
    if (outra) { comuns.push({ atual: q, anterior: outra }); mapa.delete(chavePergunta(q)) } else soAtual.push(q)
  }
  return { comuns, soAtual, soAnterior: Array.from(mapa.values()) }
}
