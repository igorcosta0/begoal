'use client'

import { useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getKrsByEmpresa } from '@/lib/queries/okr'
import { Upload, CheckCircle2, AlertCircle, X, FileSpreadsheet, ArrowRight } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_INDICES: Record<string, number> = {
  'Jan': 1, 'Fev': 2, 'Mar': 3, 'Abr': 4, 'Mai': 5, 'Jun': 6,
  'Jul': 7, 'Ago': 8, 'Set': 9, 'Out': 10, 'Nov': 11, 'Dez': 12
}

interface LancamentoPreview {
  kr_id: string
  kr_titulo: string
  mes: string
  ano: number
  valor: number
  data_lancamento: string
  status: 'pendente' | 'importado' | 'erro'
}

interface KrPlanilha {
  identificador: string
  descricao: string
  lancamentos: { mes: string; valor: number }[]
}

function parseOKRSheet(data: any[][]): KrPlanilha[] {
  const resultado: KrPlanilha[] = []

  // Encontrar linha de cabeçalho com os meses
  let headerRow = -1
  let mesIndices: Record<string, number> = {}

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i]
    const mesesEncontrados = MESES.filter(m =>
      row.some(cell => typeof cell === 'string' && cell.toString().trim().toLowerCase().startsWith(m.toLowerCase()))
    )
    if (mesesEncontrados.length >= 6) {
      headerRow = i
      row.forEach((cell, idx) => {
        const mes = MESES.find(m => typeof cell === 'string' && cell.toString().trim().toLowerCase().startsWith(m.toLowerCase()))
        if (mes) mesIndices[mes] = idx
      })
      break
    }
  }

  if (headerRow === -1) return resultado

  let krAtual: KrPlanilha | null = null

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i]
    const col1 = row[1]?.toString().trim() ?? ''
    const col2 = row[2]?.toString().trim() ?? ''
    const col5 = row[5]?.toString().trim() ?? ''

    // Detecta novo KR — coluna B tem "KR X" ou "Sinal vital"
    const isKr = /^KR\s*\d+/i.test(col1) || col1 === 'Sinal vital' || col1 === 'Sinal Vital'

    if (isKr && col2) {
      krAtual = {
        identificador: col1,
        descricao: col2.replace(/\n/g, ' ').trim(),
        lancamentos: [],
      }
      resultado.push(krAtual)
    }

    // Linha REAL com valores mensais
    if (krAtual && (col5.toUpperCase() === 'REAL' || col5.toUpperCase() === 'REAL %')) {
      MESES.forEach((mes) => {
        const idx = mesIndices[mes]
        if (idx !== undefined) {
          const val = row[idx]
          if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) && Number(val) !== 0) {
            krAtual!.lancamentos.push({ mes, valor: Number(val) })
          }
        }
      })
    }
  }

  return resultado.filter(kr => kr.lancamentos.length > 0)
}

