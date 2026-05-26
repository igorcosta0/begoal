'use client'

import { useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getKrsByEmpresa } from '@/lib/queries/okr'
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface ItemPlanilha {
  tipo: 'KR' | 'SV'
  identificador: string
  descricao: string
  responsavel: string
  unidade: string
  objetivo: string
  lancamentos: { mes: string; mesIdx: number; valor: number; tipo_real: string }[]
  meta: number | null
}

interface LancamentoPreview {
  kr_id?: string
  kr_titulo: string
  mes: string
  mesIdx: number
  valor: number
  data_lancamento: string
  status: 'pendente' | 'importado' | 'erro'
  tipo: 'KR' | 'SV'
  objetivo: string
  unidade: string
  responsavel: string
  meta: number | null
}

function parsePlanilhaCTZ(wb: XLSX.WorkBook): ItemPlanilha[] {
  const abaOkr = wb.SheetNames.find(n =>
    n.toLowerCase().includes('okr') || n.toLowerCase().includes('opera')
  ) ?? wb.SheetNames[0]

  const ws = wb.Sheets[abaOkr]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]

  // Identificar colunas dos meses no cabeçalho (row 0)
  const headerRow = data[0] ?? []
  const mesColMap: Record<string, number> = {}
  headerRow.forEach((cell, idx) => {
    if (!cell) return
    const str = String(cell).trim()
    MESES.forEach((mes, mesIdx) => {
      if (str.toLowerCase().startsWith(mes.toLowerCase())) {
        mesColMap[mes] = idx
      }
    })
  })

  // Detectar linhas ocultas via !rows
  const hiddenRows = new Set<number>()
  const wsAny = ws as any
  if (wsAny['!rows']) {
    wsAny['!rows'].forEach((rowInfo: any, idx: number) => {
      if (rowInfo && rowInfo.hidden) hiddenRows.add(idx + 1) // 1-indexed
    })
  }

  const itens: ItemPlanilha[] = []
  let objetivoAtual = 'Faturamento e Projetos Concretize' // nome para bloco sem OKR explícito
  let itemAtual: ItemPlanilha | null = null

  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1 // 1-indexed
    if (hiddenRows.has(rowNum)) continue // ignora linhas ocultas

    const row = data[i]
    if (!row) continue

    const colB = row[1] != null ? String(row[1]).trim() : ''
    const colC = row[2] != null ? String(row[2]).trim() : ''
    const colD = row[3] != null ? String(row[3]).trim() : ''
    const colE = row[4] != null ? String(row[4]).trim() : ''
    const colF = row[5] != null ? String(row[5]).trim() : ''

    // Ignora linhas de lições aprendidas (Col E tem "#N")
    if (/^#\d/.test(colE)) continue

    // Detecta novo OKR
    if (colB.startsWith('OKR -') || colB.toLowerCase().startsWith('okr -')) {
      objetivoAtual = colB.replace(/^OKR\s*-\s*/i, '').trim()
      itemAtual = null
      continue
    }

    // Detecta novo KR
    if (/^KR\s+\d+/i.test(colB) && colC) {
      if (itemAtual) itens.push(itemAtual)

      // Pega meta da linha atual (tipo META ou META (1T))
      let metaVal: number | null = null
      if (colF.includes('META')) {
        const mesesVals = MESES.map(m => {
          const idx = mesColMap[m]
          if (idx === undefined) return null
          const v = row[idx]
          return v != null && !isNaN(Number(v)) ? Number(v) : null
        }).filter(v => v !== null)
        if (mesesVals.length > 0) metaVal = mesesVals[0] as number
      }

      itemAtual = {
        tipo: 'KR',
        identificador: colB,
        descricao: colC,
        responsavel: colD,
        unidade: colE,
        objetivo: objetivoAtual,
        lancamentos: [],
        meta: metaVal,
      }
      continue
    }

    // Detecta novo Sinal Vital
    if (colB === 'Sinal vital' && colC) {
      if (itemAtual) itens.push(itemAtual)

      let metaVal: number | null = null
      if (colF.includes('META')) {
        const mesesVals = MESES.map(m => {
          const idx = mesColMap[m]
          if (idx === undefined) return null
          const v = row[idx]
          return v != null && !isNaN(Number(v)) ? Number(v) : null
        }).filter(v => v !== null)
        if (mesesVals.length > 0) metaVal = mesesVals[0] as number
      }

      itemAtual = {
        tipo: 'SV',
        identificador: 'Sinal vital',
        descricao: colC,
        responsavel: colD,
        unidade: colE,
        objetivo: objetivoAtual,
        lancamentos: [],
        meta: metaVal,
      }
      continue
    }

    // Captura lançamentos REAL (ignora REAL + PREV e META e PREV)
    if (itemAtual && colF) {
      const tipoReal = colF.toUpperCase()
      if (
        (tipoReal === 'REAL' || tipoReal === 'REAL %' || tipoReal === 'REAL H') &&
        !tipoReal.includes('PREV')
      ) {
        MESES.forEach((mes, mesIdx) => {
          const colIdx = mesColMap[mes]
          if (colIdx === undefined) return
          const val = row[colIdx]
          if (val != null && val !== '' && !isNaN(Number(val)) && Number(val) !== 0) {
            itemAtual!.lancamentos.push({
              mes,
              mesIdx: mesIdx + 1,
              valor: Number(val),
              tipo_real: colF,
            })
          }
        })
      }
    }
  }

  // Adicionar último item
  if (itemAtual) itens.push(itemAtual)

  return itens.filter(item => item.descricao)
}

