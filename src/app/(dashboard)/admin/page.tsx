'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { Building2, MoreHorizontal, Plus } from 'lucide-react'

interface FormEmpresa {
  company_name: string
  nome_fantasia: string
  razao_social: string
  cnpj: string
  status: string
  data_inicio: string
  data_fim: string
}

interface FormSetor {
  name: string
}

const FORM_EMPRESA_INICIAL: FormEmpresa = {
  company_name: '',
  nome_fantasia: '',
  razao_social: '',
  cnpj: '',
  status: 'Ativo',
  data_inicio: '',
  data_fim: '',
}

function ModalEmpresa({
  open,
  titulo,
  form,
  setForm,
  onSubmit,
  onCancel,
}: {
  open: boolean
  titulo: string
  form: FormEmpresa
  setForm: (f: FormEmpresa) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">{titulo}</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Nome da empresa *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Nome fantasia</label>
              <input
                type="text"
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">CNPJ</label>
              <input
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Razão social</label>
            <input
              type="text"
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Trial">Trial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Data início</label>
              <input
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Data fim</label>
              <input
                type="date"
                value={form.data_fim}
                onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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

export default function AdminPage() {
  const [empresas, setEmpresas] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [loadingSetores, setLoadingSetores] = useState(true)
  const [empresaSelecionada, setEmpresaSelecionada] = useState<any | null>(null)
  const [menuEmpresa, setMenuEmpresa] = useState<string | null>(null)
  const [menuSetor, setMenuSetor] = useState<string | null>(null)
  const [aba, setAba] = useState<'empresas' | 'setores'>('empresas')

  const [modalCriarEmpresa, setModalCriarEmpresa] = useState(false)
  const [modalEditarEmpresa, setModalEditarEmpresa] = useState<{ open: boolean; empresa: any | null }>({ open: false, empresa: null })
  const [modalExcluirEmpresa, setModalExcluirEmpresa] = useState<{ open: boolean; empresa: any | null; loading: boolean }>({ open: false, empresa: null, loading: false })
  const [modalExcluirSetor, setModalExcluirSetor] = useState<{ open: boolean; setor: any | null; loading: boolean }>({ open: false, setor: null, loading: false })
  const [modalCriarSetor, setModalCriarSetor] = useState(false)
  const [novoSetor, setNovoSetor] = useState('')
  const [editarSetor, setEditarSetor] = useState<{ open: boolean; setor: any | null; nome: string }>({ open: false, setor: null, nome: '' })

  const [formEmpresa, setFormEmpresa] = useState<FormEmpresa>(FORM_EMPRESA_INICIAL)

  const fetchEmpresas = useCallback(async () => {
    setLoadingEmpresas(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .select('id, company_name, nome_fantasia, cnpj, status, data_inicio, data_fim, logo_url')
      .order('company_name')
    setEmpresas(data ?? [])
    setLoadingEmpresas(false)
  }, [])

  const fetchSetores = useCallback(async () => {
    if (!empresaSelecionada) return
    setLoadingSetores(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('setores')
      .select('id, name, client_id')
      .eq('client_id', empresaSelecionada.id)
      .order('name')
    setSetores(data ?? [])
    setLoadingSetores(false)
  }, [empresaSelecionada])

  useEffect(() => { fetchEmpresas() }, [fetchEmpresas])
  useEffect(() => { fetchSetores() }, [fetchSetores])

  useEffect(() => {
    if (!modalEditarEmpresa.empresa) return
    const e = modalEditarEmpresa.empresa
    setFormEmpresa({
      company_name: e.company_name ?? '',
      nome_fantasia: e.nome_fantasia ?? '',
      razao_social: e.razao_social ?? '',
      cnpj: e.cnpj ?? '',
      status: e.status ?? 'Ativo',
      data_inicio: e.data_inicio ?? '',
      data_fim: e.data_fim ?? '',
    })
  }, [modalEditarEmpresa.empresa])

  async function handleCriarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('clients').insert({
      company_name: formEmpresa.company_name,
      nome_fantasia: formEmpresa.nome_fantasia || undefined,
      razao_social: formEmpresa.razao_social || undefined,
      cnpj: formEmpresa.cnpj || undefined,
      status: formEmpresa.status,
      data_inicio: formEmpresa.data_inicio || undefined,
      data_fim: formEmpresa.data_fim || undefined,
    })
    setFormEmpresa(FORM_EMPRESA_INICIAL)
    setModalCriarEmpresa(false)
    fetchEmpresas()
  }

  async function handleEditarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditarEmpresa.empresa) return
    const supabase = createClient()
    await supabase.from('clients').update({
      company_name: formEmpresa.company_name,
      nome_fantasia: formEmpresa.nome_fantasia || undefined,
      razao_social: formEmpresa.razao_social || undefined,
      cnpj: formEmpresa.cnpj || undefined,
      status: formEmpresa.status,
      data_inicio: formEmpresa.data_inicio || undefined,
      data_fim: formEmpresa.data_fim || undefined,
    }).eq('id', modalEditarEmpresa.empresa.id)
    setModalEditarEmpresa({ open: false, empresa: null })
    fetchEmpresas()
  }

  async function handleExcluirEmpresa() {
    if (!modalExcluirEmpresa.empresa) return
    setModalExcluirEmpresa((prev) => ({ ...prev, loading: true }))
    const supabase = createClient()
    await supabase.from('clients').delete().eq('id', modalExcluirEmpresa.empresa.id)
    setModalExcluirEmpresa({ open: false, empresa: null, loading: false })
    fetchEmpresas()
  }

  async function handleCriarSetor(e: React.FormEvent) {
    e.preventDefault()
    if (!empresaSelecionada || !novoSetor) return
    const supabase = createClient()
    await supabase.from('setores').insert({
      name: novoSetor,
      client_id: empresaSelecionada.id,
    })
    setNovoSetor('')
    setModalCriarSetor(false)
    fetchSetores()
  }

  async function handleEditarSetor(e: React.FormEvent) {
    e.preventDefault()
    if (!editarSetor.setor) return
    const supabase = createClient()
    await supabase.from('setores').update({ name: editarSetor.nome }).eq('id', editarSetor.setor.id)
    setEditarSetor({ open: false, setor: null, nome: '' })
    fetchSetores()
  }

  async function handleExcluirSetor() {
    if (!modalExcluirSetor.setor) return
    setModalExcluirSetor((prev) => ({ ...prev, loading: true }))
    const supabase = createClient()
    await supabase.from('setores').delete().eq('id', modalExcluirSetor.setor.id)
    setModalExcluirSetor({ open: false, setor: null, loading: false })
    fetchSetores()
  }

  const statusColor = (status: string) => {
    if (status === 'Ativo') return 'bg-green-100 text-green-700'
    if (status === 'Trial') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administração</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie empresas e setores da plataforma
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setAba('empresas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            aba === 'empresas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Empresas
        </button>
        <button
          onClick={() => setAba('setores')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            aba === 'setores'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Setores
        </button>
      </div>

      {/* Aba Empresas */}
      {aba === 'empresas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setFormEmpresa(FORM_EMPRESA_INICIAL); setModalCriarEmpresa(true) }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Empresa
            </button>
          </div>

          {loadingEmpresas ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {empresa.logo_url ? (
                      <img
                        src={empresa.logo_url}
                        alt={empresa.company_name}
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
                        {empresa.company_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{empresa.company_name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        {empresa.nome_fantasia && <span>{empresa.nome_fantasia}</span>}
                        {empresa.cnpj && <span>{empresa.cnpj}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(empresa.status)}`}>
                      {empresa.status}
                    </span>
                    <button
                      onClick={() => { setEmpresaSelecionada(empresa); setAba('setores') }}
                      className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground"
                    >
                      Setores
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuEmpresa(menuEmpresa === empresa.id ? null : empresa.id)}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuEmpresa === empresa.id && (
                        <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
                          <button
                            onClick={() => { setModalEditarEmpresa({ open: true, empresa }); setMenuEmpresa(null) }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => { setModalExcluirEmpresa({ open: true, empresa, loading: false }); setMenuEmpresa(null) }}
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
        </div>
      )}

      {/* Aba Setores */}
      {aba === 'setores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {empresaSelecionada
                  ? `Setores de ${empresaSelecionada.company_name}`
                  : 'Selecione uma empresa para ver os setores'}
              </p>
            </div>
            {empresaSelecionada && (
              <button
                onClick={() => setModalCriarSetor(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Setor
              </button>
            )}
          </div>

          {!empresaSelecionada ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Vá para a aba Empresas e clique em "Setores" para gerenciar os setores de uma empresa.
              </p>
            </div>
          ) : loadingSetores ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-secondary animate-pulse" />
              ))}
            </div>
          ) : setores.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum setor cadastrado para esta empresa.
              </p>
              <button
                onClick={() => setModalCriarSetor(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + Criar primeiro setor
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {setores.map((setor) => (
                <div
                  key={setor.id}
                  className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground">{setor.name}</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuSetor(menuSetor === setor.id ? null : setor.id)}
                      className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuSetor === setor.id && (
                      <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-10 min-w-36 py-1">
                        <button
                          onClick={() => { setEditarSetor({ open: true, setor, nome: setor.name }); setMenuSetor(null) }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { setModalExcluirSetor({ open: true, setor, loading: false }); setMenuSetor(null) }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar Empresa */}
      <ModalEmpresa
        open={modalCriarEmpresa}
        titulo="Nova Empresa"
        form={formEmpresa}
        setForm={setFormEmpresa}
        onSubmit={handleCriarEmpresa}
        onCancel={() => setModalCriarEmpresa(false)}
      />

      {/* Modal Editar Empresa */}
      <ModalEmpresa
        open={modalEditarEmpresa.open}
        titulo="Editar Empresa"
        form={formEmpresa}
        setForm={setFormEmpresa}
        onSubmit={handleEditarEmpresa}
        onCancel={() => setModalEditarEmpresa({ open: false, empresa: null })}
      />

      {/* Modal Criar Setor */}
      {modalCriarSetor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalCriarSetor(false)} />
          <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Novo Setor</h2>
            <form onSubmit={handleCriarSetor} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Nome do setor</label>
                <input
                  type="text"
                  value={novoSetor}
                  onChange={(e) => setNovoSetor(e.target.value)}
                  required
                  placeholder="Ex: Financeiro"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCriarSetor(false)}
                  className="flex-1 py-2 px-4 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Setor */}
      {editarSetor.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditarSetor({ open: false, setor: null, nome: '' })} />
          <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Editar Setor</h2>
            <form onSubmit={handleEditarSetor} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Nome do setor</label>
                <input
                  type="text"
                  value={editarSetor.nome}
                  onChange={(e) => setEditarSetor({ ...editarSetor, nome: e.target.value })}
                  required
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditarSetor({ open: false, setor: null, nome: '' })}
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
      )}

      <ModalConfirmarExclusao
        open={modalExcluirEmpresa.open}
        titulo="Excluir Empresa"
        descricao="Todos os dados desta empresa serão excluídos permanentemente."
        loading={modalExcluirEmpresa.loading}
        onConfirmar={handleExcluirEmpresa}
        onClose={() => setModalExcluirEmpresa({ open: false, empresa: null, loading: false })}
      />

      <ModalConfirmarExclusao
        open={modalExcluirSetor.open}
        titulo="Excluir Setor"
        descricao="Esta ação não pode ser desfeita."
        loading={modalExcluirSetor.loading}
        onConfirmar={handleExcluirSetor}
        onClose={() => setModalExcluirSetor({ open: false, setor: null, loading: false })}
      />
    </div>
  )
}