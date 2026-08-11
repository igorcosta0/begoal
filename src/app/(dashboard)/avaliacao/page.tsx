'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import {
  getCiclosAvaliacao,
  getAvaliacoesByCiclo,
  getMinhasAvaliacoes,
  getAvaliacoesParaAvaliar,
  createAvaliacao,
  updateCicloStatus,
  deleteCicloAvaliacao,
  deleteAvaliacao,
  ehLider,
} from '@/lib/queries/avaliacao'
import { getFuncionariosByEmpresa } from '@/lib/queries/okr'
import ModalCriarCiclo from '@/components/avaliacao/ModalCriarCiclo'
import ModalAvaliacao from '@/components/avaliacao/ModalAvaliacao'
import ModalNineBox from '@/components/avaliacao/ModalNineBox'
import ModalMontarAvaliacoes, { type LinhaMontagem, type OpcaoAvaliador } from '@/components/avaliacao/ModalMontarAvaliacoes'
import ModalAvaliacaoPares, { type CandidatoLider } from '@/components/avaliacao/ModalAvaliacaoPares'
import { cn, isEmpresaCTZ } from '@/lib/utils'
import { LayoutGrid, Plus, ChevronRight, Trash2, Users2, ArrowRightLeft, X } from 'lucide-react'
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
  tipo?: 'padrao' | 'pares'
  revelado: boolean
  media_cultural_auto: number | null
  media_cultural_gestor: number | null
  media_cultural_calibragem: number | null
  media_tecnica_auto: number | null
  media_tecnica_gestor: number | null
  media_tecnica_calibragem: number | null
  evidencias_culturais: string | null
  evidencias_tecnicas: string | null
  observacoes_gerais: string | null
  funcionario: { id: string; full_name: string; cargo: string | null } | null
  avaliador: { id: string; full_name: string } | null
}

interface MinhaAvaliacao {
  id: string
  status: string
  vertical: string | null
  tipo?: 'padrao' | 'pares'
  revelado: boolean
  media_cultural_auto: number | null
  media_cultural_gestor: number | null
  media_cultural_calibragem: number | null
  media_tecnica_auto: number | null
  media_tecnica_gestor: number | null
  media_tecnica_calibragem: number | null
  avaliador?: { id: string; full_name: string } | null
  ciclo: { id: string; nome: string; periodo: number; ano: number; status: string } | null
}

// Avaliação que EU preciso preencher como avaliador (não sobre mim) — é assim
// que um líder com permissão comum (não admin/gestor) enxerga a avaliação de
// pares que outro líder pediu pra ele fazer.
interface AvaliacaoParaAvaliar {
  id: string
  status: string
  vertical: string | null
  tipo?: 'padrao' | 'pares'
  revelado: boolean
  funcionario: { id: string; full_name: string; cargo: string | null } | null
  ciclo: { id: string; nome: string; periodo: number; ano: number; status: string } | null
}

interface Funcionario {
  id: string
  full_name: string
  cargo: string | null
  setor?: { name: string } | null
  gestor_id?: string | null
  gestor?: { full_name: string } | null
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
  calibragem: 'Em Calibragem',
  finalizada: 'Finalizada',
}

function resultadoFinal(av: { media_cultural_gestor: number | null; media_cultural_calibragem: number | null; media_tecnica_gestor: number | null; media_tecnica_calibragem: number | null }) {
  const cultural = av.media_cultural_calibragem ?? av.media_cultural_gestor
  const tecnica = av.media_tecnica_calibragem ?? av.media_tecnica_gestor
  const percentual = cultural !== null && tecnica !== null ? Math.round(((cultural + tecnica) / 2 / 5) * 100) : null
  return { cultural, tecnica, percentual }
}

