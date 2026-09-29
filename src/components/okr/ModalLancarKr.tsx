'use client'

import DicaValor from '@/components/DicaValor'
import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { dataLocalISO, formatValor } from '@/lib/utils'
import { createKrLancamentos } from '@/lib/queries/okr'
import type { MetaMensalKr, PontoSerie } from '@/lib/okrProgresso'

interface ModalLancarKrProps {
  open: boolean
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    tipo_valor?: string
    serie?: PontoSerie[]
    metas_mensais?: MetaMensalKr[]
  } | null
  onClose: () => void
  onSuccess: () => void
}

interface Linha {
  chave: number
  data: string
  valor: string
}

// Dia 01 do mês seguinte ao da data ("2026-09-15" → "2026-10-01").
function proximoMes(data: string): string {
  const [ano, mes] = data.split('-').map(Number)
  return mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`
}

let proximaChave = 1
const novaLinha = (data: string): Linha => ({ chave: proximaChave++, data, valor: '' })

// Um ou vários lançamentos de uma vez: cada linha é uma data + valor.
// "Adicionar mês" cria a linha do mês seguinte à última.
export default function ModalLancarKr({
  open,
  kr,
  onClose,
  onSuccess,
}: ModalLancarKrProps) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha(dataLocalISO())])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLinhas([novaLinha(dataLocalISO())])
      setError(null)
    }
  }, [open, kr?.id])

  const mesesComLancamento = new Set((kr?.serie ?? []).map((p) => p.data.slice(0, 7)))
  const metaDoMes = (data: string) => kr?.metas_mensais?.find((m) => m.mes.slice(0, 7) === data.slice(0, 7))?.meta

  function alterar(chave: number, campo: 'data' | 'valor', valor: string) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)))
  }

  function adicionarMes() {
    const ultima = linhas[linhas.length - 1]
    setLinhas([...linhas, novaLinha(ultima?.data ? proximoMes(ultima.data) : dataLocalISO())])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kr) return
    setError(null)

    if (linhas.some((l) => l.data === '' || l.valor.trim() === '' || Number.isNaN(parseFloat(l.valor)))) {
      setError('Preencha a data e o valor de todas as linhas, ou remova as que sobraram.')
      return
    }
    const datas = linhas.map((l) => l.data)
    if (new Set(datas).size !== datas.length) {
      setError('Há duas linhas com a mesma data.')
      return
    }

    setLoading(true)
    const { error } = await createKrLancamentos(
      kr.id,
      linhas.map((l) => ({ valor: parseFloat(l.valor), data_lancamento: l.data }))
    )
    setLoading(false)

    if (error) {
      setError(error)
      return
    }

    onSuccess()
    onClose()
  }

  if (!open || !kr) return null

  const varios = linhas.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-1">
          Lançar valor
        </h2>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
          {kr.titulo}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 bg-secondary rounded-md px-3 py-2">
          <span>
            Valor atual: <span className="font-medium text-foreground">
              {formatValor(kr.valor_atual ?? 0, kr.tipo_valor)}
            </span>
          </span>
          <span>
            Meta: <span className="font-medium text-foreground">
              {formatValor(kr.meta ?? 0, kr.tipo_valor)}
            </span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-foreground">
            <span>Data</span>
            <span>Valor {kr.tipo_valor ? `(${kr.tipo_valor})` : ''}</span>
            <span className="w-7" />
          </div>

          <div className="space-y-2 -mt-1">
            {linhas.map((l) => {
              const metaMes = l.data ? metaDoMes(l.data) : undefined
              const jaTem = l.data && mesesComLancamento.has(l.data.slice(0, 7))
              return (
                <div key={l.chave}>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="date"
                      value={l.data}
                      onChange={(e) => alterar(l.chave, 'data', e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      step="any"
                      value={l.valor}
                      onChange={(e) => alterar(l.chave, 'valor', e.target.value)}
                      required
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {varios ? (
                      <button
                        type="button"
                        onClick={() => setLinhas(linhas.filter((x) => x.chave !== l.chave))}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                        aria-label="Remover linha"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-7" />
                    )}
                  </div>
                  {(metaMes !== undefined || jaTem) && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {metaMes !== undefined && <>Meta do mês: <span className="font-medium text-foreground">{formatValor(metaMes, kr.tipo_valor)}</span></>}
                      {metaMes !== undefined && jaTem && ' · '}
                      {jaTem && <span className="text-amber-600">este mês já tem lançamento</span>}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={adicionarMes}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar mês
          </button>

          <DicaValor valor={linhas.find((l) => l.valor !== '')?.valor ?? ''} tipoValor={kr.tipo_valor} />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Lançando...' : varios ? `Lançar ${linhas.length} valores` : 'Lançar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
