'use client'

import { useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { createObjetivo, createKr } from '@/lib/queries/okr'
import { createSinalVital, createSvLancamento } from '@/lib/queries/sinais-vitais'
import {
  Upload, CheckCircle2, AlertCircle, FileSpreadsheet,
  ArrowRight, Info, Tag, Activity
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// Tipos internos do parser
// ─────────────────────────────────────────────────────────────

type TipoItem = 'KR' | 'SV'

interface LancamentoMes {
  mes: number   // 1–12
  valor: number
}

interface ItemPlanilha {
  tipo: TipoItem
  identificador: string         // "KR 2", "Sinal vital"
  titulo: string
  unidade: string | null        // "R$", "%", "Qtd", "Horas"
  okrTitulo: string             // título do bloco OKR pai na planilha
  lancamentos: LancamentoMes[]
}

interface BlocoOKR {
  titulo: string
  items: ItemPlanilha[]
}

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const SHEET_NAME = 'OKR - OPERAÇÃO'
const MONTH_COLS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] // G–R (0-based)
const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const LANCAMENTO_TYPES = new Set(['REAL', 'REAL %', 'REAL h'])
const IGNORAR_TYPES   = new Set(['REAL + PREV', 'PREV', 'META (1T)', 'META %', 'META h',
                                  'Total h', 'Demanda nova h', 'Retrabalho h'])
const LICAO_E_RE = /^#\d+(\.\d+)?$/

// Mapeamento de unidade da planilha → enum do banco (kr_value_type)
function unidadeParaTipoValor(unidade: string | null): 'Numero' | 'Percentual' | 'Moeda' {
  if (!unidade) return 'Numero'
  const u = unidade.trim()
  if (u === 'R$') return 'Moeda'
  if (u === '%') return 'Percentual'
  return 'Numero' // "Qtd", "Horas", qualquer outro
}

// ─────────────────────────────────────────────────────────────
// Parser CTZ — lê a planilha e retorna blocos OKR com seus itens
// ─────────────────────────────────────────────────────────────

function parseCTZ(buffer: ArrayBuffer, ano: number): BlocoOKR[] {
  const wb = XLSX.read(buffer, { type: 'array', cellFormula: false })
  const ws = wb.Sheets[SHEET_NAME]
  if (!ws) throw new Error(`Aba "${SHEET_NAME}" não encontrada. Abas: ${wb.SheetNames.join(', ')}`)

  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1, raw: true, defval: null, blankrows: true,
  }) as (string | number | null)[][]

  const blocos: BlocoOKR[] = []

  // Bloco inicial (antes do primeiro OKR declarado)
  let blocoAtual: BlocoOKR = { titulo: '', items: [] }
  blocos.push(blocoAtual)

  // Item em construção
  let curTipo: TipoItem | null = null
  let curId = ''
  let curTitulo = ''
  let curUnidade: string | null = null
  let monthAcc: (number | null)[] = Array(12).fill(null)
  let inLicao = false

  const flush = () => {
    if (!curTipo || !curId) return
    const lancamentos: LancamentoMes[] = []
    for (let m = 0; m < 12; m++) {
      const v = monthAcc[m]
      if (v !== null && v !== 0) lancamentos.push({ mes: m + 1, valor: v })
    }
    blocoAtual.items.push({
      tipo: curTipo,
      identificador: curId,
      titulo: curTitulo,
      unidade: curUnidade,
      okrTitulo: blocoAtual.titulo,
      lancamentos,
    })
    curTipo = null; curId = ''; curTitulo = ''; curUnidade = null
    monthAcc = Array(12).fill(null); inLicao = false
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? []
    const B = s(row[1])
    const C = s(row[2])
    const E = s(row[4])
    const F = s(row[5])

    // A. Novo bloco OKR
    if (B.toUpperCase().startsWith('OKR -')) {
      flush()
      const titulo = B.replace(/^OKR\s*-\s*/i, '').trim()
      blocoAtual = { titulo, items: [] }
      blocos.push(blocoAtual)
      inLicao = false
      continue
    }

    // B. Novo KR ou Sinal Vital
    const Bup = B.toUpperCase()
    if (B && Bup !== 'KR-SV' && (Bup === 'SINAL VITAL' || /^KR\s+\d+$/.test(Bup))) {
      flush()
      curTipo    = Bup === 'SINAL VITAL' ? 'SV' : 'KR'
      curId      = B
      curTitulo  = C || '(sem título)'
      curUnidade = E || null
      inLicao    = false
      continue
    }

    // C. Início de lição aprendida
    if (LICAO_E_RE.test(E) && F === 'Descrição') { inLicao = true; continue }

    // D. Ignorar metadados e tipos derivados
    if (F === 'Descrição' || F === 'Lição aprendida') continue
    if (IGNORAR_TYPES.has(F)) continue

    // E. Capturar REAL
    if (!LANCAMENTO_TYPES.has(F) || !curTipo) continue

    const vals = monthValues(row)
    for (let m = 0; m < 12; m++) {
      const v = vals[m]
      if (v === null) continue
      if (inLicao) {
        // Lição aprendida: cada "1" = 1 ocorrência → somar ao KR pai
        monthAcc[m] = (monthAcc[m] ?? 0) + v
      } else {
        if (monthAcc[m] === null) monthAcc[m] = v
        // (segunda linha REAL do mesmo KR — manter a primeira)
      }
    }
  }

  flush()

  // Remove blocos totalmente vazios
  return blocos.filter(b => b.items.length > 0)
}

