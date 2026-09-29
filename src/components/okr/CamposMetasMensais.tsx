'use client'

import DicaValor from '@/components/DicaValor'
import { formatValor } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Metas mensais do KR no ano, como texto dos 12 campos ('' = sem meta).
export function metasDoAno(metasMensais: { mes: string; meta: number }[] | undefined, ano: number): string[] {
  const lista: string[] = Array(12).fill('')
  ;(metasMensais ?? []).forEach((m) => {
    const [a, mes] = m.mes.split('-').map(Number)
    if (a === ano) lista[mes - 1] = String(m.meta)
  })
  return lista
}

// Texto dos 12 campos → valores para salvarMetasMensaisKr (vazio = sem meta).
export function metasParaSalvar(metas: string[]): (number | null)[] {
  return metas.map((v) => (v.trim() === '' ? null : parseFloat(v)))
}

// Campos de meta mensal usados em Criar KR e Editar KR.
export default function CamposMetasMensais({
  ano,
  onAno,
  metas,
  onMetas,
  meta,
  apuracao,
  tipoValor,
}: {
  ano: number
  onAno: (ano: number) => void
  metas: string[]
  onMetas: (metas: string[]) => void
  meta: string
  apuracao: string
  tipoValor?: string
}) {
  // Soma: divide a meta do KR pelos 12 meses. Demais: repete a meta.
  function preencher() {
    const valor = parseFloat(meta)
    if (Number.isNaN(valor)) return
    const porMes = apuracao === 'soma' ? Math.round((valor / 12) * 100) / 100 : valor
    onMetas(Array(12).fill(String(porMes)))
  }

  const valores = metas.map((v) => parseFloat(v)).filter((v) => !Number.isNaN(v))
  const total = valores.reduce((a, v) => a + v, 0)
  const metaKr = parseFloat(meta)
  const somaDiferente = apuracao === 'soma' && valores.length > 0 && !Number.isNaN(metaKr) && Math.abs(total - metaKr) > 0.005

  return (
    <div className="pt-1 border-t border-border">
      <div className="flex items-center justify-between gap-2 pt-3">
        <label className="text-xs font-medium text-foreground">Metas mensais (opcional)</label>
        <div className="flex items-center gap-1 text-xs">
          <button type="button" onClick={() => onAno(ano - 1)} className="p-1 rounded-md hover:bg-accent text-muted-foreground" aria-label="Ano anterior">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold tabular-nums">{ano}</span>
          <button type="button" onClick={() => onAno(ano + 1)} className="p-1 rounded-md hover:bg-accent text-muted-foreground" aria-label="Próximo ano">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Meta de cada mês, usada no gráfico do card. Mês em branco fica sem meta.{' '}
        <button type="button" onClick={preencher} className="text-primary hover:underline">
          {apuracao === 'soma' ? 'Dividir a meta pelos 12 meses' : 'Repetir a meta em todos os meses'}
        </button>
      </p>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {MESES_CURTOS.map((mes, i) => (
          <div key={mes}>
            <label className="text-[10px] text-muted-foreground">{mes}</label>
            <input
              type="number"
              step="any"
              value={metas[i]}
              onChange={(e) => onMetas(metas.map((v, j) => (j === i ? e.target.value : v)))}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>
      {apuracao === 'soma' && valores.length > 0 && (
        <p className={somaDiferente ? 'mt-1.5 text-[11px] text-amber-600' : 'mt-1.5 text-[11px] text-muted-foreground'}>
          Soma das metas do ano: <span className="font-semibold">{formatValor(total, tipoValor)}</span>
          {somaDiferente && <> — diferente da meta do KR ({formatValor(metaKr, tipoValor)})</>}
        </p>
      )}
      <DicaValor valor={metas.find((v) => v !== '') ?? ''} tipoValor={tipoValor} />
    </div>
  )
}
