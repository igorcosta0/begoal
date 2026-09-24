import { formatValor } from '@/lib/utils'

// Cálculo único de progresso de KR, usado na página de OKRs e na Início
// (antes cada uma tinha a sua cópia da fórmula).

export type DirecaoKr = 'maior' | 'menor'
export type ApuracaoKr = 'ultimo' | 'soma' | 'media'

export interface LancamentoKr {
  valor: number
  data_lancamento: string
  is_final_result?: boolean | null
}

export interface PontoSerie {
  data: string
  valor: number
}

export interface ResultadoKr {
  // Valor apurado conforme a forma de apuração; null = sem lançamentos.
  valorApurado: number | null
  // 0–100; null = sem lançamentos (fica fora da média do objetivo).
  progresso: number | null
  // Meta igual ao valor inicial (ex.: 0 falhas): só dá pra estar dentro ou fora.
  binario: boolean
  direcao: DirecaoKr
  // Lançamentos comuns (sem o "resultado final"), em ordem cronológica.
  serie: PontoSerie[]
}

export const ROTULO_APURACAO: Record<ApuracaoKr, string> = {
  ultimo: 'Conquistado',
  soma: 'Acumulado',
  media: 'Média',
}

// meta < inicial sempre foi tratado como "quanto menor, melhor" (comportamento
// anterior à coluna direcao); a coluna cobre o caso meta = inicial.
export function direcaoEfetiva(kr: { direcao?: string | null; meta?: number | null; valor_inicial?: number | null }): DirecaoKr {
  const meta = Number(kr.meta ?? 0)
  const inicial = Number(kr.valor_inicial ?? 0)
  if (kr.direcao === 'menor' || meta < inicial) return 'menor'
  return 'maior'
}

export function calcularKr(
  kr: {
    direcao?: string | null
    apuracao?: string | null
    meta?: number | null
    valor_inicial?: number | null
    concluido?: boolean | null
  },
  lancamentos: LancamentoKr[] = []
): ResultadoKr {
  const direcao = direcaoEfetiva(kr)
  const meta = Number(kr.meta ?? 0)
  const inicial = Number(kr.valor_inicial ?? 0)
  const apuracao: ApuracaoKr = kr.apuracao === 'soma' || kr.apuracao === 'media' ? kr.apuracao : 'ultimo'

  // Data "AAAA-MM-DD" ordena certo como texto.
  const ordenados = [...lancamentos].sort((a, b) => a.data_lancamento.localeCompare(b.data_lancamento))
  const serie = ordenados
    .filter((l) => !l.is_final_result)
    .map((l) => ({ data: l.data_lancamento, valor: Number(l.valor) }))
  const final = ordenados.filter((l) => l.is_final_result).pop()

  let valorApurado: number | null = null
  if (final) {
    valorApurado = Number(final.valor)
  } else if (serie.length > 0) {
    if (apuracao === 'soma') valorApurado = serie.reduce((a, p) => a + p.valor, 0)
    else if (apuracao === 'media') valorApurado = serie.reduce((a, p) => a + p.valor, 0) / serie.length
    else valorApurado = serie[serie.length - 1].valor
  }

  const binario = meta === inicial
  let progresso: number | null = null
  if (valorApurado !== null) {
    const v = valorApurado
    if (binario) {
      progresso = (direcao === 'menor' ? v <= meta : v >= meta) ? 100 : 0
    } else if (direcao === 'menor') {
      progresso = meta < inicial ? ((inicial - v) / (inicial - meta)) * 100 : v <= meta ? 100 : 0
    } else {
      progresso = meta > inicial ? ((v - inicial) / (meta - inicial)) * 100 : v >= meta ? 100 : 0
    }
    progresso = Math.min(100, Math.max(0, progresso))
  }

  return { valorApurado, progresso, binario, direcao, serie }
}

// Média do objetivo: ignora KR sem lançamentos e, se pedido, KR finalizado.
export function progressoObjetivo(
  krs: { progresso: number | null; concluido?: boolean | null }[],
  ignorarFinalizados: boolean
): number | null {
  const validos = krs.filter((kr) => kr.progresso !== null && !(ignorarFinalizados && kr.concluido))
  if (validos.length === 0) return null
  return validos.reduce((a, kr) => a + (kr.progresso as number), 0) / validos.length
}

// Variação do último lançamento em relação ao anterior.
export function tendenciaKr(serie: PontoSerie[], direcao: DirecaoKr, tipoValor?: string) {
  if (serie.length < 2) return null
  const ultimo = serie[serie.length - 1]
  const anterior = serie[serie.length - 2]
  const delta = ultimo.valor - anterior.valor
  const [ano, mes] = anterior.data.split('-')
  const texto =
    tipoValor === 'Percentual'
      ? `${(Math.abs(delta) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`
      : formatValor(Math.abs(delta), tipoValor)
  return {
    delta,
    texto,
    referencia: `${mes}/${ano.slice(2)}`,
    melhorou: delta === 0 ? null : direcao === 'maior' ? delta > 0 : delta < 0,
  }
}