function s(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim()
}

function monthValues(row: (string | number | null)[]): (number | null)[] {
  return MONTH_COLS.map(ci => {
    const v = row[ci]
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number') return v
    const n = parseFloat(String(v).replace(',', '.'))
    return isNaN(n) ? null : n
  })
}

// ─────────────────────────────────────────────────────────────
// Tipos da UI
// ─────────────────────────────────────────────────────────────

type StatusItem = 'pendente' | 'criando' | 'ok' | 'ja_existe' | 'erro'

interface ItemImportacao {
  tipo: TipoItem
  identificador: string
  titulo: string
  unidade: string | null
  okrTitulo: string
  lancamentos: LancamentoMes[]
  // resultado
  status: StatusItem
  erro?: string
  id_criado?: string     // id do KR ou SV criado no banco
  objetivo_id?: string   // objetivo que foi criado/encontrado
}

// ─────────────────────────────────────────────────────────────
// Utilitários de exibição
// ─────────────────────────────────────────────────────────────

function formatValor(v: number, unidade: string | null): string {
  if (unidade === 'R$') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (unidade === '%') return `${(v * 100).toFixed(1)}%`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function ImportarLancamentosPage() {
  const { empresa } = useEmpresaStore()

  type Etapa = 'upload' | 'preview' | 'importando' | 'concluido'
  const [etapa, setEtapa] = useState<Etapa>('upload')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [dragging, setDragging] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [erroUpload, setErroUpload] = useState('')
  const [itens, setItens] = useState<ItemImportacao[]>([])
  const [progresso, setProgresso] = useState(0)

  // ── Upload ──────────────────────────────────────────────────

  const processarArquivo = useCallback(async (file: File) => {
    if (!empresa) return
    setErroUpload('')
    setNomeArquivo(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const blocos = parseCTZ(buffer, ano)

      if (blocos.length === 0) {
        setErroUpload('Nenhum KR ou Sinal Vital encontrado. Verifique se o arquivo é a planilha correta.')
        return
      }

      // Montar lista plana de itens para importar
      const lista: ItemImportacao[] = blocos.flatMap(bloco =>
        bloco.items.map(item => ({
          ...item,
          status: 'pendente' as StatusItem,
        }))
      )

      setItens(lista)
      setEtapa('preview')
    } catch (e: any) {
      setErroUpload(e.message ?? 'Erro ao processar planilha.')
    }
  }, [empresa, ano])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processarArquivo(file)
    }
  }, [processarArquivo])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
  }

  // ── Importação ──────────────────────────────────────────────

  async function handleImportar() {
    if (!empresa) return
    setEtapa('importando')
    setProgresso(0)

    const supabase = createClient()

    // Buscar primeiro funcionário da empresa para usar como responsável padrão
    const { data: funcs } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('client_id', empresa.id)
      .limit(1)
    const responsavelPadraoId = funcs?.[0]?.id ?? null

    if (!responsavelPadraoId) {
      setItens(prev => prev.map(it => ({ ...it, status: 'erro', erro: 'Nenhum funcionário cadastrado na empresa' })))
      setEtapa('concluido')
      return
    }

    // Cache de objetivos criados nesta sessão: título → id
    const objetivoCache: Record<string, string> = {}

    const atualizar = (idx: number, patch: Partial<ItemImportacao>) =>
      setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

    for (let idx = 0; idx < itens.length; idx++) {
      const item = itens[idx]
      atualizar(idx, { status: 'criando' })

      try {
        // ── 1. Garantir que o Objetivo existe ─────────────────
        let objetivoId: string

        if (objetivoCache[item.okrTitulo]) {
          objetivoId = objetivoCache[item.okrTitulo]
        } else {
          // Verificar se já existe no banco com esse título
          const { data: existentes } = await supabase
            .from('objetivos')
            .select('id')
            .eq('client_id', empresa.id)
            .ilike('titulo', item.okrTitulo.trim())
            .limit(1)

          if (existentes && existentes.length > 0) {
            objetivoId = existentes[0].id
          } else {
            // Criar o objetivo
            const { data: novoObj, error: errObj } = await createObjetivo({
              titulo: item.okrTitulo || 'Objetivo Importado',
              client_id: empresa.id,
            })
            if (errObj || !novoObj) throw new Error(`Erro ao criar objetivo: ${errObj?.message}`)
            objetivoId = novoObj.id
          }
          objetivoCache[item.okrTitulo] = objetivoId
        }

        // ── 2. Criar o KR ou Sinal Vital ──────────────────────

        if (item.tipo === 'KR') {
          // Verificar se já existe KR com mesmo título no objetivo
          const { data: krExist } = await supabase
            .from('krs')
            .select('id')
            .eq('client_id', empresa.id)
            .eq('objetivo_id', objetivoId)
            .ilike('titulo', item.titulo.trim())
            .limit(1)

          let krId: string

          if (krExist && krExist.length > 0) {
            krId = krExist[0].id
            atualizar(idx, { status: 'ja_existe', id_criado: krId, objetivo_id: objetivoId })
          } else {
            const { data: novoKr, error: errKr } = await createKr({
              titulo: item.titulo,
              objetivo_id: objetivoId,
              client_id: empresa.id,
              responsavel_id: responsavelPadraoId,
              tipo_valor: unidadeParaTipoValor(item.unidade),
              valor_inicial: 0,
              meta: 0,
            })
            if (errKr || !novoKr) throw new Error(`Erro ao criar KR: ${errKr?.message}`)
            krId = novoKr.id
            atualizar(idx, { id_criado: krId, objetivo_id: objetivoId })
          }

          // ── 3. Inserir lançamentos do KR ──────────────────────
          for (const lanc of item.lancamentos) {
            const dataLanc = `${ano}-${String(lanc.mes).padStart(2, '0')}-01`

            // Upsert: se já existe, atualiza
            const { data: exist } = await supabase
              .from('kr_lancamentos')
              .select('id')
              .eq('kr_id', krId)
              .eq('data_lancamento', dataLanc)
              .limit(1)

            if (exist && exist.length > 0) {
              await supabase.from('kr_lancamentos')
                .update({ valor: lanc.valor })
                .eq('kr_id', krId)
                .eq('data_lancamento', dataLanc)
            } else {
              await supabase.from('kr_lancamentos').insert({
                kr_id: krId,
                valor: lanc.valor,
                data_lancamento: dataLanc,
                comentario: 'Importado via planilha CTZ',
              })
            }
          }

          // Atualiza valor_atual com o lançamento mais recente
          const { data: ultimoLanc } = await supabase
            .from('kr_lancamentos')
            .select('valor')
            .eq('kr_id', krId)
            .order('data_lancamento', { ascending: false })
            .limit(1)
            .single()
          if (ultimoLanc) {
            await supabase.from('krs').update({ valor_atual: ultimoLanc.valor }).eq('id', krId)
          }

          atualizar(idx, { status: 'ok' })

        } else {
          // ── SV: criar na seção de Sinais Vitais ──────────────
          const { data: svExist } = await supabase
            .from('sinais_vitais')
            .select('id')
            .eq('client_id', empresa.id)
            .ilike('titulo', item.titulo.trim())
            .limit(1)

          let svId: string

          if (svExist && svExist.length > 0) {
            svId = svExist[0].id
            atualizar(idx, { status: 'ja_existe', id_criado: svId, objetivo_id: objetivoId })
          } else {
            const { data: novoSv, error: errSv } = await createSinalVital({
              titulo: item.titulo,
              client_id: empresa.id,
              objetivo_id: objetivoId,
              tipo_valor: unidadeParaTipoValor(item.unidade),
              valor_inicial: 0,
              meta: 0,
            })
            if (errSv || !novoSv) throw new Error(`Erro ao criar Sinal Vital: ${errSv?.message}`)
            svId = novoSv.id
            atualizar(idx, { id_criado: svId, objetivo_id: objetivoId })
          }

          // Inserir lançamentos do SV
          for (const lanc of item.lancamentos) {
            const dataLanc = `${ano}-${String(lanc.mes).padStart(2, '0')}-01`

            const { data: exist } = await supabase
              .from('sinais_vitais_lancamentos')
              .select('id')
              .eq('sinal_vital_id', svId)
              .eq('data_lancamento', dataLanc)
              .limit(1)

            if (exist && exist.length > 0) {
              await supabase.from('sinais_vitais_lancamentos')
                .update({ valor: lanc.valor })
                .eq('sinal_vital_id', svId)
                .eq('data_lancamento', dataLanc)
            } else {
              await createSvLancamento({
                sinal_vital_id: svId,
                valor: lanc.valor,
                data_lancamento: dataLanc,
                comentario: 'Importado via planilha CTZ',
              })
            }
          }

          atualizar(idx, { status: 'ok' })
        }

      } catch (e: any) {
        atualizar(idx, { status: 'erro', erro: e.message ?? 'Erro desconhecido' })
      }

      setProgresso(Math.round(((idx + 1) / itens.length) * 100))
    }

    setEtapa('concluido')
  }

  // ── Contadores ──────────────────────────────────────────────
  const totalKRs  = itens.filter(i => i.tipo === 'KR').length
  const totalSVs  = itens.filter(i => i.tipo === 'SV').length
  const okCount   = itens.filter(i => i.status === 'ok').length
  const erroCount = itens.filter(i => i.status === 'erro').length
  const jaExiste  = itens.filter(i => i.status === 'ja_existe').length

  // Agrupar por OKR para o preview
  const porOkr = itens.reduce<Record<string, ItemImportacao[]>>((acc, it) => {
    const key = it.okrTitulo || '(Sem OKR declarado)'
    if (!acc[key]) acc[key] = []
    acc[key].push(it)
    return acc
  }, {})

  const STEPS = ['Upload', 'Revisão', 'Importando', 'Concluído']
  const stepIdx = { upload: 0, preview: 1, importando: 2, concluido: 3 }[etapa]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Lançamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe OKRs, KRs e Sinais Vitais a partir da planilha CTZ
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isDone = idx < stepIdx
          const isAtual = idx === stepIdx
          return (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${isDone ? 'bg-primary text-primary-foreground'
                  : isAtual ? 'bg-primary/20 text-primary border border-primary'
                  : 'bg-secondary text-muted-foreground'}`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={`text-xs font-medium ${isAtual ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step}
              </span>
              {idx < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* ── ETAPA 1: UPLOAD ───────────────────────────────────── */}
      {etapa === 'upload' && (
        <div className="space-y-4">
          {erroUpload && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{erroUpload}</p>
            </div>
          )}

          {/* Seleção de ano */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <label className="text-xs text-foreground font-medium">Ano dos lançamentos:</label>
            <input
              type="number"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors
              ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/10'}`}
          >
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Arraste a planilha CTZ aqui</p>
            <p className="text-xs text-muted-foreground mb-4">ou clique para selecionar um arquivo .xlsx</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
              <Upload className="w-4 h-4" />
              Selecionar arquivo
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            </label>
          </div>

          <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-foreground">O que será importado:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2">
                <Tag className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Objetivos</span> — criados automaticamente por bloco OKR detectado na planilha
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">KRs</span> — criados e vinculados ao objetivo correspondente
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Activity className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Sinais Vitais</span> — criados na seção de Sinais Vitais, vinculados ao objetivo
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Lançamentos mensais</span> — apenas linhas REAL com valores preenchidos
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ETAPA 2: PREVIEW ──────────────────────────────────── */}
      {etapa === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">📄 {nomeArquivo}</p>
              <p className="text-xs text-muted-foreground">
                {Object.keys(porOkr).length} objetivo{Object.keys(porOkr).length !== 1 ? 's' : ''} · {totalKRs} KR{totalKRs !== 1 ? 's' : ''} · {totalSVs} Sinal{totalSVs !== 1 ? 'is' : ''} Vital
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">Ano: {ano}</span>
          </div>

          <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
            {Object.entries(porOkr).map(([okrTitulo, items]) => (
              <div key={okrTitulo} className="border border-border rounded-xl overflow-hidden">
                {/* Header OKR */}
                <div className="bg-primary/8 border-b border-border px-4 py-2.5 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    Objetivo:
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {okrTitulo || '(Será criado automaticamente)'}
                  </span>
                </div>

                {/* Items do bloco */}
                <div className="divide-y divide-border/50">
                  {items.map((item, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                          ${item.tipo === 'KR' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {item.tipo === 'KR'
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <Activity className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                              ${item.tipo === 'KR' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {item.tipo === 'KR' ? item.identificador : 'Sinal Vital'}
                            </span>
                            {item.unidade && (
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                {item.unidade}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground">{item.titulo}</p>
                          {item.lancamentos.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.lancamentos.map(l => (
                                <span key={l.mes} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                                  {MONTH_LABELS[l.mes - 1]} = {formatValor(l.valor, item.unidade)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-1 italic">
                              Sem lançamentos REAL — será criado sem valores
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setEtapa('upload'); setItens([]); setNomeArquivo(''); setErroUpload('') }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleImportar}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Importar — {Object.keys(porOkr).length} objetivo{Object.keys(porOkr).length !== 1 ? 's' : ''}, {totalKRs} KR{totalKRs !== 1 ? 's' : ''}, {totalSVs} SV{totalSVs !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 3: IMPORTANDO ───────────────────────────────── */}
      {etapa === 'importando' && (
        <div className="space-y-4">
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground">Importando...</p>
            <div className="w-full bg-secondary rounded-full h-2 max-w-xs mx-auto">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{progresso}%</p>
          </div>

          {/* Log em tempo real */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {itens.map((item, idx) => (
              item.status !== 'pendente' && (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg">
                  {item.status === 'criando' && <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                  {item.status === 'ok'      && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {item.status === 'ja_existe' && <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  {item.status === 'erro'    && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className="text-xs text-foreground truncate">{item.titulo}</span>
                  {item.status === 'ja_existe' && <span className="text-[10px] text-amber-600 shrink-0">já existe</span>}
                  {item.status === 'erro' && <span className="text-[10px] text-red-600 shrink-0">{item.erro}</span>}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* ── ETAPA 4: CONCLUÍDO ────────────────────────────────── */}
      {etapa === 'concluido' && (
        <div className="space-y-4">
          <div className="text-center py-8 space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-foreground">Importação concluída!</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{okCount}</p>
                <p className="text-xs text-muted-foreground">criados</p>
              </div>
              {jaExiste > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-500">{jaExiste}</p>
                  <p className="text-xs text-muted-foreground">já existiam</p>
                </div>
              )}
              {erroCount > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-red-500">{erroCount}</p>
                  <p className="text-xs text-muted-foreground">com erro</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de erros, se houver */}
          {erroCount > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-red-700">{erroCount} erro{erroCount !== 1 ? 's' : ''}:</p>
              {itens.filter(i => i.status === 'erro').map((i, idx) => (
                <p key={idx} className="text-xs text-red-600">• {i.titulo}: {i.erro}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setEtapa('upload'); setItens([]); setNomeArquivo(''); setErroUpload('') }}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Nova importação
            </button>
            <a
              href="/okr"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center"
            >
              Ver OKRs
            </a>
            <a
              href="/sinais-vitais"
              className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center border border-border"
            >
              Ver Sinais Vitais
            </a>
          </div>
        </div>
      )}
    </div>
  )
}