export default function ImportarLancamentosPage() {
  const { empresa } = useEmpresaStore()
  const [etapa, setEtapa] = useState<'upload' | 'mapeamento' | 'preview' | 'importando' | 'concluido'>('upload')
  const [itensPlanilha, setItensPlanilha] = useState<ItemPlanilha[]>([])
  const [krsEmpresa, setKrsEmpresa] = useState<any[]>([])
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({})
  const [ano, setAno] = useState(new Date().getFullYear())
  const [preview, setPreview] = useState<LancamentoPreview[]>([])
  const [progresso, setProgresso] = useState(0)
  const [erros, setErros] = useState<string[]>([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [dragging, setDragging] = useState(false)
  const [logImport, setLogImport] = useState<string[]>([])

  const processarArquivo = useCallback(async (file: File) => {
    if (!empresa) return
    setNomeArquivo(file.name)
    setErros([])

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const itens = parsePlanilhaCTZ(wb)

    if (itens.length === 0) {
      setErros(['Nenhum KR ou Sinal Vital encontrado. Verifique se a planilha segue o formato esperado.'])
      return
    }

    setItensPlanilha(itens)

    const { data: krsData } = await getKrsByEmpresa(empresa.id)
    setKrsEmpresa(krsData ?? [])

    // Auto-mapeamento por similaridade
    const mapAuto: Record<string, string> = {}
    itens.filter(i => i.tipo === 'KR').forEach(item => {
      const match = (krsData ?? []).find((k: any) => {
        const a = k.titulo.toLowerCase()
        const b = item.descricao.toLowerCase()
        const wordsA = a.split(' ').filter((w: string) => w.length > 4)
        const wordsB = b.split(' ').filter((w: string) => w.length > 4)
        const common = wordsA.filter((w: string) => wordsB.some((wb: string) => wb.includes(w) || w.includes(wb)))
        return common.length >= 2
      })
      if (match) mapAuto[item.descricao] = match.id
    })
    setMapeamento(mapAuto)
    setEtapa('mapeamento')
  }, [empresa])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processarArquivo(file)
  }, [processarArquivo])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
  }

  function gerarPreview() {
    const lancamentos: LancamentoPreview[] = []
    itensPlanilha.forEach(item => {
      if (item.tipo === 'KR') {
        const krId = mapeamento[item.descricao]
        if (!krId) return
        const krEmpresa = krsEmpresa.find(k => k.id === krId)
        item.lancamentos.forEach(({ mes, mesIdx, valor }) => {
          const data = `${ano}-${String(mesIdx).padStart(2, '0')}-01`
          lancamentos.push({
            kr_id: krId,
            kr_titulo: krEmpresa?.titulo ?? item.descricao,
            mes, mesIdx, valor,
            data_lancamento: data,
            status: 'pendente',
            tipo: 'KR',
            objetivo: item.objetivo,
            unidade: item.unidade,
            responsavel: item.responsavel,
            meta: item.meta,
          })
        })
      } else {
        // Sinal Vital — sempre inclui (será criado no banco)
        item.lancamentos.forEach(({ mes, mesIdx, valor }) => {
          const data = `${ano}-${String(mesIdx).padStart(2, '0')}-01`
          lancamentos.push({
            kr_titulo: item.descricao,
            mes, mesIdx, valor,
            data_lancamento: data,
            status: 'pendente',
            tipo: 'SV',
            objetivo: item.objetivo,
            unidade: item.unidade,
            responsavel: item.responsavel,
            meta: item.meta,
          })
        })
      }
    })
    setPreview(lancamentos)
    setEtapa('preview')
  }

  async function handleImportar() {
    if (!empresa) return
    setEtapa('importando')
    setProgresso(0)
    setLogImport([])

    const supabase = createClient()
    const errosImport: string[] = []
    const log: string[] = []

    // 1. Criar Sinais Vitais novos agrupados por descrição
    const svItens = itensPlanilha.filter(i => i.tipo === 'SV' && i.lancamentos.length > 0)
    const svIdMap: Record<string, string> = {} // descricao -> sv_id

    for (const sv of svItens) {
      try {
        // Busca objetivo_id pelo título
        const { data: objData } = await supabase
          .from('objetivos')
          .select('id')
          .eq('client_id', empresa.id)
          .ilike('titulo', `%${sv.objetivo.slice(0, 20)}%`)
          .limit(1)

        const objetivoId = objData?.[0]?.id ?? null

        // Verifica se já existe
        const { data: existente } = await supabase
          .from('sinais_vitais')
          .select('id')
          .eq('client_id', empresa.id)
          .ilike('titulo', sv.descricao)
          .limit(1)

        let svId: string
        if (existente && existente.length > 0) {
          svId = existente[0].id
          log.push(`✓ SV existente: ${sv.descricao}`)
        } else {
          const { data: novoSv, error } = await supabase
            .from('sinais_vitais')
            .insert({
              client_id: empresa.id,
              titulo: sv.descricao,
              valor_inicial: 0,
              valor_atual: 0,
              meta: sv.meta ?? 0,
              tipo_valor: sv.unidade || '%',
              objetivo_id: objetivoId,
            })
            .select('id')
            .single()

          if (error || !novoSv) {
            errosImport.push(`Erro ao criar SV: ${sv.descricao}`)
            continue
          }
          svId = novoSv.id
          log.push(`✅ SV criado: ${sv.descricao}`)
        }
        svIdMap[sv.descricao] = svId
      } catch {
        errosImport.push(`Erro ao processar SV: ${sv.descricao}`)
      }
    }

    // 2. Importar lançamentos de KRs
    const krLancamentos = preview.filter(l => l.tipo === 'KR')
    for (let i = 0; i < krLancamentos.length; i++) {
      const l = krLancamentos[i]
      if (!l.kr_id) continue
      try {
        const { data: existente } = await supabase
          .from('kr_lancamentos')
          .select('id')
          .eq('kr_id', l.kr_id)
          .eq('data_lancamento', l.data_lancamento)
          .limit(1)

        if (existente && existente.length > 0) {
          await supabase.from('kr_lancamentos').update({ valor: l.valor }).eq('kr_id', l.kr_id).eq('data_lancamento', l.data_lancamento)
          log.push(`↺ KR atualizado: ${l.kr_titulo} — ${l.mes}/${ano}`)
        } else {
          await supabase.from('kr_lancamentos').insert({
            kr_id: l.kr_id,
            valor: l.valor,
            data_lancamento: l.data_lancamento,
            comentario: 'Importado via planilha',
          })
          log.push(`✅ KR inserido: ${l.kr_titulo} — ${l.mes}/${ano}`)
        }

        // Atualiza valor_atual com lançamento mais recente
        const { data: ultimo } = await supabase
          .from('kr_lancamentos')
          .select('valor')
          .eq('kr_id', l.kr_id)
          .order('data_lancamento', { ascending: false })
          .limit(1)
          .single()

        if (ultimo) {
          await supabase.from('krs').update({ valor_atual: ultimo.valor }).eq('id', l.kr_id)
        }

        setPreview(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'importado' } : p))
      } catch {
        errosImport.push(`Erro: ${l.kr_titulo} — ${l.mes}`)
        setPreview(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'erro' } : p))
      }
      setProgresso(Math.round(((i + 1) / (krLancamentos.length + svItens.length)) * 100))
    }

    // 3. Importar lançamentos de Sinais Vitais
    const svLancamentos = preview.filter(l => l.tipo === 'SV')
    for (let i = 0; i < svLancamentos.length; i++) {
      const l = svLancamentos[i]
      const svId = svIdMap[l.kr_titulo]
      if (!svId) continue
      try {
        const { data: existente } = await supabase
          .from('sinais_vitais_lancamentos')
          .select('id')
          .eq('sinal_vital_id', svId)
          .eq('data_lancamento', l.data_lancamento)
          .limit(1)

        if (existente && existente.length > 0) {
          await supabase.from('sinais_vitais_lancamentos').update({ valor: l.valor }).eq('id', existente[0].id)
        } else {
          await supabase.from('sinais_vitais_lancamentos').insert({
            sinal_vital_id: svId,
            valor: l.valor,
            data_lancamento: l.data_lancamento,
            comentario: 'Importado via planilha',
          })
        }

        // Atualiza valor_atual no sinal vital
        const { data: ultimo } = await supabase
          .from('sinais_vitais_lancamentos')
          .select('valor')
          .eq('sinal_vital_id', svId)
          .order('data_lancamento', { ascending: false })
          .limit(1)
          .single()

        if (ultimo) {
          await supabase.from('sinais_vitais').update({ valor_atual: ultimo.valor }).eq('id', svId)
        }

        log.push(`✅ SV lançamento: ${l.kr_titulo} — ${l.mes}/${ano}`)
      } catch {
        errosImport.push(`Erro SV lançamento: ${l.kr_titulo} — ${l.mes}`)
      }
      setProgresso(Math.round(((krLancamentos.length + i + 1) / (krLancamentos.length + svLancamentos.length)) * 100))
    }

    setErros(errosImport)
    setLogImport(log)
    setEtapa('concluido')
  }

  const krsItens = itensPlanilha.filter(i => i.tipo === 'KR')
  const svsItens = itensPlanilha.filter(i => i.tipo === 'SV')
  const mapeadosCount = Object.values(mapeamento).filter(Boolean).length
  const totalLancamentos = preview.length

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Lançamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe KRs e Sinais Vitais a partir de planilha Excel</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['Upload', 'Mapeamento', 'Revisão', 'Concluído'].map((step, idx) => {
          const etapas = ['upload', 'mapeamento', 'preview', 'concluido']
          const atual = etapas.indexOf(etapa)
          const isDone = idx < atual || etapa === 'concluido'
          const isAtual = idx === atual || (etapa === 'importando' && idx === 2)
          return (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${isDone ? 'bg-primary text-primary-foreground' : isAtual ? 'bg-primary/20 text-primary border border-primary' : 'bg-secondary text-muted-foreground'}`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={`text-xs font-medium ${isAtual ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
              {idx < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* ETAPA 1 — UPLOAD */}
      {etapa === 'upload' && (
        <div>
          {erros.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              {erros.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
            </div>
          )}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors
              ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/10'}`}
          >
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Arraste sua planilha aqui</p>
            <p className="text-xs text-muted-foreground mb-4">Arquivo .xlsx da planilha de OKRs</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
              <Upload className="w-4 h-4" />
              Selecionar arquivo
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
          <div className="mt-4 p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs font-semibold text-foreground mb-2">Formato esperado (CTZ):</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Col B: "OKR - Título", "KR N", "Sinal vital"</li>
              <li>• Col C: Descrição do KR ou Sinal Vital</li>
              <li>• Col F: META, PREV, REAL, REAL %, REAL h</li>
              <li>• Col G-R: Valores de Jan a Dez</li>
              <li>• Linhas ocultas e lições aprendidas são ignoradas automaticamente</li>
              <li>• Sinais Vitais são criados automaticamente no sistema</li>
            </ul>
          </div>
        </div>
      )}

      {/* ETAPA 2 — MAPEAMENTO */}
      {etapa === 'mapeamento' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">📄 {nomeArquivo}</p>
              <p className="text-xs text-muted-foreground">
                {krsItens.length} KRs · {svsItens.length} Sinais Vitais encontrados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground">Ano:</label>
              <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))}
                className="w-20 px-2 py-1 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* KRs para mapear */}
          {krsItens.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                KRs — associe cada um ao KR do sistema ({mapeadosCount}/{krsItens.length} mapeados)
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {krsItens.map((item) => (
                  <div key={item.descricao} className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">{item.identificador} · {item.objetivo}</p>
                        <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                        <p className="text-[10px] text-muted-foreground">{item.lancamentos.length} lançamento(s): {item.lancamentos.map(l => l.mes).join(', ')}</p>
                      </div>
                      <div className="shrink-0 w-56">
                        <select
                          value={mapeamento[item.descricao] ?? ''}
                          onChange={(e) => setMapeamento(prev => ({ ...prev, [item.descricao]: e.target.value }))}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— Não importar —</option>
                          {krsEmpresa.map((k: any) => (
                            <option key={k.id} value={k.id}>{k.titulo}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sinais Vitais — informativos */}
          {svsItens.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Sinais Vitais — serão criados automaticamente ({svsItens.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {svsItens.map((item) => (
                  <div key={item.descricao} className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">{item.objetivo} · {item.lancamentos.length} lançamento(s)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Auto</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEtapa('upload')} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              Voltar
            </button>
            <button
              onClick={gerarPreview}
              disabled={mapeadosCount === 0 && svsItens.filter(s => s.lancamentos.length > 0).length === 0}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Continuar ({mapeadosCount} KR{mapeadosCount !== 1 ? 's' : ''} + {svsItens.length} SVs)
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3 — PREVIEW */}
      {etapa === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-foreground">{totalLancamentos}</p>
              <p className="text-xs text-muted-foreground">Total lançamentos</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{preview.filter(p => p.tipo === 'KR').length}</p>
              <p className="text-xs text-muted-foreground">KRs</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{preview.filter(p => p.tipo === 'SV').length}</p>
              <p className="text-xs text-muted-foreground">Sinais Vitais</p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {Array.from(new Set(preview.map(p => p.kr_titulo))).map(titulo => {
              const grupo = preview.filter(p => p.kr_titulo === titulo)
              const tipo = grupo[0].tipo
              return (
                <div key={titulo} className={`border rounded-xl p-3 ${tipo === 'SV' ? 'border-emerald-200 bg-emerald-50/30' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tipo === 'SV' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{tipo}</span>
                    <p className="text-xs font-semibold text-foreground truncate">{titulo}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.map((l, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg">
                        <span className="text-[10px] font-medium text-muted-foreground">{l.mes}/{String(ano).slice(2)}</span>
                        <span className="text-[10px] font-bold text-foreground">{l.valor.toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEtapa('mapeamento')} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              Voltar
            </button>
            <button onClick={handleImportar} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Importar {totalLancamentos} lançamentos
            </button>
          </div>
        </div>
      )}

      {/* ETAPA — IMPORTANDO */}
      {etapa === 'importando' && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Upload className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-medium text-foreground">Importando lançamentos...</p>
          <div className="w-full bg-secondary rounded-full h-2 max-w-xs mx-auto">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progresso}%</p>
        </div>
      )}

      {/* ETAPA 4 — CONCLUÍDO */}
      {etapa === 'concluido' && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-foreground">Importação concluída!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {preview.filter(p => p.status === 'importado').length} lançamentos importados com sucesso
            </p>
          </div>

          {erros.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-red-700">{erros.length} erro(s):</p>
              {erros.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}

          {logImport.length > 0 && (
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Log de importação ({logImport.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {logImport.map((l, i) => <p key={i} className="text-[11px] text-muted-foreground">{l}</p>)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setEtapa('upload'); setItensPlanilha([]); setPreview([]); setMapeamento({}); setErros([]); setLogImport([]); setNomeArquivo('') }}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Nova importação
            </button>
            <a href="/sinais-vitais" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:opacity-90 text-center transition-opacity">
              Ver Sinais Vitais
            </a>
            <a href="/okr" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 text-center transition-opacity">
              Ver OKRs
            </a>
          </div>
        </div>
      )}
    </div>
  )
}