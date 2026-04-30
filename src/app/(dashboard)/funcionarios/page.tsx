'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getSetoresByEmpresa } from '@/lib/queries/okr'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { User, Building2, Briefcase, MoreHorizontal } from 'lucide-react'

const STATUS_OPTIONS = ['Ativo', 'Férias', 'Afastado', 'Desligado']
const PROFILE_OPTIONS = [
  'N/A', 'Comunicador', 'Planejador', 'Analista', 'Executor',
  'Comunicador/Planejador', 'Comunicador/Analista', 'Comunicador/Executor',
  'Planejador/Analista', 'Planejador/Executor', 'Analista/Executor',
  'Comunicador/Planejador/Analista', 'Comunicador/Planejador/Executor',
  'Comunicador/Analista/Executor', 'Planejador/Analista/Executor',
  'Comunicador/Planejador/Analista/Executor',
]

interface FormFuncionario {
  full_name: string
  email: string
  cargo: string
  setor_id: string
  gestor_id: string
  status: string
  profile: string
  data_admissao: string
}

interface ModalFuncionarioProps {
  open: boolean
  titulo: string
  form: FormFuncionario
  setForm: (form: FormFuncionario) => void
  setores: any[]
  funcionarios: any[]
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

function ModalFuncionario({
  open,
  titulo,
  form,
  setForm,
  setores,
  funcionarios,
  onSubmit,
  onCancel,
}: ModalFuncionarioProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">{titulo}</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Nome completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Cargo</label>
              <input
                type="text"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Setor</label>
              <select
                value={form.setor_id}
                onChange={(e) => setForm({ ...form, setor_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nenhum</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Data admissão</label>
              <input
                type="date"
                value={form.data_admissao}
                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Perfil comportamental</label>
            <select
              value={form.profile}
              onChange={(e) => setForm({ ...form, profile: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PROFILE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Gestor</label>
            <select
              value={form.gestor_id}
              onChange={(e) => setForm({ ...form, gestor_id: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FORM_INICIAL: FormFuncionario = {
  full_name: '', email: '', cargo: '', setor_id: '',
  gestor_id: '', status: 'Ativo', profile: 'N/A', data_admissao: '',
}

export default function FuncionariosPage() {
  const { empresa } = useEmpresaStore()

  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [busca, setBusca] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<{ open: boolean; funcionario: any | null }>({ open: false, funcionario: null })
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; funcionario: any | null; loading: boolean }>({ open: false, funcionario: null, loading: false })
  const [form, setForm] = useState<FormFuncionario>(FORM_INICIAL)

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('funcionarios')
      .select(`
        id, full_name, email, cargo, status, profile,
        data_admissao, setor_id, gestor_id, user_id, is_current,
        setores!setor_id(name)
      `)
      .eq('client_id', empresa.id)
      .order('full_name')
    setFuncionarios(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
  }, [empresa])

  useEffect(() => {
    if (!modalEditar.funcionario) return
    setForm({
      full_name: modalEditar.funcionario.full_name ?? '',
      email: modalEditar.funcionario.email ?? '',
      cargo: modalEditar.funcionario.cargo ?? '',
      setor_id: modalEditar.funcionario.setor_id ?? '',
      gestor_id: modalEditar.funcionario.gestor_id ?? '',
      status: modalEditar.funcionario.status ?? 'Ativo',
      profile: modalEditar.funcionario.profile ?? 'N/A',
      data_admissao: modalEditar.funcionario.data_admissao ?? '',
    })
  }, [modalEditar.funcionario])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    const supabase = createClient()
    await supabase.from('funcionarios').insert({
      ...form,
      email: form.email || undefined,
      cargo: form.cargo || undefined,
      setor_id: form.setor_id || undefined,
      gestor_id: form.gestor_id || undefined,
      data_admissao: form.data_admissao || undefined,
      client_id: empresa.id,
      is_current: true,
    })
    setForm(FORM_INICIAL)
    setModalCriar(false)
    fetchData()
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditar.funcionario) return
    const supabase = createClient()
    await supabase.from('funcionarios').update({
      ...form,
      email: form.email || undefined,
      cargo: form.cargo || undefined,
      setor_id: form.setor_id || undefined,
      gestor_id: form.gestor_id || undefined,
      data_admissao: form.data_admissao || undefined,
    }).eq('id', modalEditar.funcionario.id)
    setModalEditar({ open: false, funcionario: null })
    fetchData()
  }

  async function handleExcluir() {
    if (!modalExcluir.funcionario) return
    setModalExcluir((prev) => ({ ...prev, loading: true }))
    const supabase = createClient()
    await supabase.from('funcionarios').delete().eq('id', modalExcluir.funcionario.id)
    setModalExcluir({ open: false, funcionario: null, loading: false })
    fetchData()
  }

  const funcionariosFiltrados = funcionarios
    .filter((f) => !filtroStatus || f.status === filtroStatus)
    .filter((f) => !filtroSetor || f.setor_id === filtroSetor)
    .filter((f) => !busca || f.full_name.toLowerCase().includes(busca.toLowerCase()))

  const statusColor = (status: string) => {
    if (status === 'Ativo') return 'bg-green-100 text-green-700'
    if (status === 'Férias') return 'bg-blue-100 text-blue-700'
    if (status === 'Afastado') return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.company_name} — Gerencie sua equipe
          </p>
        </div>
        <button
          onClick={() => { setForm(FORM_INICIAL); setModalCriar(true) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Novo Funcionário
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar funcionário..."
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filtroSetor}
          onChange={(e) => setFiltroSetor(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : funcionariosFiltrados.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">Nenhum funcionário encontrado.</p>
          <button
            onClick={() => { setForm(FORM_INICIAL); setModalCriar(true) }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Adicionar primeiro funcionário
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {funcionariosFiltrados.map((f) => (
            <div
              key={f.id}
              className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                  {f.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.full_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {f.cargo && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {f.cargo}
                      </span>
                    )}
                    {f.setores && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {f.setores.name}
                      </span>
                    )}
                    {f.email && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {f.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(f.status)}`}>
                  {f.status}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === f.id ? null : f.id)}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen === f.id && (
                    <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
                      <button
                        onClick={() => { setModalEditar({ open: true, funcionario: f }); setMenuOpen(null) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => { setModalExcluir({ open: true, funcionario: f, loading: false }); setMenuOpen(null) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalFuncionario
        open={modalCriar}
        titulo="Novo Funcionário"
        form={form}
        setForm={setForm}
        setores={setores}
        funcionarios={funcionarios}
        onSubmit={handleCriar}
        onCancel={() => setModalCriar(false)}
      />

      <ModalFuncionario
        open={modalEditar.open}
        titulo="Editar Funcionário"
        form={form}
        setForm={setForm}
        setores={setores}
        funcionarios={funcionarios}
        onSubmit={handleEditar}
        onCancel={() => setModalEditar({ open: false, funcionario: null })}
      />

      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir Funcionário"
        descricao="Esta ação não pode ser desfeita."
        loading={modalExcluir.loading}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, funcionario: null, loading: false })}
      />
    </div>
  )
}