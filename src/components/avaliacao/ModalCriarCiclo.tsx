'use client'

import { useEffect, useState } from 'react'
import { createCicloAvaliacao, updateCiclo } from '@/lib/queries/avaliacao'

interface CicloEditavel {
  id: string
  nome: string
  periodo: 1 | 2
  ano: number
}

interface Props {
  open: boolean
  clientId: string
  /** Presente = modo edição (altera nome/período/ano de um ciclo já criado); ausente = criar novo. */
  ciclo?: CicloEditavel | null
  onClose: () => void
  onSave: () => void
}

const ANO_ATUAL = new Date().getFullYear()

export default function ModalCriarCiclo({ open, clientId, ciclo, onClose, onSave }: Props) {
  const editando = !!ciclo
  const [nome, setNome] = useState('')
  const [periodo, setPeriodo] = useState<1 | 2>(1)
  const [ano, setAno] = useState(ANO_ATUAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setNome(ciclo?.nome ?? '')
    setPeriodo(ciclo?.periodo ?? 1)
    setAno(ciclo?.ano ?? ANO_ATUAL)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ciclo?.id])

  if (!open) return null

  function handleClose() {
    setError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const nomeGerado = nome.trim() || `${periodo}º Semestre ${ano}`
    const { error: err } = editando && ciclo
      ? await updateCiclo(ciclo.id, { nome: nomeGerado, periodo, ano })
      : await createCicloAvaliacao({ client_id: clientId, nome: nomeGerado, periodo, ano })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    handleClose()
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {editando ? 'Editar Ciclo de Avaliação' : 'Novo Ciclo de Avaliação'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Período *</label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(Number(e.target.value) as 1 | 2)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Ano *</label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                min={2020}
                max={2100}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Nome do ciclo <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={`${periodo}º Semestre ${ano}`}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Ciclo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
