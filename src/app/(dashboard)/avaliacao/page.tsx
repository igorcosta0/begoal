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
} from '@/lib/queries/avaliacao'
import { getFuncionariosByEmpresa } from '@/lib/queries/okr'
import ModalCriarCiclo from '@/components/avaliacao/ModalCriarCiclo'
import ModalAvaliacao from '@/components/avaliacao/ModalAvaliacao'
import ModalNineBox from '@/components/avaliacao/ModalNineBox'
import ModalMontarAvaliacoes, { type LinhaMontagem, type OpcaoAvaliador, type ParPares } from '@/components/avaliacao/ModalMontarAvaliacoes'
import ModalGerenciarLideres from '@/components/avaliacao/ModalGerenciarLideres'
import { cn, isEmpresaCTZ } from '@/lib/utils'
import { LayoutGrid, Plus, ChevronRight, Trash2, Users2, ArrowRightLeft, X, Crown, UserCheck } from 'lucide-react'
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
  observacoes_gerais: string | null
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
  observacoes_gerais: string | null
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
  lider_avaliacao?: boolean | null
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
  // Ver TODAS as avaliações da empresa (não só a sua, a que você avalia ou a
  // dos seus liderados) e excluir avaliação avulsa continuam exclusivos de
  // administrador — regra espelha a RLS (e_admin_do_ciclo só bate pra
  // permission_level = 'administrador' desde a migration 20260818; antes
  // disso líder também batia, e isso vazava a avaliação de todo mundo pra
  // qualquer líder, não só a de quem ele avalia). O "acompanhamento" do líder
  // sobre o ciclo inteiro fica pra uma etapa futura, com RLS própria.
  const [souAdministrador, setSouAdministrador] = useState(false)
  // Líder (funcionarios.lider_avaliacao, marcação manual do admin) NÃO cria
  // nem gerencia ciclo (isso virou admin-only — migration
  // 20260820_ciclo_avaliacao_admin_only) e também não monta mais a Avaliação
  // de Pares sozinho: ela agora é escolhida a dedo pelo administrador, junto
  // com a montagem da avaliação comum (dentro de ModalMontarAvaliacoes). O
  // que sobra pro líder é só ser candidato a avaliado/avaliador nesse sorteio
  // manual e, como qualquer um, ver/editar a avaliação onde ele é o próprio,
  // o avaliado ou foi designado avaliador (e_avaliador_designado, migration
  // 20260817) — por isso não entra mais em "toda empresa"/isAdmin, só usa a
  // visão de funcionário comum.
  const [souLider, setSouLider] = useState(false)
  // Criar ciclo é exclusivo de administrador (líder perdeu esse acesso —
  // migration 20260820_ciclo_avaliacao_admin_only).
  const [podeCriarCiclo, setPodeCriarCiclo] = useState(false)
  // Exceção pontual (ago/2026): só a conta do Igor Costa pode ter mais de 1
  // ciclo aberto ao mesmo tempo, pra não precisar excluir o ciclo que a
  // líder já tinha criado antes da criação de ciclo virar admin-only.
  // Espelha o trigger checar_ciclo_unico_aberto() (mesma migration), que já
  // libera isso no banco por e-mail — aqui é só pra não esconder o botão
  // "Novo Ciclo" da tela dele.
  const [podeIgnorarLimiteCiclo, setPodeIgnorarLimiteCiclo] = useState(false)
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
    lideres: Funcionario[]
    paresExistentes: ParPares[]
    confirmando: boolean
    erro: string | null
  }>({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], lideres: [], paresExistentes: [], confirmando: false, erro: null })
  const [modalLideres, setModalLideres] = useState<{
    open: boolean
    abrindo: boolean
    funcionarios: Funcionario[]
    salvando: boolean
    erro: string | null
  }>({ open: false, abrindo: false, funcionarios: [], salvando: false, erro: null })

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
    const lista = (data ?? []) as unknown as Funcionario[]
    setFuncionarios(lista)
    return lista
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
          .select('id, full_name, cargo, lider_avaliacao')
          .eq('user_id', user.id)
          .eq('client_id', empresa!.id)
          .single(),
      ])

      // 'administrador' e calibradores avulsos (is_calibrador) enxergam TODOS os
      // funcionários da empresa; um gestor comum (sem nenhuma das marcações)
      // só vê e avalia seus próprios liderados.
      const permission = roleRes.data?.permission_level
      const administrador = permission === 'administrador'
      const calibrador = roleRes.data?.is_calibrador === true
      const meuFunc = funcRes.data as Funcionario | null
      if (meuFunc) setMeuFuncionario(meuFunc)

      // "Líder" não é mais adivinhado por cargo/organograma — é uma marcação
      // manual (funcionarios.lider_avaliacao) que o administrador liga pra
      // quem realmente participa da Avaliação de Pares (como candidato a
      // avaliado/avaliador, escolhido à mão pelo admin na montagem do ciclo).
      // Líder não tem mais nenhuma ação de gestão do ciclo (isso virou
      // admin-only) nem visão "empresa toda" — pra ele o módulo é igual ao de
      // qualquer funcionário comum: autoavaliação + "Devo Avaliar".
      const souLiderAtual = meuFunc?.lider_avaliacao === true
      const todaEmpresa = administrador || calibrador
      const admin = administrador || calibrador

      setIsAdmin(admin)
      setSouAdministrador(administrador)
      setSouLider(souLiderAtual)
      setPodeCriarCiclo(administrador)
      setPodeIgnorarLimiteCiclo(user.email?.toLowerCase() === 'igorecosta1@gmail.com')
      setVeTodaEmpresa(todaEmpresa)

      await fetchCiclos()
      if (todaEmpresa) {
        await fetchFuncionarios()
      } else if (meuFunc?.id) {
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
    if (!meuFuncionario) return
    // "Preciso Avaliar" (avaliação de pares/outras onde EU sou o avaliador
    // designado) vale pra qualquer um, inclusive líder/admin — um líder
    // participa do sorteio de pares como avaliador igual todo mundo, então
    // também precisa saber quem são exatamente os seus X sorteados, sem se
    // perder na visão geral de todos os pares da empresa.
    // "Minhas Avaliações" (autoavaliação/resultado) também precisa ser
    // buscada pra admin/líder: eles também podem ter uma avaliação "padrao"
    // própria (são avaliados por outra pessoa), e o card só de admin/líder
    // não mostrava — a visão de "ciclo expandido" abre tudo em modo gestor
    // (isAdmin=true), então nunca dava pra fazer a autoavaliação de verdade.
    fetchAvaliacoesParaAvaliar()
    fetchMinhasAvaliacoes()
  }, [meuFuncionario, fetchMinhasAvaliacoes, fetchAvaliacoesParaAvaliar])

  // "Ativar" (rascunho → ativo) e "Adicionar ao ciclo" (ativo, gente sem avaliação)
  // agora abrem a montagem em vez de criar avaliações às cegas: busca fresh quem já
  // tem avaliação NESTE ciclo (não dá pra confiar no estado `avaliacoes`, que é do
  // ciclo expandido no acordeão, que pode ser um ciclo diferente do que foi clicado).
  // Também busca fresh os líderes da empresa (pool da Avaliação de Pares) e
  // os pares (avaliado, avaliador) que já existem neste ciclo — pra montar
  // tudo (comum + pares) num modal só.
  async function abrirMontagem(ciclo: Ciclo, ativarAoConfirmar: boolean) {
    setErro('')
    if (!empresa) return
    const supabase = createClient()
    const [{ data: existentes, error: erroExistentes }, { data: lideresData, error: erroLideres }, { data: paresData, error: erroPares }] = await Promise.all([
      supabase.from('avaliacoes').select('funcionario_id').eq('ciclo_id', ciclo.id).eq('tipo', 'padrao'),
      supabase.from('funcionarios').select('id, full_name, cargo').eq('client_id', empresa.id).eq('status', 'Ativo').eq('lider_avaliacao', true).order('full_name'),
      supabase.from('avaliacoes').select('funcionario_id, avaliador_id').eq('ciclo_id', ciclo.id).eq('tipo', 'pares'),
    ])
    const error = erroExistentes || erroLideres || erroPares
    if (error) {
      setErro(error.message)
      return
    }
    const jaTem = new Set((existentes ?? []).map((a) => a.funcionario_id))
    const alvo = funcionarios.filter((f) => !jaTem.has(f.id))
    const paresExistentes = (paresData ?? []).map((p) => ({ funcionario_id: p.funcionario_id, avaliador_id: p.avaliador_id as string })).filter((p) => !!p.avaliador_id)
    setModalMontar({
      open: true,
      ciclo,
      ativarAoConfirmar,
      funcionariosAlvo: alvo,
      lideres: (lideresData ?? []) as unknown as Funcionario[],
      paresExistentes,
      confirmando: false,
      erro: null,
    })
  }

  async function handleConfirmarMontagem(linhas: LinhaMontagem[], pares: ParPares[]) {
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

    // Avaliação de pares: sem vertical (só Alinhamento Cultural) e sem
    // autoavaliação — funcionario_id é só quem RECEBE a nota do colega.
    if (pares.length > 0) {
      const resultadosPares = await Promise.all(
        pares.map((p) => createAvaliacao({ ciclo_id: ciclo.id, funcionario_id: p.funcionario_id, avaliador_id: p.avaliador_id, tipo: 'pares' }))
      )
      const erroPares = resultadosPares.find((r) => r.error)?.error
      if (erroPares) {
        setModalMontar((prev) => ({ ...prev, confirmando: false, erro: erroPares.message }))
        return
      }
    }

    setModalMontar({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], lideres: [], paresExistentes: [], confirmando: false, erro: null })
    fetchCiclos()
    if (cicloAtivo?.id === ciclo.id) fetchAvaliacoes()
    fetchAvaliacoesParaAvaliar()
  }

  // Lista TODOS os funcionários (marcados ou não) pra tela de gerenciar quem
  // conta como líder — decisão manual do administrador, não mais heurística.
  async function abrirModalGerenciarLideres() {
    setErro('')
    if (!empresa) return
    setModalLideres((prev) => ({ ...prev, abrindo: true }))
    const supabase = createClient()
    const { data, error } = await supabase
      .from('funcionarios')
      .select('id, full_name, cargo, lider_avaliacao')
      .eq('client_id', empresa.id)
      .eq('status', 'Ativo')
      .order('full_name')
    if (error) {
      setErro(error.message)
      setModalLideres((prev) => ({ ...prev, abrindo: false }))
      return
    }
    setModalLideres({
      open: true,
      abrindo: false,
      funcionarios: (data ?? []) as unknown as Funcionario[],
      salvando: false,
      erro: null,
    })
  }

  async function handleSalvarLideres(selecionados: Record<string, boolean>) {
    setModalLideres((prev) => ({ ...prev, salvando: true, erro: null }))
    const supabase = createClient()

    const alteracoes = modalLideres.funcionarios.filter(
      (f) => !!f.lider_avaliacao !== !!selecionados[f.id]
    )
    if (alteracoes.length > 0) {
      const resultados = await Promise.all(
        alteracoes.map((f) =>
          supabase.from('funcionarios').update({ lider_avaliacao: !!selecionados[f.id] }).eq('id', f.id)
        )
      )
      const erroSalvar = resultados.find((r) => r.error)?.error
      if (erroSalvar) {
        setModalLideres((prev) => ({ ...prev, salvando: false, erro: erroSalvar.message }))
        return
      }
    }

    // Se eu mesmo estiver na lista, meu próprio status de líder pode ter mudado —
    // atualiza na hora pra sidebar/botões refletirem sem precisar recarregar.
    if (meuFuncionario && selecionados[meuFuncionario.id] !== undefined) {
      const novoSouLider = selecionados[meuFuncionario.id]
      setSouLider(novoSouLider)
      setMeuFuncionario({ ...meuFuncionario, lider_avaliacao: novoSouLider })
    }

    setModalLideres({ open: false, abrindo: false, funcionarios: [], salvando: false, erro: null })
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
    // O ON DELETE CASCADE já apaga as avaliações desse ciclo no banco, mas o
    // estado local ("Preciso Avaliar", "Minhas Avaliações") não se atualiza
    // sozinho — sem isso, quem tinha avaliação nesse ciclo continuava vendo
    // ela na tela até dar F5.
    fetchAvaliacoesParaAvaliar()
    fetchMinhasAvaliacoes()
  }

  function abrirAvaliacao(avaliacao: Avaliacao, cicloNome: string) {
    setModalAvaliacao({ open: true, avaliacao, cicloNome, papelAvaliador: true })
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
        observacoes_gerais: avaliacao.observacoes_gerais,
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
        observacoes_gerais: avaliacao.observacoes_gerais,
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

  // Só pode existir 1 ciclo em aberto (rascunho ou ativo) por vez — evita criar
  // vários e confundir quem está avaliando em qual. Ciclos encerrados não contam:
  // uma vez fechado, dá pra abrir o próximo normalmente. Exceção: a conta do
  // Igor Costa ignora essa trava (podeIgnorarLimiteCiclo) — ver o trigger
  // checar_ciclo_unico_aberto() no banco.
  const existeCicloEmAberto = ciclos.some((c) => c.status !== 'encerrado')

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

  // "Preciso Avaliar" — avaliações (de pares ou não) onde EU sou o avaliador
  // designado. Reaproveitada tanto na view de funcionário comum quanto na de
  // admin/líder: um líder participa do sorteio de pares como avaliador igual
  // todo mundo, e sem isso ele só via a lista geral com os pares de TODOS os
  // líderes dentro do ciclo (via "Avaliações"), o que dava a impressão de que
  // o sorteio não estava limitando a quantidade — a quantidade já estava
  // certa, só não tinha um recorte "isso aqui é seu" pra ele.
  const precisoAvaliarSection = avaliacoesParaAvaliar.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Devo Avaliar ({avaliacoesParaAvaliar.length})
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
              {/* Indicador visual pedido: quem vai ser avaliado numa Avaliação de
                  Pares (tipo === 'pares', montada à mão pelo admin junto com o
                  ciclo) aparece com essa tag, pra diferenciar de uma avaliação
                  comum dentro da mesma lista "Devo Avaliar". */}
              {av.tipo === 'pares' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                  Avaliação de Pares
                </span>
              )}
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
  )

  // getMinhasAvaliacoes traz TODAS as avaliações onde eu sou o avaliado,
  // inclusive as "pares" em que um colega me avaliou — mas essas nunca
  // aparecem pra mim (pedido: cada usuário só vê as notas que dá, nunca as
  // que recebe — sem exceção, nem depois de qualquer etapa). Mesmo sem
  // mostrar nota nenhuma, o simples fato de aparecer na lista já vazaria
  // "alguém te avaliou e isso está pendente/concluído", então a linha inteira
  // fica de fora, não só a nota.
  const minhasAvaliacoesVisiveis = minhasAvaliacoes.filter((av) => av.tipo !== 'pares')

  // Recorte "sobre mim" também pra admin/líder: eles montam/gerenciam o ciclo,
  // mas também podem ter uma avaliação "padrao" própria (avaliados por outra
  // pessoa) — sem esse card, a única forma de achar a própria avaliação era
  // vasculhar a lista geral do ciclo expandido, que abre tudo em modo gestor
  // (isAdmin=true) e nunca deixava preencher a autoavaliação de verdade.
  const minhasAvaliacoesSection = minhasAvaliacoesVisiveis.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Minha Auto-Avaliação ({minhasAvaliacoesVisiveis.length})
        </p>
      </div>
      {minhasAvaliacoesVisiveis.map((av) => (
        <div
          key={av.id}
          className="bg-card border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{av.ciclo?.nome}</p>
              {av.tipo === 'pares' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                  Avaliação de Pares
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', avalStatusColor[av.status] ?? 'bg-muted text-muted-foreground')}>
                {avalStatusLabel[av.status] ?? av.status}
              </span>
            </div>
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
  )

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

        {minhasAvaliacoesVisiveis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma avaliação disponível no momento.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde o administrador iniciar um ciclo de avaliação.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Minha Auto-Avaliação ({minhasAvaliacoesVisiveis.length})
              </p>
            </div>
            {minhasAvaliacoesVisiveis.map((av) => (
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
                  {/* Nota do gestor/calibragem e resultado final NUNCA aparecem aqui —
                      cada usuário só vê a nota que dá, nunca a que recebe. */}
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

        {precisoAvaliarSection}

        <ModalAvaliacao
          open={modalAvaliacao.open}
          avaliacao={modalAvaliacao.avaliacao as Avaliacao}
          cicloNome={modalAvaliacao.cicloNome}
          isAdmin={modalAvaliacao.papelAvaliador}
          souAdministrador={souAdministrador}
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
        <div className="flex items-center gap-2">
        {souAdministrador && (
          <button
            onClick={abrirModalGerenciarLideres}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Crown className="w-4 h-4 text-amber-600" />
            Gerenciar Líderes
          </button>
        )}
        {podeCriarCiclo && (
          existeCicloEmAberto && !podeIgnorarLimiteCiclo ? (
            <p
              className="text-xs text-muted-foreground max-w-[220px] text-right"
              title="Só dá pra ter 1 ciclo em rascunho/ativo por vez — encerre o atual pra liberar a criação de outro."
            >
              Encerre o ciclo atual pra criar um novo
            </p>
          ) : (
            <button
              onClick={() => setModalCriarCiclo(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Ciclo
            </button>
          )
        )}
        </div>
      </div>

      {erro && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {erro}
        </p>
      )}

      {/* Recorte pessoal: só as avaliações que ESTE líder/admin foi sorteado pra
          fazer, separado da visão geral do ciclo (que mostra os pares de todo
          mundo) logo abaixo — e a própria autoavaliação dele, que também some
          na visão geral (lá tudo abre em modo gestor). */}
      {minhasAvaliacoesSection}
      {precisoAvaliarSection}

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
                      {souAdministrador && ciclo.status === 'ativo' && funcionariosSemAvaliacao.length > 0 && (
                        <button
                          onClick={() => abrirMontagem(ciclo, false)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-foreground"
                        >
                          <Users2 className="w-3.5 h-3.5" />
                          Adicionar ao ciclo
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
                        {souAdministrador && ciclo.status === 'ativo' && (
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
        isAdmin={modalAvaliacao.papelAvaliador}
        souAdministrador={souAdministrador}
        onClose={() => setModalAvaliacao({ open: false, avaliacao: null, cicloNome: '', papelAvaliador: false })}
        onSave={() => {
          fetchAvaliacoes()
          fetchMinhasAvaliacoes()
          fetchAvaliacoesParaAvaliar()
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
        lideres={modalMontar.lideres}
        paresExistentes={modalMontar.paresExistentes}
        acaoLabel={modalMontar.ativarAoConfirmar ? 'Confirmar e ativar ciclo' : 'Adicionar ao ciclo'}
        confirmando={modalMontar.confirmando}
        erro={modalMontar.erro}
        onClose={() => setModalMontar({ open: false, ciclo: null, ativarAoConfirmar: false, funcionariosAlvo: [], lideres: [], paresExistentes: [], confirmando: false, erro: null })}
        onConfirmar={handleConfirmarMontagem}
      />

      <ModalGerenciarLideres
        open={modalLideres.open}
        funcionarios={modalLideres.funcionarios}
        salvando={modalLideres.salvando}
        erro={modalLideres.erro}
        onClose={() => setModalLideres({ open: false, abrindo: false, funcionarios: [], salvando: false, erro: null })}
        onSalvar={handleSalvarLideres}
      />
    </div>
  )
}
