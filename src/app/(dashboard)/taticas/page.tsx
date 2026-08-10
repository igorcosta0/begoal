'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import { getObjetivos, getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { formatDate } from '@/lib/utils'
import { User, Building2, Calendar, CheckCircle2, Circle, MessageSquare, Send, Trash2, ChevronDown, ChevronUp, Zap, Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['Não Iniciado', 'Em Andamento', 'Concluído']

const COLUNA_ESTILO: Record<string, { barra: string; badge: string }> = {
  'Não Iniciado': { barra: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600' },
  'Em Andamento': { barra: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  'Concluído': { barra: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
}

interface FormTatica {
  descricao: string
  responsavel_id: string
  setor_id: string
  objetivo_id: string
  kr_id: string
  prazo: string
  Status: string
}

const FORM_INICIAL: FormTatica = {
  descricao: '',
  responsavel_id: '',
  setor_id: '',
  objetivo_id: '',
  kr_id: '',
  prazo: '',
  Status: 'Não Iniciado',
}

function ComentariosTatica({ taticaId, userId, nomeUsuario }: { taticaId: string; userId: string; nomeUsuario: string }) {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [aberto, setAberto] = useState(false)

  const fetchComentarios = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('taticas_comentarios')
      .select('*')
      .eq('tatica_id', taticaId)
      .order('created_at', { ascending: true })
    setComentarios(data ?? [])
  }, [taticaId])

  useEffect(() => { fetchComentarios() }, [fetchComentarios])

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('taticas_comentarios').insert({
      tatica_id: taticaId,
      comentario: novoComentario.trim(),
      autor_nome: nomeUsuario || 'Usuário',
      user_id: userId,
    })
    setNovoComentario('')
    await fetchComentarios()
    setLoading(false)
  }

  async function handleExcluir(id: string) {
    const supabase = createClient()
    await supabase.from('taticas_comentarios').delete().eq('id', id)
    await fetchComentarios()
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="w-3 h-3" />
        {comentarios.length > 0 ? `${comentarios.length} comentário${comentarios.length !== 1 ? 's' : ''}` : 'Comentar'}
        {aberto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {aberto && (
        <div className="mt-2 space-y-2">
          {comentarios.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhum comentário ainda.</p>
          )}
          {comentarios.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group/comment">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary">
                {(c.autor_nome ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground">
                  {c.autor_nome}{' '}
                  <span className="text-muted-foreground font-normal">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-xs text-foreground leading-relaxed">{c.comentario}</p>
              </div>
              {c.user_id === userId && (
                <button
                  onClick={() => handleExcluir(c.id)}
                  className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-0.5 rounded shrink-0"
                >
                  <Trash2 className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={handleEnviar} className="flex gap-1.5 mt-1">
            <input
              type="text"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Adicionar comentário..."
              className="flex-1 px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !novoComentario.trim()}
              className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function ModalTatica({
  open, titulo, form, setForm, setores, funcionarios, krs, objetivos, onSubmit, onCancel,
}: {
  open: boolean; titulo: string; form: FormTatica; setForm: (f: FormTatica) => void
  setores: any[]; funcionarios: any[]; krs: any[]; objetivos: any[]
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-4">{titulo}</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required rows={3} placeholder="Descreva a tática..."
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Objetivo</label>
            <select value={form.objetivo_id} onChange={(e) => setForm({ ...form, objetivo_id: e.target.value, kr_id: '' })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione um objetivo</option>
              {objetivos.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">KR vinculado *</label>
            <select value={form.kr_id} onChange={(e) => setForm({ ...form, kr_id: e.target.value })} required
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Selecione um KR</option>
              {krs.filter((k) => !form.objetivo_id || k.objetivo_id === form.objetivo_id).map((k) => (
                <option key={k.id} value={k.id}>{k.titulo}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Responsável</label>
              <select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Nenhum</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Setor</label>
              <select value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Nenhum</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.name ?? s.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Prazo</label>
              <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Status</label>
              <select value={form.Status} onChange={(e) => setForm({ ...form, Status: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TaticasPage() {
  const { empresa } = useEmpresaStore()
  const { user } = useAuthStore()

  const [taticas, setTaticas] = useState<any[]>([])
  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroObjetivo, setFiltroObjetivo] = useState('')
  const [filtroKr, setFiltroKr] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [colunaSobre, setColunaSobre] = useState<string | null>(null)

  const [modalCriar, setModalCriar] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; tatica: any | null; loading: boolean }>({ open: false, tatica: null, loading: false })
  const [form, setForm] = useState<FormTatica>(FORM_INICIAL)

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) setUserId(authUser.id)

    const { data: funcData } = await supabase.from('funcionarios').select('full_name').eq('user_id', authUser?.id ?? '').maybeSingle()
    if (funcData) setNomeUsuario(funcData.full_name?.split(' ')[0] ?? '')

    const { data } = await supabase
      .from('taticas')
      .select(`
        id, descricao, prazo, concluida, Status, created_at,
        objetivo_id, kr_id, responsavel_id, setor_id,
        funcionarios!responsavel_id(full_name),
        setores!setor_id(name),
        objetivos!objetivo_id(titulo),
        krs!kr_id(titulo)
      `)
      .eq('Client_Id', empresa.id)
      .order('created_at', { ascending: false })
    setTaticas(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!empresa) return
    const supabase = createClient()
    getObjetivos(empresa.id).then(({ data }) => setObjetivos(data ?? []))
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
    supabase.from('krs').select('id, titulo, objetivo_id').eq('client_id', empresa.id)
      .then(({ data }: { data: any }) => setKrs(data ?? []))
  }, [empresa])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa || !form.kr_id) return
    const supabase = createClient()
    await supabase.from('taticas').insert({
      descricao: form.descricao,
      responsavel_id: form.responsavel_id || undefined,
      setor_id: form.setor_id || undefined,
      objetivo_id: form.objetivo_id || undefined,
      kr_id: form.kr_id,
      prazo: form.prazo || undefined,
      Client_Id: empresa.id,
      concluida: false,
      Status: form.Status,
    })
    setForm(FORM_INICIAL)
    setModalCriar(false)
    fetchData()
  }

  // Mantém `concluida` e `Status` sincronizados, já que outras telas (ex.: painel
  // de Táticas do KR) somam pendentes/concluídas a partir do booleano `concluida`.
  async function handleToggleConcluida(tatica: any) {
    const novaConcluida = !tatica.concluida
    const supabase = createClient()
    await supabase.from('taticas').update({
      concluida: novaConcluida,
      Status: novaConcluida ? 'Concluído' : (tatica.Status === 'Concluído' ? 'Não Iniciado' : tatica.Status),
    }).eq('id', tatica.id)
    fetchData()
  }

  async function handleMoverStatus(taticaId: string, novoStatus: string) {
    const supabase = createClient()
    await supabase.from('taticas').update({
      Status: novoStatus,
      concluida: novoStatus === 'Concluído',
    }).eq('id', taticaId)
    fetchData()
  }

  function handleDragStart(e: React.DragEvent, taticaId: string) {
    e.dataTransfer.setData('text/plain', taticaId)
    e.dataTransfer.effectAllowed = 'move'
    setArrastandoId(taticaId)
  }

  function handleDragEnd() {
    setArrastandoId(null)
    setColunaSobre(null)
  }

  function handleDropNaColuna(e: React.DragEvent, status: string) {
    e.preventDefault()
    const taticaId = e.dataTransfer.getData('text/plain')
    setColunaSobre(null)
    setArrastandoId(null)
    if (!taticaId) return
    handleMoverStatus(taticaId, status)
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
    .filter((t) => !filtroKr || t.kr_id === filtroKr)
    .filter((t) => !filtroResponsavel || t.responsavel_id === filtroResponsavel)
    .filter((t) => !filtroSetor || t.setor_id === filtroSetor)

  const colunas = STATUS_OPTIONS.map((status) => ({
    status,
    itens: taticasFiltradas.filter((t) => (t.Status || 'Não Iniciado') === status),
  }))

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Táticas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {empresa?.company_name} — Ações vinculadas aos objetivos
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Tática
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 shrink-0">
        <select value={filtroObjetivo} onChange={(e) => { setFiltroObjetivo(e.target.value); setFiltroKr('') }}
          className="px-3 py-1.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos os objetivos</option>
          {objetivos.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
        </select>
        <select value={filtroKr} onChange={(e) => setFiltroKr(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos os KRs</option>
          {krs.filter((k) => !filtroObjetivo || k.objetivo_id === filtroObjetivo).map((k) => (
            <option key={k.id} value={k.id}>{k.titulo}</option>
          ))}
        </select>
        <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos os responsáveis</option>
          {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
        </select>
        <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s.id} value={s.id}>{s.name ?? s.nome}</option>)}
        </select>
      </div>

      {/* Board Kanban */}
      {loading ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : taticasFiltradas.length === 0 ? (
        <div className="flex-1 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">Nenhuma tática encontrada.</p>
          <button onClick={() => setModalCriar(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" /> Criar primeira tática
          </button>
        </div>
      ) : (
        <div data-tour="tour-taticas-board" className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-1">
          {colunas.map(({ status, itens }) => {
            const estilo = COLUNA_ESTILO[status]
            const emFoco = colunaSobre === status
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setColunaSobre(status) }}
                onDragLeave={() => setColunaSobre((atual) => (atual === status ? null : atual))}
                onDrop={(e) => handleDropNaColuna(e, status)}
                className={cn(
                  'flex flex-col w-[300px] shrink-0 md:w-auto md:flex-1 min-w-[260px] rounded-2xl border bg-card/50 transition-colors',
                  emFoco ? 'border-primary/50 bg-primary/[0.03]' : 'border-border'
                )}
              >
                {/* Cabeçalho da coluna */}
                <div className="shrink-0 p-3 pb-2">
                  <div className={`h-1 w-8 rounded-full mb-2.5 ${estilo.barra}`} />
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{status}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums ${estilo.badge}`}>
                      {itens.length}
                    </span>
                  </div>
                </div>

                {/* Cartões */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2.5">
                  {itens.length === 0 && (
                    <div className={cn(
                      'rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground/60 transition-colors',
                      emFoco ? 'border-primary/40' : 'border-border'
                    )}>
                      {emFoco ? 'Solte aqui' : 'Sem táticas'}
                    </div>
                  )}
                  {itens.map((tatica) => (
                    <div
                      key={tatica.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tatica.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing',
                        arrastandoId === tatica.id && 'opacity-40'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleConcluida(tatica)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title="Marcar como concluída"
                        >
                          {tatica.concluida
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Circle className="w-4 h-4" />
                          }
                        </button>
                        <p className={`flex-1 text-xs font-medium text-foreground leading-snug ${tatica.concluida ? 'line-through text-muted-foreground' : ''}`}>
                          {tatica.descricao}
                        </p>
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {(tatica.objetivos || tatica.krs) && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 ml-6 truncate">
                          {tatica.objetivos?.titulo}
                          {tatica.objetivos && tatica.krs ? ' · ' : ''}
                          {tatica.krs?.titulo}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 ml-6 text-[10px] text-muted-foreground">
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

                      <div className="ml-6">
                        <ComentariosTatica
                          taticaId={tatica.id}
                          userId={userId}
                          nomeUsuario={nomeUsuario}
                        />
                      </div>

                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => setModalExcluir({ open: true, tatica, loading: false })}
                          className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ModalTatica
        open={modalCriar}
        titulo="Nova Tática"
        form={form}
        setForm={setForm}
        setores={setores}
        funcionarios={funcionarios}
        krs={krs}
        objetivos={objetivos}
        onSubmit={handleCriar}
        onCancel={() => setModalCriar(false)}
      />

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