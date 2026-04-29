'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { formatDate } from '@/lib/utils'
import { User, Building2, Calendar, CheckCircle2, Circle } from 'lucide-react'

export default function TaticasPage() {
  const { empresa } = useEmpresaStore()

  const [taticas, setTaticas] = useState<any[]>([])
  const [objetivos, setObjetivos] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroObjetivo, setFiltroObjetivo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const [modalCriar, setModalCriar] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; tatica: any | null; loading: boolean }>({ open: false, tatica: null, loading: false })

  const [form, setForm] = useState({
    descricao: '',
    responsavel_id: '',
    setor_id: '',
    objetivo_id: '',
    kr_id: '',
    prazo: '',
  })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('taticas')
      .select(`
        id, descricao, prazo, concluida, Status, created_at,
        objetivo_id, kr_id, responsavel_id, setor_id,
        funcionarios!responsavel_id(full_name),
        setores!setor_id(name),
        objetivos!objetivo_id(titulo)
      `)
      .eq('Client_Id', empresa.id)
      .order('created_at', { ascending: false })
    setTaticas(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!empresa) return
    getObjetivos(empresa.id).then(({ data }) => setObjetivos(data ?? []))
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
  }, [empresa])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    const supabase = createClient()
    await supabase.from('taticas').insert({
      descricao: form.descricao,
      responsavel_id: form.responsavel_id || undefined,
      setor_id: form.setor_id || undefined,
      objetivo_id: form.objetivo_id || undefined,
      kr_id: form.kr_id || undefined,
      prazo: form.prazo || undefined,
      Client_Id: empresa.id,
      concluida: false,
    })
    setForm({ descricao: '', responsavel_id: '', setor_id: '', objetivo_id: '', kr_id: '', prazo: '' })
    setModalCriar(false)
    fetchData()
  }

  async function handleToggleConcluida(tatica: any) {
    const supabase = createClient()
    await supabase
      .from('taticas')
      .update({ concluida: !tatica.concluida })
      .eq('id', tatica.id)
    fetchData()
  }

  async function handleExcluir() {
    if (!modalExcluir.tatica) return
    setModalExcluir((prev) => ({ ...prev, loading: true }))
    const supabase = createClient()
    await supabase.from('taticas').delete().eq('id', modalExcluir.tatica.id)
    setModalExcluir({ open: false, tatica: null, loading: false })
    fetchData()
  }

  const taticasFiltradas = taticas
    .filter((t) => !filtroObjetivo || t.objetivo_id === filtroObjetivo)
    .filter((t) => {
      if (!filtroStatus) return true
      if (filtroStatus === 'concluida') return t.concluida
      if (filtroStatus === 'pendente') return !t.concluida
      return true
    })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Táticas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {empresa?.company_name} — Ações vinculadas aos objetivos
          </p>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nova Tática
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtroObjetivo}
          onChange={(e) => setFiltroObjetivo(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os objetivos</option>
          {objetivos.map((o) => (
            <option key={o.id} value={o.id}>{o.titulo}</option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="concluida">Concluídas</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : taticasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            Nenhuma tática cadastrada ainda.
          </p>
          <button
            onClick={() => setModalCriar(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Criar primeira tática
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {taticasFiltradas.map((tatica) => (
            <div
              key={tatica.id}
              className={`bg-card border border-border rounded-lg p-4 flex items-start gap-3 hover:shadow-sm transition-shadow ${tatica.concluida ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => handleToggleConcluida(tatica)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              >
                {tatica.concluida
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-foreground ${tatica.concluida ? 'line-through' : ''}`}>
                  {tatica.descricao}
                </p>

                {tatica.objetivos && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tatica.objetivos.titulo}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {tatica.funcionarios && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {tatica.funcionarios.full_name}
                    </span>
                  )}
                  {tatica.setores && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {tatica.setores.name}
                    </span>
                  )}
                  {tatica.prazo && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(tatica.prazo)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setModalExcluir({ open: true, tatica, loading: false })}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      {modalCriar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalCriar(false)} />
          <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Nova Tática</h2>

            <form onSubmit={handleCriar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                  rows={3}
                  placeholder="Descreva a tática..."
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Responsável</label>
                  <select
                    value={form.responsavel_id}
                    onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Nenhum</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name ?? s.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Objetivo vinculado</label>
                <select
                  value={form.objetivo_id}
                  onChange={(e) => setForm({ ...form, objetivo_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Nenhum</option>
                  {objetivos.map((o) => (
                    <option key={o.id} value={o.id}>{o.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Prazo</label>
                <input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCriar(false)}
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

      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir Tática"
        descricao="Esta ação não pode ser desfeita."
        loading={modalExcluir.loading}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, tatica: null, loading: false })}
      />
    </div>
  )
}