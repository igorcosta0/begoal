'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import {
  getCiclosAvaliacao,
  getAvaliacoesByCiclo,
  getMinhasAvaliacoes,
  createAvaliacao,
  updateCicloStatus,
} from '@/lib/queries/avaliacao'
import ModalCriarCiclo from '@/components/avaliacao/ModalCriarCiclo'
import ModalAvaliacao from '@/components/avaliacao/ModalAvaliacao'
import ModalNineBox from '@/components/avaliacao/ModalNineBox'
import { cn } from '@/lib/utils'
import { LayoutGrid, Plus, ChevronRight } from 'lucide-react'
import { VERTICAIS_CTZ } from '@/components/avaliacao/ModalAvaliacao'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Ciclo {
  id: string
  nome: string
  periodo: 1 | 2
  ano: number
  status: 'rascunho' | 'ativo' | 'encerrado'
}

interface Avaliacao {
  id: string
  status: string
  vertical: string | null
  media_cultural_auto: number | null
  media_cultural_gestor: number | null
  media_tecnica_auto: number | null
  media_tecnica_gestor: number | null
  evidencias_culturais: string | null
  observacoes_gerais: string | null
  funcionario: { id: string; full_name: string; cargo: string | null } | null
  avaliador: { id: string; full_name: string } | null
}

interface MinhaAvaliacao {
  id: string
  status: string
  vertical: string | null
  media_cultural_auto: number | null
  media_cultural_gestor: number | null
  media_tecnica_auto: number | null
  media_tecnica_gestor: number | null
  ciclo: { id: string; nome: string; periodo: number; ano: number; status: string } | null
}

interface Funcionario {
  id: string
  full_name: string
  cargo: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const cicloStatusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  encerrado: 'Encerrado',
}

const cicloStatusColor: Record<string, string> = {
  rascunho: 'bg-yellow-100 text-yellow-700',
  ativo: 'bg-green-100 text-green-700',
  encerrado: 'bg-gray-100 text-gray-600',
}

const avalStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  auto_concluida: 'Auto Concluída',
  gestor_concluida: 'Gestor Concluído',
  finalizada: 'Finalizada',
}

