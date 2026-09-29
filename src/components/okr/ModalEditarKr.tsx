'use client'

import DicaValor from '@/components/DicaValor'
import { useState, useEffect } from 'react'
import { updateKr, salvarMetasMensaisKr, getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import { formatValor } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Metas mensais do KR no ano, como texto dos 12 campos ('' = sem meta).
function metasDoAno(kr: any, ano: number): string[] {
  const lista: string[] = Array(12).fill('')
  ;(kr?.metas_mensais ?? []).forEach((m: { mes: string; meta: number }) => {
    const [a, mes] = m.mes.split('-').map(Number)
    if (a === ano) lista[mes - 1] = String(m.meta)
  })
  return lista
}
import { useEmpresaStore } from '@/store/useEmpresaStore'

interface ModalEditarKrProps {
  open: boolean
  kr: any | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalEditarKr({
  open,
  kr,
  onClose,
  onSuccess,
}: ModalEditarKrProps) {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [anoMetas, setAnoMetas] = useState(new Date().getFullYear())
  const [metasMensais, setMetasMensais] = useState<string[]>(Array(12).fill(''))
  const [metasAlteradas, setMetasAlteradas] = useState(false)

  const [form, setForm] = useState({
    titulo: '',
    responsavel_id: '',
    setor_id: '',
    valor_inicial: '0',
    meta: '',
    tipo_valor: '',
    direcao: 'maior',
    apuracao: 'ultimo',
  })

  useEffect(() => {
    if (!open || !empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
  }, [open, empresa])

  useEffect(() => {
    if (!kr) return
    setForm({
      titulo: kr.titulo ?? '',
      responsavel_id: kr.responsavel_id ?? kr.responsavel?.id ?? '',
      setor_id: kr.setor_id ?? kr.setor?.id ?? '',
      valor_inicial: String(kr.valor_inicial ?? 0),
      meta: String(kr.meta ?? ''),
      tipo_valor: kr.tipo_valor ?? '',
      direcao: kr.direcao ?? 'maior',
      apuracao: kr.apuracao ?? 'ultimo',
    })
    setMetasMensais(metasDoAno(kr, anoMetas))
    setMetasAlteradas(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kr])

  function trocarAnoMetas(ano: number) {
    setAnoMetas(ano)
    setMetasMensais(metasDoAno(kr, ano))
    setMetasAlteradas(false)
  }

  function alterarMetaMes(i: number, valor: string) {
    setMetasMensais((atual) => atual.map((v, j) => (j === i ? valor : v)))
    setMetasAlteradas(true)
  }

  // Soma: divide a meta do KR pelos 12 meses. Demais: repete a meta.
  function preencherMetas() {
    const meta = parseFloat(form.meta)
    if (Number.isNaN(meta)) return
    const porMes = form.apuracao === 'soma' ? Math.round((meta / 12) * 100) / 100 : meta
    setMetasMensais(Array(12).fill(String(porMes)))
    setMetasAlteradas(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kr) return
    setLoading(true)
    setError(null)

    const { error } = await updateKr(kr.id, {
      titulo: form.titulo,
      // Pente fino (A8): undefined faz o Supabase ignorar o campo — limpar
      // setor/responsável nunca era salvo. null apaga de verdade.
      responsavel_id: form.responsavel_id || null,
      setor_id: form.setor_id || null,
      valor_inicial: parseFloat(form.valor_inicial) || 0,
      meta: parseFloat(form.meta) || 0,
      tipo_valor: form.tipo_valor || undefined,
      direcao: form.direcao,
      apuracao: form.apuracao,
    })

    if (error) {
      setError('Erro ao atualizar KR. Tente novamente.')
      setLoading(false)
      return
    }

    if (metasAlteradas) {
      const { error: erroMetas } = await salvarMetasMensaisKr(
        kr.id,
        anoMetas,
        metasMensais.map((v) => (v.trim() === '' ? null : parseFloat(v)))
      )
      if (erroMetas) {
        setError(`KR salvo, mas as metas mensais não: ${erroMetas}`)
        setLoading(false)
        return
      }
    }

    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">
          Editar Key Result
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Título do KR</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Responsável</label>
              <select
                value={form.responsavel_id}
                onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>{f.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Setor</label>
              <select
                value={form.setor_id}
                onChange={(e) => setForm({ ...form, setor_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nenhum</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name ?? s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Valor inicial</label>
              <input
                type="number"
                step="any"
                value={form.valor_inicial}
                onChange={(e) => setForm({ ...form, valor_inicial: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <DicaValor valor={form.valor_inicial} tipoValor={form.tipo_valor} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Meta</label>
              <input
                type="number"
                step="any"
                value={form.meta}
                onChange={(e) => setForm({ ...form, meta: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <DicaValor valor={form.meta} tipoValor={form.tipo_valor} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Tipo</label>
              <select
                value={form.tipo_valor}
                onChange={(e) => setForm({ ...form, tipo_valor: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                <option value="Numero">Número</option>
                <option value="Percentual">Percentual</option>
                <option value="Moeda">Moeda</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Direção</label>
              <select
                value={form.direcao}
                onChange={(e) => setForm({ ...form, direcao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="maior">Quanto maior, melhor</option>
                <option value="menor">Quanto menor, melhor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Apuração</label>
              <select
                value={form.apuracao}
                onChange={(e) => setForm({ ...form, apuracao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ultimo">Último lançamento</option>
                <option value="soma">Soma dos lançamentos</option>
                <option value="media">Média dos lançamentos</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Soma: a meta é o total do período (ex.: faturamento do ano). Último: cada lançamento é comparado à meta.
          </p>

          <div className="pt-1 border-t border-border">
            <div className="flex items-center justify-between gap-2 pt-3">
              <label className="text-xs font-medium text-foreground">Metas mensais (opcional)</label>
              <div className="flex items-center gap-1 text-xs">
                <button type="button" onClick={() => trocarAnoMetas(anoMetas - 1)} className="p-1 rounded-md hover:bg-accent text-muted-foreground" aria-label="Ano anterior">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-semibold tabular-nums">{anoMetas}</span>
                <button type="button" onClick={() => trocarAnoMetas(anoMetas + 1)} className="p-1 rounded-md hover:bg-accent text-muted-foreground" aria-label="Próximo ano">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Meta de cada mês, usada no gráfico do card. Mês em branco fica sem meta.{' '}
              <button type="button" onClick={preencherMetas} className="text-primary hover:underline">
                {form.apuracao === 'soma' ? 'Dividir a meta pelos 12 meses' : 'Repetir a meta em todos os meses'}
              </button>
            </p>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MESES_CURTOS.map((mes, i) => (
                <div key={mes}>
                  <label className="text-[10px] text-muted-foreground">{mes}</label>
                  <input
                    type="number"
                    step="any"
                    value={metasMensais[i]}
                    onChange={(e) => alterarMetaMes(i, e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
            {(() => {
              const valores = metasMensais.map((v) => parseFloat(v)).filter((v) => !Number.isNaN(v))
              if (form.apuracao !== 'soma' || valores.length === 0) return null
              const total = valores.reduce((a, v) => a + v, 0)
              const meta = parseFloat(form.meta)
              const diferente = !Number.isNaN(meta) && Math.abs(total - meta) > 0.005
              return (
                <p className={diferente ? 'mt-1.5 text-[11px] text-amber-600' : 'mt-1.5 text-[11px] text-muted-foreground'}>
                  Soma das metas do ano: <span className="font-semibold">{formatValor(total, form.tipo_valor)}</span>
                  {diferente && <> — diferente da meta do KR ({formatValor(meta, form.tipo_valor)})</>}
                </p>
              )
            })()}
            <DicaValor valor={metasMensais.find((v) => v !== '') ?? ''} tipoValor={form.tipo_valor} />
          </div>

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
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}