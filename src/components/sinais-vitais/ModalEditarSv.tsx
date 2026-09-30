'use client'

import DicaValor from '@/components/DicaValor'
import { useState, useEffect } from 'react'
import { updateSinalVital } from '@/lib/queries/sinais-vitais'
import { getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import CamposVinculoSv from '@/components/sinais-vitais/CamposVinculoSv'

interface ModalEditarSvProps {
  open: boolean
  sv: any | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalEditarSv({ open, sv, onClose, onSuccess }: ModalEditarSvProps) {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])

  const [form, setForm] = useState({
    titulo: '',
    responsavel_id: '',
    setor_id: '',
    valor_inicial: '0',
    meta: '',
    tipo_valor: '',
    objetivo_id: '',
    kr_id: '',
  })

  useEffect(() => {
    if (!open || !empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
  }, [open, empresa])

  useEffect(() => {
    if (!sv) return
    setForm({
      titulo: sv.titulo ?? '',
      responsavel_id: sv.responsavel_id ?? '',
      setor_id: sv.setor_id ?? '',
      valor_inicial: String(sv.valor_inicial ?? 0),
      meta: String(sv.meta ?? ''),
      tipo_valor: sv.tipo_valor ?? '',
      objetivo_id: sv.objetivo_id ?? '',
      kr_id: sv.kr_id ?? '',
    })
  }, [sv])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sv) return
    setLoading(true)
    setError(null)

    const { error } = await updateSinalVital(sv.id, {
      titulo: form.titulo,
      // Pente fino (A8): null apaga de verdade (undefined era ignorado).
      responsavel_id: form.responsavel_id || null,
      setor_id: form.setor_id || null,
      objetivo_id: form.objetivo_id || null,
      kr_id: form.kr_id || null,
      valor_inicial: parseFloat(form.valor_inicial) || 0,
      meta: parseFloat(form.meta) || 0,
      tipo_valor: form.tipo_valor || undefined,
    })

    if (error) {
      setError('Erro ao atualizar sinal vital. Tente novamente.')
      setLoading(false)
      return
    }

    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !sv) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Editar Sinal Vital</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Título</label>
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
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nenhum</option>
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
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <CamposVinculoSv
            open={open}
            clientId={empresa?.id}
            objetivoId={form.objetivo_id}
            krId={form.kr_id}
            onChange={(v) => setForm({ ...form, ...v })}
          />

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