const avalStatusColor: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  auto_concluida: 'bg-blue-100 text-blue-700',
  gestor_concluida: 'bg-purple-100 text-purple-700',
  finalizada: 'bg-green-100 text-green-700',
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function AvaliacaoPage() {
  const { empresa } = useEmpresaStore()

  const [isAdmin, setIsAdmin] = useState(false)
  const [meuFuncionario, setMeuFuncionario] = useState<Funcionario | null>(null)
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [cicloAtivo, setCicloAtivo] = useState<Ciclo | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState<MinhaAvaliacao[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)

  const [modalCriarCiclo, setModalCriarCiclo] = useState(false)
  const [modalAvaliacao, setModalAvaliacao] = useState<{
    open: boolean
    avaliacao: Avaliacao | MinhaAvaliacao | null
    cicloNome: string
  }>({ open: false, avaliacao: null, cicloNome: '' })
  const [modalNineBox, setModalNineBox] = useState(false)

  const fetchCiclos = useCallback(async () => {
    if (!empresa) return
    const { data } = await getCiclosAvaliacao(empresa.id)
    setCiclos((data ?? []) as Ciclo[])
  }, [empresa])

  const fetchAvaliacoes = useCallback(async () => {
    if (!cicloAtivo) return
    const { data } = await getAvaliacoesByCiclo(cicloAtivo.id)
    setAvaliacoes((data ?? []) as unknown as Avaliacao[])
  }, [cicloAtivo])

  const fetchMinhasAvaliacoes = useCallback(async () => {
    if (!meuFuncionario) return
    const { data } = await getMinhasAvaliacoes(meuFuncionario.id)
    setMinhasAvaliacoes((data ?? []) as unknown as MinhaAvaliacao[])
  }, [meuFuncionario])

  const fetchFuncionarios = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const { data } = await supabase
      .from('funcionarios')
      .select('id, full_name, cargo')
      .eq('client_id', empresa.id)
      .eq('status', 'Ativo')
      .order('full_name')
    setFuncionarios((data ?? []) as Funcionario[])
  }, [empresa])

  useEffect(() => {
    if (!empresa) return
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [roleRes, funcRes] = await Promise.all([
        supabase
          .from('user_company_roles')
          .select('permission_level')
          .eq('user_id', user.id)
          .eq('client_id', empresa!.id)
          .single(),
        supabase
          .from('funcionarios')
          .select('id, full_name, cargo')
          .eq('user_id', user.id)
          .eq('client_id', empresa!.id)
          .single(),
      ])

      const admin = roleRes.data?.permission_level === 'administrador'
      setIsAdmin(admin)
      if (funcRes.data) setMeuFuncionario(funcRes.data as Funcionario)

      await fetchCiclos()
      if (admin) await fetchFuncionarios()
      setLoading(false)
    }
    init()
  }, [empresa, fetchCiclos, fetchFuncionarios])

  useEffect(() => {
    fetchAvaliacoes()
  }, [fetchAvaliacoes])

  useEffect(() => {
    if (meuFuncionario && !isAdmin) fetchMinhasAvaliacoes()
  }, [meuFuncionario, isAdmin, fetchMinhasAvaliacoes])

  async function handleAtivarCiclo(ciclo: Ciclo) {
    await updateCicloStatus(ciclo.id, ciclo.status === 'rascunho' ? 'ativo' : 'encerrado')
    fetchCiclos()
  }

  async function handleIniciarAvaliacao(funcionario: Funcionario) {
    if (!cicloAtivo) return
    const { data } = await createAvaliacao({
      ciclo_id: cicloAtivo.id,
      funcionario_id: funcionario.id,
    })
    if (data) {
      fetchAvaliacoes()
      const novaAvaliacao: Avaliacao = {
        ...(data as unknown as Avaliacao),
        funcionario: { id: funcionario.id, full_name: funcionario.full_name, cargo: funcionario.cargo },
        avaliador: null,
      }
      setModalAvaliacao({ open: true, avaliacao: novaAvaliacao, cicloNome: cicloAtivo.nome })
    }
  }

  function abrirAvaliacao(avaliacao: Avaliacao, cicloNome: string) {
    setModalAvaliacao({ open: true, avaliacao, cicloNome })
  }

  function abrirMinhaAvaliacao(avaliacao: MinhaAvaliacao) {
    setModalAvaliacao({
      open: true,
      avaliacao: {
        ...avaliacao,
        funcionario: meuFuncionario ? { id: meuFuncionario.id, full_name: meuFuncionario.full_name, cargo: meuFuncionario.cargo } : null,
        avaliador: null,
        evidencias_culturais: null,
        observacoes_gerais: null,
      } as Avaliacao,
      cicloNome: avaliacao.ciclo?.nome ?? '',
    })
  }

  const funcionariosComAvaliacao = new Set(avaliacoes.map((a) => a.funcionario?.id))
  const funcionariosSemAvaliacao = funcionarios.filter((f) => !funcionariosComAvaliacao.has(f.id))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      </div>
    )
  }

  // ── View do funcionário ───────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Avaliações</h1>
          <p className="text-sm text-muted-foreground mt-1">{empresa?.company_name}</p>
        </div>

        {minhasAvaliacoes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma avaliação disponível no momento.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde o administrador iniciar um ciclo de avaliação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {minhasAvaliacoes.map((av) => (
              <div
                key={av.id}
                className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{av.ciclo?.nome}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cicloStatusColor[av.ciclo?.status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                      {cicloStatusLabel[av.ciclo?.status ?? ''] ?? av.ciclo?.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', avalStatusColor[av.status] ?? 'bg-muted text-muted-foreground')}>
                      {avalStatusLabel[av.status] ?? av.status}
                    </span>
                    {av.vertical && (
                      <span className="text-xs text-muted-foreground">
                        {VERTICAIS_CTZ[av.vertical]?.label ?? av.vertical}
                      </span>
                    )}
                  </div>
                  {(av.media_cultural_auto !== null || av.media_tecnica_auto !== null) && (
                    <div className="flex gap-4 mt-2">
                      {av.media_cultural_auto !== null && (
                        <span className="text-xs text-muted-foreground">
                          Cultural (auto): <strong className="text-foreground">{av.media_cultural_auto.toFixed(1)}</strong>
                        </span>
                      )}
                      {av.media_tecnica_auto !== null && (
                        <span className="text-xs text-muted-foreground">
                          Técnica (auto): <strong className="text-foreground">{av.media_tecnica_auto.toFixed(1)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => abrirMinhaAvaliacao(av)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
                >
                  {av.status === 'pendente' ? 'Preencher' : 'Ver Avaliação'}
                </button>
              </div>
            ))}
          </div>
        )}

        <ModalAvaliacao
          open={modalAvaliacao.open}
          avaliacao={modalAvaliacao.avaliacao as Avaliacao}
          cicloNome={modalAvaliacao.cicloNome}
          isAdmin={false}
          onClose={() => setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '' })}
          onSave={() => { fetchMinhasAvaliacoes(); setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '' }) }}
        />
      </div>
    )
  }

  // ── View admin ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliação de Desempenho</h1>
          <p className="text-sm text-muted-foreground mt-1">{empresa?.company_name}</p>
        </div>
        <button
          onClick={() => setModalCriarCiclo(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Ciclo
        </button>
      </div>

      {/* Lista de ciclos */}
      {ciclos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-16 text-center">
          <p className="text-muted-foreground text-sm mb-3">Nenhum ciclo de avaliação criado.</p>
          <button
            onClick={() => setModalCriarCiclo(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Criar primeiro ciclo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ciclos.map((ciclo) => (
            <div key={ciclo.id} className="border border-border rounded-lg bg-card overflow-hidden">
              <div
                className={cn(
                  'flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors',
                  cicloAtivo?.id === ciclo.id && 'bg-accent/40'
                )}
                onClick={() => setCicloAtivo(cicloAtivo?.id === ciclo.id ? null : ciclo)}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 text-muted-foreground transition-transform',
                      cicloAtivo?.id === ciclo.id && 'rotate-90'
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ciclo.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {ciclo.periodo}º Semestre {ciclo.ano}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cicloStatusColor[ciclo.status])}>
                    {cicloStatusLabel[ciclo.status]}
                  </span>
                  {ciclo.status !== 'encerrado' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAtivarCiclo(ciclo) }}
                      className="text-xs px-3 py-1 border border-border rounded-md hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {ciclo.status === 'rascunho' ? 'Ativar' : 'Encerrar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Painel expandido do ciclo */}
              {cicloAtivo?.id === ciclo.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">
                      {avaliacoes.length} avaliação(ões) criada(s)
                      {funcionariosSemAvaliacao.length > 0 && ` · ${funcionariosSemAvaliacao.length} funcionário(s) sem avaliação`}
                    </p>
                    <button
                      onClick={() => setModalNineBox(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-foreground"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Nine Box
                    </button>
                  </div>

                  {/* Avaliações existentes */}
                  {avaliacoes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avaliações</p>
                      {avaliacoes.map((av) => (
                        <div
                          key={av.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-background hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
                              {(av.funcionario?.full_name ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {av.funcionario?.full_name ?? 'Sem nome'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {av.funcionario?.cargo && (
                                  <span className="text-xs text-muted-foreground">{av.funcionario.cargo}</span>
                                )}
                                {av.vertical && (
                                  <span className="text-xs text-muted-foreground">
                                    · {VERTICAIS_CTZ[av.vertical]?.label ?? av.vertical}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {av.media_cultural_gestor !== null && (
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">Cultural</p>
                                <p className="text-sm font-semibold text-foreground">{av.media_cultural_gestor.toFixed(1)}</p>
                              </div>
                            )}
                            {av.media_tecnica_gestor !== null && (
                              <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground">Técnica</p>
                                <p className="text-sm font-semibold text-foreground">{av.media_tecnica_gestor.toFixed(1)}</p>
                              </div>
                            )}
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', avalStatusColor[av.status] ?? 'bg-muted text-muted-foreground')}>
                              {avalStatusLabel[av.status] ?? av.status}
                            </span>
                            <button
                              onClick={() => abrirAvaliacao(av, ciclo.nome)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Funcionários sem avaliação */}
                  {funcionariosSemAvaliacao.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Sem avaliação neste ciclo
                      </p>
                      {funcionariosSemAvaliacao.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-md border border-dashed border-border bg-background"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-semibold text-xs">
                              {f.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{f.full_name}</p>
                              {f.cargo && <p className="text-xs text-muted-foreground">{f.cargo}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleIniciarAvaliacao(f)}
                            className="px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            + Iniciar Avaliação
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ModalCriarCiclo
        open={modalCriarCiclo}
        clientId={empresa?.id ?? ''}
        onClose={() => setModalCriarCiclo(false)}
        onSave={() => { fetchCiclos() }}
      />

      <ModalAvaliacao
        open={modalAvaliacao.open}
        avaliacao={modalAvaliacao.avaliacao as Avaliacao}
        cicloNome={modalAvaliacao.cicloNome}
        isAdmin={isAdmin}
        onClose={() => setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '' })}
        onSave={() => {
          fetchAvaliacoes()
          setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '' })
        }}
      />

      <ModalNineBox
        open={modalNineBox}
        avaliacoes={avaliacoes.map((a) => ({
          id: a.id,
          funcionario: a.funcionario,
          media_cultural_gestor: a.media_cultural_gestor,
          media_tecnica_gestor: a.media_tecnica_gestor,
        }))}
        onClose={() => setModalNineBox(false)}
      />
    </div>
  )
}
