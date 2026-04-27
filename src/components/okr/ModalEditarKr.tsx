'use client'

import { useState, useEffect } from 'react'
import { updateKr, getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
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

  const [form, setForm] = useState({
    titulo: '',
    responsavel_id: '',
    setor_id: '',
    valor_inicial: '0',
    valor_meta: '',
    unidade: '',
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
      valor_meta: String(kr.valor_meta ?? ''),
      unidade: kr.unidade ?? '',
    })
  }, [kr])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kr) return
    setLoading(true)
    setError(null)

    const { error } = await updateKr(kr.id, {
      titulo: form.titulo,
      responsavel_id: form.responsavel_id,
      setor_id: form.setor_id,
      valor_inicial: parseFloat(form.valor_inicial) || 0,
      valor_meta: parseFloat(form.valor_meta) || 0,
      unidade: form.unidade,
    })

    if (error) {
      setError('Erro ao atualizar KR. Tente novamente.')
      setLoading(false)
      return
    }

    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
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
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Responsável</label>
              <select
                value={form.responsavel_id}
                onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Valor inicial</label>
              <input
                type="number"
                value={form.valor_inicial}
                onChange={(e) => setForm({ ...form, valor_inicial: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Meta</label>
              <input
                type="number"
                value={form.valor_meta}
                onChange={(e) => setForm({ ...form, valor_meta: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Unidade</label>
              <input
                type="text"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                placeholder="%, pts..."
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}