const avalStatusColor: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  auto_concluida: 'bg-blue-100 text-blue-700',
  gestor_concluida: 'bg-purple-100 text-purple-700',
  calibragem: 'bg-orange-100 text-orange-700',
  finalizada: 'bg-green-100 text-green-700',
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function AvaliacaoPage() {
  const { empresa } = useEmpresaStore()

  const [isAdmin, setIsAdmin] = useState(false)
  // Ativar/encerrar/excluir ciclo continua exclusivo de administrador — regra espelha a RLS.
  const [souAdministrador, setSouAdministrador] = useState(false)
  // Criar ciclo é liberado pra administrador e gestor comum também.
  const [podeCriarCiclo, setPodeCriarCiclo] = useState(false)
  // Administrador e calibrador enxergam todos os funcionários da empresa; gestor comum
  // vê somente seus próprios liderados (definidos pelo campo "gestor_id" de cada funcionário).
  const [veTodaEmpresa, setVeTodaEmpresa] = useState(false)
  const [meuFuncionario, setMeuFuncionario] = useState<Funcionario | null>(null)
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [cicloAtivo, setCicloAtivo] = useState<Ciclo | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [minhasAvaliacoes, setMinhasAvaliacoes] = useState<MinhaAvaliacao[]>([])
  const [avaliacoesParaAvaliar, setAvaliacoesParaAvaliar] = useState<AvaliacaoParaAvaliar[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [opcoesAvaliador, setOpcoesAvaliador] = useState<OpcaoAvaliador[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [modalCriarCiclo, setModalCriarCiclo] = useState(false)
  const [modalAvaliacao, setModalAvaliacao] = useState<{
    open: boolean
    avaliacao: Avaliacao | MinhaAvaliacao | null
    cicloNome: string
    papelAvaliador: boolean
  }>({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false })
  const [modalNineBox, setModalNineBox] = useState(false)
  const [modalMontar, setModalMontar] = useState<{
    open: boolean
    ciclo: Ciclo | null
    ativarAoConfirmar: boolean
    funcionariosAlvo: Funcionario[]
    confirmando: boolean
    erro: string | null
  }>({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], confirmando: false, erro: null })
  const [modalPares, setModalPares] = useState<{
    open: boolean
    ciclo: Ciclo | null
    lideres: Funcionario[]
    confirmando: boolean
    erro: string | null
  }>({ open: false, ciclo: null, lideres: [], confirmando: false, erro: null })

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

  // Avaliações de pares (ou qualquer outra) onde eu sou o avaliador designado,
  // não o avaliado — é o que mostra a seção "Preciso Avaliar" pra um líder que
  // não tem permissão de admin/gestor no sistema.
  const fetchAvaliacoesParaAvaliar = useCallback(async () => {
    if (!meuFuncionario) return
    const { data } = await getAvaliacoesParaAvaliar(meuFuncionario.id)
    setAvaliacoesParaAvaliar(((data ?? []) as unknown as AvaliacaoParaAvaliar[]).filter((a) => a.funcionario?.id !== meuFuncionario.id))
  }, [meuFuncionario])

  // Se gestorId for informado, restringe a lista aos liderados desse gestor
  // (funcionarios.gestor_id = gestorId). Sem gestorId, traz todo mundo da empresa —
  // uso reservado a administrador/calibrador.
  const fetchFuncionarios = useCallback(async (gestorId?: string) => {
    if (!empresa) return
    const supabase = createClient()
    let query = supabase
      .from('funcionarios')
      .select('id, full_name, cargo, gestor_id, setor:setores!setor_id(name), gestor:funcionarios!gestor_id(full_name)')
      .eq('client_id', empresa.id)
      .eq('status', 'Ativo')
      .order('full_name')
    if (gestorId) query = query.eq('gestor_id', gestorId)
    const { data } = await query
    setFuncionarios((data ?? []) as unknown as Funcionario[])
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
          .select('permission_level, is_calibrador')
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

      // 'administrador', 'gestor' e calibradores avulsos (is_calibrador) têm acesso ao
      // fluxo de avaliação (em vez da tela "Minhas Avaliações" de um funcionário comum),
      // mas só administrador/calibrador enxergam TODOS os funcionários da empresa — um
      // gestor comum só pode ver e avaliar seus próprios liderados.
      const permission = roleRes.data?.permission_level
      const administrador = permission === 'administrador'
      const calibrador = roleRes.data?.is_calibrador === true
      const souGestor = permission === 'gestor'
      const admin = administrador || souGestor || calibrador
      const todaEmpresa = administrador || calibrador
      setIsAdmin(admin)
      setSouAdministrador(administrador)
      setPodeCriarCiclo(administrador || souGestor)
      setVeTodaEmpresa(todaEmpresa)
      const meuFunc = funcRes.data as Funcionario | null
      if (meuFunc) setMeuFuncionario(meuFunc)

      await fetchCiclos()
      // Gestor comum só busca a lista se tivermos o próprio funcionario.id pra escopar
      // por gestor_id — sem isso, cair pra "buscar sem filtro" mostraria a empresa
      // inteira (falha aberta). Nesse caso preferimos não listar ninguém.
      if (todaEmpresa) {
        await fetchFuncionarios()
      } else if (admin && meuFunc?.id) {
        await fetchFuncionarios(meuFunc.id)
      }
      // Opções de avaliador na montagem do ciclo cobrem a empresa toda (não só os
      // liderados de quem está montando) — dá pra escalar qualquer pessoa, não só o
      // gestor direto no organograma.
      if (admin) {
        const { data: todos } = await getFuncionariosByEmpresa(empresa!.id)
        setOpcoesAvaliador((todos ?? []) as OpcaoAvaliador[])
      }
      setLoading(false)
    }
    init()
  }, [empresa, fetchCiclos, fetchFuncionarios])

  useEffect(() => {
    fetchAvaliacoes()
  }, [fetchAvaliacoes])

  useEffect(() => {
    if (meuFuncionario && !isAdmin) {
      fetchMinhasAvaliacoes()
      fetchAvaliacoesParaAvaliar()
    }
  }, [meuFuncionario, isAdmin, fetchMinhasAvaliacoes, fetchAvaliacoesParaAvaliar])

  // "Ativar" (rascunho → ativo) e "Adicionar ao ciclo" (ativo, gente sem avaliação)
  // agora abrem a montagem em vez de criar avaliações às cegas: busca fresh quem já
  // tem avaliação NESTE ciclo (não dá pra confiar no estado `avaliacoes`, que é do
  // ciclo expandido no acordeão, que pode ser um ciclo diferente do que foi clicado).
  async function abrirMontagem(ciclo: Ciclo, ativarAoConfirmar: boolean) {
    setErro('')
    const supabase = createClient()
    const { data: existentes, error } = await supabase
      .from('avaliacoes')
      .select('funcionario_id')
      .eq('ciclo_id', ciclo.id)
      .eq('tipo', 'padrao')
    if (error) {
      setErro(error.message)
      return
    }
    const jaTem = new Set((existentes ?? []).map((a) => a.funcionario_id))
    const alvo = funcionarios.filter((f) => !jaTem.has(f.id))
    setModalMontar({ open: true, ciclo, ativarAoConfirmar, funcionariosAlvo: alvo, confirmando: false, erro: null })
  }

  async function handleConfirmarMontagem(linhas: LinhaMontagem[]) {
    const { ciclo, ativarAoConfirmar } = modalMontar
    if (!ciclo) return
    setModalMontar((prev) => ({ ...prev, confirmando: true, erro: null }))

    if (ativarAoConfirmar) {
      const { error } = await updateCicloStatus(ciclo.id, 'ativo')
      if (error) {
        setModalMontar((prev) => ({ ...prev, confirmando: false, erro: error.message }))
        return
      }
    }

    const incluidas = linhas.filter((l) => l.incluir)
    if (incluidas.length > 0) {
      const resultados = await Promise.all(
        incluidas.map((l) =>
          createAvaliacao({
            ciclo_id: ciclo.id,
            funcionario_id: l.funcionario_id,
            avaliador_id: l.avaliador_id || undefined,
            vertical: l.vertical || undefined,
          })
        )
      )
      const erroCriacao = resultados.find((r) => r.error)?.error
      if (erroCriacao) {
        setModalMontar((prev) => ({ ...prev, confirmando: false, erro: erroCriacao.message }))
        return
      }
    }

    setModalMontar({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], confirmando: false, erro: null })
    fetchCiclos()
    if (cicloAtivo?.id === ciclo.id) fetchAvaliacoes()
  }

  function abrirModalPares(ciclo: Ciclo) {
    setErro('')
    setModalPares({ open: true, ciclo, lideres: lideresCandidatos, confirmando: false, erro: null })
  }

  // Sorteia a distribuição: embaralha os líderes marcados e usa offsets fixos
  // (1..quantidade) sobre a ordem embaralhada. Isso garante que cada líder
  // avalia exatamente `quantidade` colegas E é avaliado por exatamente
  // `quantidade` colegas (grafo k-regular), sem ninguém avaliar a si mesmo.
  function sortearPares(lideres: CandidatoLider[], quantidade: number) {
    const embaralhados = [...lideres]
    for (let i = embaralhados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]]
    }
    const n = embaralhados.length
    const k = Math.min(quantidade, Math.max(n - 1, 0))
    const pares: { funcionario_id: string; avaliador_id: string }[] = []
    for (let i = 0; i < n; i++) {
      for (let offset = 1; offset <= k; offset++) {
        const avaliador = embaralhados[i]
        const avaliado = embaralhados[(i + offset) % n]
        pares.push({ funcionario_id: avaliado.id, avaliador_id: avaliador.id })
      }
    }
    return pares
  }

  async function handleConfirmarPares(selecionados: CandidatoLider[], quantidade: number) {
    const { ciclo } = modalPares
    const lideres = selecionados
    if (!ciclo || lideres.length < 2) return
    setModalPares((prev) => ({ ...prev, confirmando: true, erro: null }))

    const supabase = createClient()
    const { data: existentes, error: erroExistentes } = await supabase
      .from('avaliacoes')
      .select('funcionario_id, avaliador_id')
      .eq('ciclo_id', ciclo.id)
      .eq('tipo', 'pares')
    if (erroExistentes) {
      setModalPares((prev) => ({ ...prev, confirmando: false, erro: erroExistentes.message }))
      return
    }
    const jaExiste = new Set((existentes ?? []).map((a) => `${a.funcionario_id}:${a.avaliador_id}`))

    const pares = sortearPares(lideres, quantidade).filter(
      (p) => !jaExiste.has(`${p.funcionario_id}:${p.avaliador_id}`)
    )

    if (pares.length > 0) {
      const resultados = await Promise.all(
        pares.map((p) => createAvaliacao({ ciclo_id: ciclo.id, funcionario_id: p.funcionario_id, avaliador_id: p.avaliador_id, tipo: 'pares' }))
      )
      const erroCriacao = resultados.find((r) => r.error)?.error
      if (erroCriacao) {
        setModalPares((prev) => ({ ...prev, confirmando: false, erro: erroCriacao.message }))
        return
      }
    }

    setModalPares({ open: false, ciclo: null, lideres: [], confirmando: false, erro: null })
    if (cicloAtivo?.id === ciclo.id) fetchAvaliacoes()
  }

  async function handleExcluirAvaliacao(av: Avaliacao) {
    const confirmado = window.confirm(`Excluir a avaliação de ${av.funcionario?.full_name ?? 'este colaborador'}? Essa ação não pode ser desfeita.`)
    if (!confirmado) return
    setErro('')
    const { error } = await deleteAvaliacao(av.id)
    if (error) {
      setErro(error.message)
      return
    }
    fetchAvaliacoes()
  }

  async function handleEncerrarCiclo(ciclo: Ciclo) {
    setErro('')
    const { error } = await updateCicloStatus(ciclo.id, 'encerrado')
    if (error) {
      setErro(error.message)
      return
    }
    fetchCiclos()
  }

  async function handleDeletarCiclo(ciclo: Ciclo) {
    const confirmado = window.confirm(
      `Excluir o ciclo "${ciclo.nome}"? Todas as avaliações desse ciclo serão apagadas junto. Essa ação não pode ser desfeita.`
    )
    if (!confirmado) return
    setErro('')
    const { error } = await deleteCicloAvaliacao(ciclo.id)
    if (error) {
      setErro(error.message)
      return
    }
    if (cicloAtivo?.id === ciclo.id) setCicloAtivo(null)
    fetchCiclos()
  }

  function abrirAvaliacao(avaliacao: Avaliacao, cicloNome: string) {
    setModalAvaliacao({ open: true, avaliacao, cicloNome, papelAvaliador: false })
  }

  function abrirMinhaAvaliacao(avaliacao: MinhaAvaliacao) {
    setModalAvaliacao({
      open: true,
      avaliacao: {
        ...avaliacao,
        funcionario: meuFuncionario ? { id: meuFuncionario.id, full_name: meuFuncionario.full_name, cargo: meuFuncionario.cargo } : null,
        avaliador: avaliacao.avaliador ?? null,
        evidencias_culturais: null,
        evidencias_tecnicas: null,
        observacoes_gerais: null,
      } as Avaliacao,
      cicloNome: avaliacao.ciclo?.nome ?? '',
      papelAvaliador: false,
    })
  }

  // Avaliação de pares que EU preciso preencher sobre outro líder — abre o
  // mesmo modal, mas no papel de avaliador (não de avaliado).
  function abrirParaAvaliar(avaliacao: AvaliacaoParaAvaliar) {
    setModalAvaliacao({
      open: true,
      avaliacao: {
        id: avaliacao.id,
        status: avaliacao.status,
        vertical: avaliacao.vertical,
        tipo: avaliacao.tipo,
        revelado: avaliacao.revelado,
        observacoes_gerais: null,
        media_cultural_auto: null,
        media_cultural_gestor: null,
        media_cultural_calibragem: null,
        media_tecnica_auto: null,
        media_tecnica_gestor: null,
        media_tecnica_calibragem: null,
        evidencias_culturais: null,
        evidencias_tecnicas: null,
        funcionario: avaliacao.funcionario,
        avaliador: meuFuncionario ? { id: meuFuncionario.id, full_name: meuFuncionario.full_name } : null,
      } as Avaliacao,
      cicloNome: avaliacao.ciclo?.nome ?? '',
      papelAvaliador: true,
    })
  }

  const funcionariosComAvaliacao = new Set(avaliacoes.map((a) => a.funcionario?.id))
  const funcionariosSemAvaliacao = funcionarios.filter((f) => !funcionariosComAvaliacao.has(f.id))

  // Líder = cargo contém "líder" OU aparece como gestor_id de alguém — calculado
  // aqui, não é uma coluna própria. `funcionarios` só cobre a empresa toda quando
  // souAdministrador (calibrador não configura pares, só admin).
  const idsComLiderado = new Set(funcionarios.map((f) => f.gestor_id).filter((id): id is string => !!id))
  const lideresCandidatos = souAdministrador ? funcionarios.filter((f) => ehLider(f, idsComLiderado)) : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
        </div>
      </div>
    )
  }

  // Módulo construído apenas para a CTZ (rubric de pilares/verticais é específico dela)
  if (!isEmpresaCTZ(empresa?.company_name)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  // ── View do funcionário ───────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div data-tour="tour-avaliacao" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Minhas Avaliações</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{empresa?.company_name}</p>
          </div>
        </div>

        {avaliacoesParaAvaliar.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Preciso Avaliar ({avaliacoesParaAvaliar.length})
              </p>
            </div>
            {avaliacoesParaAvaliar.map((av) => (
              <div
                key={av.id}
                className="bg-card border border-violet-200 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{av.funcionario?.full_name ?? 'Colega'}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                      Avaliação de Pares
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', avalStatusColor[av.status] ?? 'bg-muted text-muted-foreground')}>
                      {avalStatusLabel[av.status] ?? av.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{av.ciclo?.nome}</span>
                  </div>
                </div>
                <button
                  onClick={() => abrirParaAvaliar(av)}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
                >
                  {av.status === 'pendente' ? 'Avaliar' : 'Ver Avaliação'}
                </button>
              </div>
            ))}
          </div>
        )}

        {minhasAvaliacoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma avaliação disponível no momento.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde o administrador iniciar um ciclo de avaliação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {avaliacoesParaAvaliar.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sobre mim</p>
            )}
            {minhasAvaliacoes.map((av) => (
              <div
                key={av.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4"
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
                  {av.revelado && (() => {
                    const { cultural, tecnica, percentual } = resultadoFinal(av)
                    return (
                      <div className="flex gap-4 mt-2">
                        {cultural !== null && (
                          <span className="text-xs text-muted-foreground">
                            Cultural (final): <strong className="text-foreground">{cultural.toFixed(1)}</strong>
                          </span>
                        )}
                        {tecnica !== null && (
                          <span className="text-xs text-muted-foreground">
                            Técnica (final): <strong className="text-foreground">{tecnica.toFixed(1)}</strong>
                          </span>
                        )}
                        {percentual !== null && (
                          <span className="text-xs text-muted-foreground">
                            Resultado: <strong className="text-foreground">{percentual}%</strong>
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <button
                  onClick={() => abrirMinhaAvaliacao(av)}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
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
          isAdmin={modalAvaliacao.papelAvaliador}
          onClose={() => setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false })}
          onSave={() => { fetchMinhasAvaliacoes(); fetchAvaliacoesParaAvaliar(); setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false }) }}
        />
      </div>
    )
  }

  // ── View admin ────────────────────────────────────────────────────────────
  return (
    <div data-tour="tour-avaliacao" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Avaliação de Desempenho</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{empresa?.company_name}</p>
          </div>
        </div>
        {podeCriarCiclo && (
          <button
            onClick={() => setModalCriarCiclo(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Ciclo
          </button>
        )}
      </div>

      {erro && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {erro}
        </p>
      )}

      {/* Lista de ciclos */}
      {ciclos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            {podeCriarCiclo ? 'Nenhum ciclo de avaliação criado.' : 'Nenhum ciclo de avaliação disponível ainda.'}
          </p>
          {podeCriarCiclo && (
            <button
              onClick={() => setModalCriarCiclo(true)}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              Criar primeiro ciclo
            </button>
          )}
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
                  {souAdministrador && ciclo.status !== 'encerrado' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (ciclo.status === 'rascunho') abrirMontagem(ciclo, true)
                        else handleEncerrarCiclo(ciclo)
                      }}
                      className="text-xs px-3 py-1 border border-border rounded-md hover:bg-accent transition-colors text-muted-foreground"
                    >
                      {ciclo.status === 'rascunho' ? 'Ativar' : 'Encerrar'}
                    </button>
                  )}
                  {souAdministrador && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletarCiclo(ciclo) }}
                      title="Excluir ciclo"
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                    <div className="flex items-center gap-2">
                      {ciclo.status === 'ativo' && funcionariosSemAvaliacao.length > 0 && (
                        <button
                          onClick={() => abrirMontagem(ciclo, false)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-foreground"
                        >
                          <Users2 className="w-3.5 h-3.5" />
                          Adicionar ao ciclo
                        </button>
                      )}
                      {souAdministrador && ciclo.status === 'ativo' && (
                        <button
                          onClick={() => abrirModalPares(ciclo)}
                          title={lideresCandidatos.length < 2 ? 'Precisa de pelo menos 2 líderes identificados' : undefined}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-foreground"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Avaliação de Pares
                        </button>
                      )}
                      <button
                        onClick={() => setModalNineBox(true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-foreground"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Nine Box
                      </button>
                    </div>
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
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {av.funcionario?.full_name ?? 'Sem nome'}
                                </p>
                                {av.tipo === 'pares' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 shrink-0">
                                    Pares
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {av.funcionario?.cargo && (
                                  <span className="text-xs text-muted-foreground">{av.funcionario.cargo}</span>
                                )}
                                {av.vertical && (
                                  <span className="text-xs text-muted-foreground">
                                    · {VERTICAIS_CTZ[av.vertical]?.label ?? av.vertical}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  · avaliador: {av.avaliador?.full_name ?? 'não definido'}
                                </span>
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
                            {souAdministrador && (
                              <button
                                onClick={() => handleExcluirAvaliacao(av)}
                                title="Excluir avaliação"
                                className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Funcionários sem avaliação */}
                  {funcionariosSemAvaliacao.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Sem avaliação neste ciclo
                        </p>
                        {ciclo.status === 'ativo' && (
                          <button
                            onClick={() => abrirMontagem(ciclo, false)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Adicionar ao ciclo →
                          </button>
                        )}
                      </div>
                      {funcionariosSemAvaliacao.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-semibold text-xs">
                            {f.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-foreground">{f.full_name}</p>
                            {f.cargo && <p className="text-xs text-muted-foreground">{f.cargo}</p>}
                          </div>
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
        onClose={() => setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false })}
        onSave={() => {
          fetchAvaliacoes()
          setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false })
        }}
      />

      <ModalNineBox
        open={modalNineBox}
        avaliacoes={avaliacoes.filter((a) => a.tipo !== 'pares').map((a) => ({
          id: a.id,
          funcionario: a.funcionario,
          media_cultural_gestor: a.media_cultural_gestor,
          media_tecnica_gestor: a.media_tecnica_gestor,
        }))}
        onClose={() => setModalNineBox(false)}
      />

      <ModalMontarAvaliacoes
        open={modalMontar.open}
        cicloNome={modalMontar.ciclo?.nome ?? ''}
        funcionarios={modalMontar.funcionariosAlvo}
        opcoesAvaliador={opcoesAvaliador}
        acaoLabel={modalMontar.ativarAoConfirmar ? 'Confirmar e ativar ciclo' : 'Adicionar ao ciclo'}
        confirmando={modalMontar.confirmando}
        erro={modalMontar.erro}
        onClose={() => setModalMontar({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], confirmando: false, erro: null })}
        onConfirmar={handleConfirmarMontagem}
      />

      <ModalAvaliacaoPares
        open={modalPares.open}
        cicloNome={modalPares.ciclo?.nome ?? ''}
        lideres={modalPares.lideres}
        confirmando={modalPares.confirmando}
        erro={modalPares.erro}
        onClose={() => setModalPares({ open: false, ciclo: null, lideres: [], confirmando: false, erro: null })}
        onConfirmar={handleConfirmarPares}
      />
    </div>
  )
}