export default function ImportarLancamentosPage() {
  const { empresa } = useEmpresaStore()
  const [etapa, setEtapa] = useState<'upload' | 'mapeamento' | 'preview' | 'importando' | 'concluido'>('upload')
  const [krsPlanha, setKrsPlanilha] = useState<KrPlanilha[]>([])
  const [krsEmpresa, setKrsEmpresa] = useState<any[]>([])
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({}) // descricao -> kr_id
  const [ano, setAno] = useState(new Date().getFullYear())
  const [preview, setPreview] = useState<LancamentoPreview[]>([])
  const [progresso, setProgresso] = useState(0)
  const [erros, setErros] = useState<string[]>([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [dragging, setDragging] = useState(false)

  const processarArquivo = useCallback(async (file: File) => {
    if (!empresa) return
    setNomeArquivo(file.name)

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })

    // Procura aba com OKR
    const abaOkr = wb.SheetNames.find(n =>
      n.toLowerCase().includes('okr') || n.toLowerCase().includes('operação') || n.toLowerCase().includes('operacao')
    ) ?? wb.SheetNames[0]

    const ws = wb.Sheets[abaOkr]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

    const krs = parseOKRSheet(data)

    if (krs.length === 0) {
      setErros(['Nenhum KR encontrado na planilha. Verifique se a aba contém linhas com "KR" e valores "REAL".'])
      return
    }

    setKrsPlanilha(krs)

    // Buscar KRs da empresa
    const { data: krsData } = await getKrsByEmpresa(empresa.id)
    setKrsEmpresa(krsData ?? [])

    // Auto-mapeamento por similaridade de texto
    const mapAuto: Record<string, string> = {}
    krs.forEach(kr => {
      const match = (krsData ?? []).find((k: any) =>
        k.titulo.toLowerCase().includes(kr.descricao.toLowerCase().slice(0, 20)) ||
        kr.descricao.toLowerCase().includes(k.titulo.toLowerCase().slice(0, 20))
      )
      if (match) mapAuto[kr.descricao] = match.id
    })
    setMapeamento(mapAuto)
    setEtapa('mapeamento')
  }, [empresa])

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

  function gerarPreview() {
    const lancamentos: LancamentoPreview[] = []
    krsPlanha.forEach(kr => {
      const krId = mapeamento[kr.descricao]
      if (!krId) return
      const krEmpresa = krsEmpresa.find(k => k.id === krId)
      kr.lancamentos.forEach(({ mes, valor }) => {
        const mesNum = MESES_INDICES[mes]
        const data = `${ano}-${String(mesNum).padStart(2, '0')}-01`
        lancamentos.push({
          kr_id: krId,
          kr_titulo: krEmpresa?.titulo ?? kr.descricao,
          mes,
          ano,
          valor,
          data_lancamento: data,
          status: 'pendente',
        })
      })
    })
    setPreview(lancamentos)
    setEtapa('preview')
  }

  async function handleImportar() {
    if (!empresa) return
    setEtapa('importando')
    setProgresso(0)

    const supabase = createClient()
    const errosImport: string[] = []
    let importados = 0

    for (let i = 0; i < preview.length; i++) {
      const l = preview[i]
      try {
        // Verifica se já existe lançamento nessa data
        const { data: existente } = await supabase
          .from('kr_lancamentos')
          .select('id')
          .eq('kr_id', l.kr_id)
          .eq('data_lancamento', l.data_lancamento)
          .limit(1)

        if (existente && existente.length > 0) {
          // Atualiza existente
          await supabase
            .from('kr_lancamentos')
            .update({ valor: l.valor })
            .eq('kr_id', l.kr_id)
            .eq('data_lancamento', l.data_lancamento)
        } else {
          // Insere novo
          await supabase.from('kr_lancamentos').insert({
            kr_id: l.kr_id,
            valor: l.valor,
            data_lancamento: l.data_lancamento,
            comentario: `Importado via planilha`,
          })
        }

        // Atualiza valor_atual com o lançamento mais recente
        const { data: ultimoLanc } = await supabase
          .from('kr_lancamentos')
          .select('valor')
          .eq('kr_id', l.kr_id)
          .order('data_lancamento', { ascending: false })
          .limit(1)
          .single()

        if (ultimoLanc) {
          await supabase.from('krs').update({ valor_atual: ultimoLanc.valor }).eq('id', l.kr_id)
        }

        importados++
        setPreview(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'importado' } : p))
      } catch (err) {
        errosImport.push(`Erro ao importar ${l.kr_titulo} - ${l.mes}/${l.ano}`)
        setPreview(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'erro' } : p))
      }

      setProgresso(Math.round(((i + 1) / preview.length) * 100))
    }

    setErros(errosImport)
    setEtapa('concluido')
  }

  const mapeadosCount = Object.values(mapeamento).filter(Boolean).length

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Lançamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe valores de KRs a partir de uma planilha Excel</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['Upload', 'Mapeamento', 'Revisão', 'Concluído'].map((step, idx) => {
          const etapas = ['upload', 'mapeamento', 'preview', 'concluido']
          const atual = etapas.indexOf(etapa)
          const isAtual = idx === atual || (etapa === 'importando' && idx === 2)
          const isDone = idx < atual || (etapa === 'concluido' && idx <= 3)
          return (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? 'bg-primary text-primary-foreground' : isAtual ? 'bg-primary/20 text-primary border border-primary' : 'bg-secondary text-muted-foreground'}`}>
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
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/10'}`}
          >
            <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Arraste sua planilha aqui</p>
            <p className="text-xs text-muted-foreground mb-4">ou clique para selecionar um arquivo .xlsx</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
              <Upload className="w-4 h-4" />
              Selecionar arquivo
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            </label>
          </div>
          <div className="mt-4 p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs font-semibold text-foreground mb-2">Formato esperado:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Aba com "OKR" no nome (ex: "OKR - OPERAÇÃO")</li>
              <li>• Coluna B: identificador do KR (ex: "KR 2", "Sinal vital")</li>
              <li>• Coluna C: descrição do KR</li>
              <li>• Coluna F: tipo de lançamento (META, PREV, REAL)</li>
              <li>• Colunas Jan-Dez: valores mensais</li>
              <li>• Apenas linhas com "REAL" serão importadas</li>
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
              <p className="text-xs text-muted-foreground">{krsPlanha.length} KRs encontrados · {mapeadosCount} mapeados</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mr-2">Ano dos lançamentos:</label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-20 px-2 py-1 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {krsPlanha.map((kr) => (
              <div key={kr.descricao} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kr.identificador}</p>
                    <p className="text-sm font-medium text-foreground truncate">{kr.descricao}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{kr.lancamentos.length} lançamento{kr.lancamentos.length !== 1 ? 's' : ''}: {kr.lancamentos.map(l => l.mes).join(', ')}</p>
                  </div>
                  <div className="shrink-0 w-52">
                    <select
                      value={mapeamento[kr.descricao] ?? ''}
                      onChange={(e) => setMapeamento(prev => ({ ...prev, [kr.descricao]: e.target.value }))}
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

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEtapa('upload')} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              Voltar
            </button>
            <button
              onClick={gerarPreview}
              disabled={mapeadosCount === 0}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Continuar ({mapeadosCount} KR{mapeadosCount !== 1 ? 's' : ''} mapeados)
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3 — PREVIEW */}
      {etapa === 'preview' && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{preview.length} lançamentos para importar</p>
            <p className="text-xs text-muted-foreground">Ano: {ano}</p>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {/* Agrupa por KR */}
            {Array.from(new Set(preview.map(p => p.kr_id))).map(krId => {
              const lsPorKr = preview.filter(p => p.kr_id === krId)
              return (
                <div key={krId} className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold text-foreground mb-2 truncate">{lsPorKr[0].kr_titulo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lsPorKr.map((l, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg">
                        <span className="text-[10px] font-medium text-muted-foreground">{l.mes}/{String(l.ano).slice(2)}</span>
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
            <button
              onClick={handleImportar}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Importar {preview.length} lançamentos
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
          <div className="text-center py-8">
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
              <p className="text-xs font-semibold text-red-700">{erros.length} erro{erros.length !== 1 ? 's' : ''}:</p>
              {erros.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setEtapa('upload'); setKrsPlanilha([]); setPreview([]); setMapeamento({}); setErros([]); setNomeArquivo('') }}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Nova importação
            </button>
            <a href="/okr" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity text-center">
              Ver OKRs
            </a>
          </div>
        </div>
      )}
    </div>
  )
}