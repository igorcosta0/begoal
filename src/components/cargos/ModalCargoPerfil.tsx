'use client'

import { useEffect, useState } from 'react'
import { createCargoPerfil, updateCargoPerfil, type CargoPerfil, type CargoPerfilCompleto } from '@/lib/queries/cargosPerfil'

const NIVEIS = ['', 'Júnior', 'Pleno', 'Sênior']

const FORM_INICIAL: CargoPerfil = {
  area: '',
  cargo_base: '',
  nivel: '',
  sumario: '',
  responsabilidades: '',
  autonomia: '',
  experiencia: '',
  formacao: '',
  competencias_tecnicas: '',
  competencias_comportamentais: '',
}

interface Props {
  open: boolean
  clientId: string
  cargo: CargoPerfilCompleto | null // null = criar novo
  areasExistentes: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function ModalCargoPerfil({ open, clientId, cargo, areasExistentes, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<CargoPerfil>(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setForm(
      cargo
        ? {
            area: cargo.area,
            cargo_base: cargo.cargo_base,
            nivel: cargo.nivel ?? '',
            sumario: cargo.sumario,
            responsabilidades: cargo.responsabilidades,
            autonomia: cargo.autonomia ?? '',
            experiencia: cargo.experiencia ?? '',
            formacao: cargo.formacao ?? '',
            competencias_tecnicas: cargo.competencias_tecnicas ?? '',
            competencias_comportamentais: cargo.competencias_comportamentais ?? '',
          }
        : FORM_INICIAL
    )
  }, [open, cargo])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    const campos: CargoPerfil = {
      ...form,
      nivel: form.nivel || null,
      autonomia: form.autonomia || null,
      experiencia: form.experiencia || null,
      formacao: form.formacao || null,
      competencias_tecnicas: form.competencias_tecnicas || null,
      competencias_comportamentais: form.competencias_comportamentais || null,
    }
    const { error } = cargo
      ? await updateCargoPerfil(cargo.id, campos)
      : await createCargoPerfil(clientId, campos)
    setSalvando(false)
    if (error) {
      setErro(error.includes('duplicate') || error.includes('unique')
        ? 'Já existe um cargo com essa área, cargo e nível.'
        : error)
      return
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {cargo ? 'Editar cargo' : 'Adicionar cargo'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Área *</label>
              <input
                type="text"
                list="areas-existentes"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                required
                placeholder="Ex: Comercial"
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <datalist id="areas-existentes">
                {areasExistentes.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nível</label>
              <select
                value={form.nivel ?? ''}
                onChange={(e) => setForm({ ...form, nivel: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {NIVEIS.map((n) => <option key={n} value={n}>{n || 'Sem nível'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Cargo *</label>
            <input
              type="text"
              value={form.cargo_base}
              onChange={(e) => setForm({ ...form, cargo_base: e.target.value })}
              required
              placeholder="Ex: Analista Comercial"
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Sumário *</label>
            <textarea
              value={form.sumario}
              onChange={(e) => setForm({ ...form, sumario: e.target.value })}
              required
              rows={2}
              placeholder="Resumo de 1-2 frases do que o cargo faz..."
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Responsabilidades *</label>
            <textarea
              value={form.responsabilidades}
              onChange={(e) => setForm({ ...form, responsabilidades: e.target.value })}
              required
              rows={4}
              placeholder={'Uma por linha, começando com "• " pra virar lista de marcadores'}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Autonomia</label>
              <input
                type="text"
                value={form.autonomia ?? ''}
                onChange={(e) => setForm({ ...form, autonomia: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Experiência</label>
              <input
                type="text"
                value={form.experiencia ?? ''}
                onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Formação</label>
              <input
                type="text"
                value={form.formacao ?? ''}
                onChange={(e) => setForm({ ...form, formacao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Competências técnicas</label>
              <textarea
                value={form.competencias_tecnicas ?? ''}
                onChange={(e) => setForm({ ...form, competencias_tecnicas: e.target.value })}
                rows={3}
                placeholder={'Uma por linha (ex: "Excel avançado")'}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Competências comportamentais</label>
              <textarea
                value={form.competencias_comportamentais ?? ''}
                onChange={(e) => setForm({ ...form, competencias_comportamentais: e.target.value })}
                rows={3}
                placeholder={'Uma por linha (ex: "Organização")'}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>
          </div>

          {erro && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{erro}</p>
          )}

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
              disabled={salvando}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
