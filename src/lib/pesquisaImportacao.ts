import type { ParticipanteRascunho } from '@/lib/queries/pesquisas'

// Importação da lista de participantes (guia do Miro, etapa 3: F33 planilha
// com nome, e-mail, setor e cargo; F34 tempo de empresa e estado; F35
// validação). Lê .xlsx, .xls e .csv pelo SheetJS (carregado só quando usado).

export const LIMITE_PARTICIPANTES = 3000

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Campo = keyof ParticipanteRascunho

// Nomes de coluna aceitos (comparados sem acento, sem maiúscula e sem pontuação).
const SINONIMOS: Record<Campo, string[]> = {
  nome: ['nome', 'nome completo', 'colaborador', 'funcionario', 'participante'],
  email: ['email', 'e mail', 'correio eletronico'],
  setor: ['setor', 'area', 'departamento', 'time', 'equipe'],
  cargo: ['cargo', 'funcao', 'posicao'],
  tempo_empresa: ['tempo de empresa', 'tempo empresa', 'tempo de casa', 'admissao', 'data de admissao', 'anos de empresa'],
  estado: ['estado', 'uf'],
  cliente: ['cliente', 'empresa', 'empresa cliente', 'conta'],
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export const FAIXAS_TEMPO = ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos'] as const

function faixaPorAnos(anos: number): string {
  if (anos < 1) return FAIXAS_TEMPO[0]
  if (anos < 3) return FAIXAS_TEMPO[1]
  if (anos < 5) return FAIXAS_TEMPO[2]
  return FAIXAS_TEMPO[3]
}

// Mesmas faixas da função pesquisa_faixa_tempo do banco. Aceita anos ("2",
// "2,5", "3 anos"), data de admissão (dd/mm/aaaa ou aaaa-mm-dd) ou a própria
// faixa. Outro texto fica como veio.
export function faixaTempoEmpresa(valor: string): string | null {
  const v = valor.trim()
  if (!v) return null
  const anos = v.match(/^(\d+(?:[.,]\d+)?)\s*(anos?)?$/i)
  if (anos) return faixaPorAnos(Number(anos[1].replace(',', '.')))
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const data = br
    ? new Date(Number(br[3].length === 2 ? `20${br[3]}` : br[3]), Number(br[2]) - 1, Number(br[1]))
    : iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : null
  if (data && !isNaN(data.getTime())) {
    return faixaPorAnos((Date.now() - data.getTime()) / (365.25 * 24 * 3600 * 1000))
  }
  return v.slice(0, 60)
}

function decodificarTexto(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export interface ResultadoImportacao {
  participantes: ParticipanteRascunho[]
  problemas: { linha: number; motivo: string }[]
  colunas: Campo[] // colunas reconhecidas
  linhasLidas: number
}

export async function lerPlanilha(arquivo: File): Promise<ResultadoImportacao> {
  const XLSX = await import('xlsx')
  const bytes = await arquivo.arrayBuffer()
  // CSV: o Excel salva em Windows-1252 ou em UTF-8 (com ou sem BOM). Tenta
  // UTF-8 estrito e cai para 1252, senão "José" vira "JosÃ©".
  const wb = /\.csv$/i.test(arquivo.name)
    ? XLSX.read(decodificarTexto(bytes), { type: 'string' })
    : XLSX.read(bytes, { type: 'array', cellDates: false })
  const aba = wb.Sheets[wb.SheetNames[0]]
  if (!aba) throw new Error('A planilha está vazia.')
  const linhas = XLSX.utils.sheet_to_json<string[]>(aba, { header: 1, defval: '', raw: false, blankrows: false })
  if (linhas.length < 2) throw new Error('A planilha precisa de uma linha de títulos e pelo menos uma pessoa.')

  // Acha a coluna de cada campo pelo título.
  const titulos = linhas[0].map((t) => normalizar(String(t)))
  const indice: Partial<Record<Campo, number>> = {}
  for (const campo of Object.keys(SINONIMOS) as Campo[]) {
    const i = titulos.findIndex((t) => SINONIMOS[campo].includes(t))
    if (i >= 0) indice[campo] = i
  }
  if (indice.nome === undefined || indice.email === undefined) {
    throw new Error('Não achei as colunas "Nome" e "E-mail" na primeira linha. Use o modelo de planilha.')
  }

  const corpo = linhas.slice(1)
  if (corpo.length > LIMITE_PARTICIPANTES) {
    throw new Error(`A planilha tem ${corpo.length} pessoas. O limite é ${LIMITE_PARTICIPANTES} por pesquisa.`)
  }

  const participantes: ParticipanteRascunho[] = []
  const problemas: { linha: number; motivo: string }[] = []
  const vistos = new Set<string>()
  const ler = (linha: string[], campo: Campo, max: number) => {
    const i = indice[campo]
    const v = i === undefined ? '' : String(linha[i] ?? '').trim().replace(/\s+/g, ' ')
    return v ? v.slice(0, max) : null
  }

  corpo.forEach((linha, k) => {
    const n = k + 2 // número da linha como aparece no Excel
    const nome = ler(linha, 'nome', 200)
    const email = ler(linha, 'email', 200)?.toLowerCase() ?? null
    if (!nome && !email) return
    if (!nome) return void problemas.push({ linha: n, motivo: 'sem nome' })
    if (!email) return void problemas.push({ linha: n, motivo: `${nome}: sem e-mail` })
    if (!EMAIL_RE.test(email)) return void problemas.push({ linha: n, motivo: `${nome}: e-mail inválido (${email})` })
    if (vistos.has(email)) return void problemas.push({ linha: n, motivo: `${nome}: e-mail repetido (${email})` })
    vistos.add(email)
    const estado = ler(linha, 'estado', 60)
    const tempo = ler(linha, 'tempo_empresa', 60)
    participantes.push({
      nome,
      email,
      setor: ler(linha, 'setor', 120),
      cargo: ler(linha, 'cargo', 120),
      tempo_empresa: tempo ? faixaTempoEmpresa(tempo) : null,
      estado: estado && estado.length === 2 ? estado.toUpperCase() : estado,
      cliente: ler(linha, 'cliente', 120),
    })
  })

  return { participantes, problemas, colunas: Object.keys(indice) as Campo[], linhasLidas: corpo.length }
}

export async function baixarModeloPlanilha() {
  const XLSX = await import('xlsx')
  const aba = XLSX.utils.aoa_to_sheet([
    ['Nome', 'E-mail', 'Setor', 'Cargo', 'Tempo de empresa', 'Estado', 'Cliente'],
    ['Maria da Silva', 'maria@exemplo.com.br', 'Comercial', 'Analista', '2', 'SC', 'Cliente A'],
  ])
  aba['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, aba, 'Participantes')
  XLSX.writeFile(wb, 'modelo-participantes.xlsx')
}

// Planilha para mala direta (Gmail/Outlook): cada pessoa com o seu link e a
// mensagem já personalizada.
export async function baixarPlanilhaConvites(
  nomeArquivo: string,
  linhas: { nome: string; email: string; setor: string | null; cargo: string | null; link: string; assunto: string; mensagem: string }[]
) {
  const XLSX = await import('xlsx')
  const aba = XLSX.utils.json_to_sheet(linhas.map((l) => ({
    Nome: l.nome, 'E-mail': l.email, Setor: l.setor ?? '', Cargo: l.cargo ?? '', Link: l.link, Assunto: l.assunto, Mensagem: l.mensagem,
  })))
  aba['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 60 }, { wch: 30 }, { wch: 80 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, aba, 'Convites')
  XLSX.writeFile(wb, nomeArquivo)
}
