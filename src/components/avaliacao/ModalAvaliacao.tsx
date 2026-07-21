'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getAvaliacaoCultural,
  getAvaliacaoTecnica,
  getPdiItems,
  upsertAvaliacaoCultural,
  upsertAvaliacaoTecnica,
  updateAvaliacao,
  createPdiItem,
  deletePdiItem,
} from '@/lib/queries/avaliacao'
import { Trash2, Plus } from 'lucide-react'

// ── Constantes CTZ ─────────────────────────────────────────────────────────

export const PILARES_CULTURAIS = [
  {
    numero: 1,
    titulo: 'Excelência e Eficiência na Execução',
    como_se_vive:
      'Entrega no prazo, sem desculpas para justificar falhas. Garante a qualidade do trabalho e dos projetos. Previne retrabalhos e custos desnecessários.',
    como_nao_se_vive: 'Ser desorganizado, pular etapas de processo ou comprometer prazos.',
  },
  {
    numero: 2,
    titulo: 'Protagonismo com Autonomia Responsável',
    como_se_vive:
      'Assume responsabilidades e resolve problemas (mesmo fora da sua área). Busca ativamente o autodesenvolvimento.',
    como_nao_se_vive:
      'Terceirizar culpa ("não é meu papel"), atuar de forma passiva ou indisciplinada.',
  },
  {
    numero: 3,
    titulo: 'Ecossistema e Sucesso Compartilhado',
    como_se_vive:
      'Trabalha de forma integrada entre as áreas e verticais. Atende de forma empática a dores dos parceiros e clientes. Celebra com postura positiva e gratidão.',
    como_nao_se_vive:
      'Atuar em silos, reter informações, gerar fofocas ou peso desnecessário no ambiente.',
  },
  {
    numero: 4,
    titulo: 'Transparência e Governança',
    como_se_vive:
      'Alimenta dados com integridade. Antecipa riscos com clareza operacional. Comunica-se com lealdade, franqueza e reporte.',
    como_nao_se_vive:
      'Mascarar atrasos/dados, tomar decisões sem dados, ou agir de má-fé.',
  },
]

export const VERTICAIS_CTZ: Record<
  string,
  { label: string; criterios: { key: string; label: string; descricao: string }[] }
> = {
  loteadora: {
    label: 'Loteadora (Loteamentos)',
    criterios: [
      {
        key: 'lot_cronograma',
        label: 'Cronograma Físico vs. Financeiro',
        descricao: 'Conformidade de execução das obras nos prazos planejados.',
      },
      {
        key: 'lot_vendas',
        label: 'Desempenho Comercial de Vendas',
        descricao: 'Atingimento das metas de lotes vendidos, observando o percentual de permuta acordado.',
      },
      {
        key: 'lot_lancamento',
        label: 'Ativação do Relacionamento e Lançamento',
        descricao: 'Coordenação de fornecedores, modelagem técnica e velocidade de liquidez inicial.',
      },
    ],
  },
  concretize: {
    label: 'Concretize',
    criterios: [
      {
        key: 'con_engenharia',
        label: 'Eficiência de Engenharia',
        descricao: 'Execução sem retrabalhos e desenvolvimento de projetos executivos.',
      },
      {
        key: 'con_faturamento',
        label: 'Previsibilidade de Faturamento',
        descricao: 'Garantia da linha de faturamento contratado e projetado para os próximos 90 dias.',
      },
      {
        key: 'con_relacionamento',
        label: 'Relacionamento Ativo (ABM) e Novos Clientes',
        descricao: 'Manutenção ativa das visitas de captação e ampliação de clientes estratégicos.',
      },
    ],
  },
  novos_negocios: {
    label: 'Novos Negócios',
    criterios: [
      {
        key: 'nn_funil',
        label: 'Gestão do Funil de Captação',
        descricao: 'Manutenção do landbank abastecido com planejamento semanal e mensal de novos terrenos.',
      },
      {
        key: 'nn_contratos',
        label: 'Fechamento de Contratos de Compra/Parceria',
        descricao: 'Consecução de contratos assinados de áreas com alta viabilidade.',
      },
      {
        key: 'nn_rede',
        label: 'Relacionamento de Rede',
        descricao: 'Captação ativa com os melhores corretores de cada cidade estratégica de atuação.',
      },
    ],
  },
  investimentos: {
    label: 'Investimentos',
    criterios: [
      {
        key: 'inv_captacao',
        label: 'Atração e Captação de Recursos',
        descricao: 'Captação de aportes financeiros para viabilizar lançamentos próprios e parcerias.',
      },
      {
        key: 'inv_report',
        label: 'Régua de Relacionamento e Prestação de Contas',
        descricao: 'Execução dos ritos de report mensal detalhado sobre o andamento físico e financeiro.',
      },
    ],
  },
  csc_financeiro: {
    label: 'CSC / Financeiro',
    criterios: [
      {
        key: 'csc_fluxo',
        label: 'Previsibilidade e Fluxo de Caixa',
        descricao: 'Assertividade da previsão financeira (projetado vs. realizado), controle do orçamento anual.',
      },
      {
        key: 'csc_emissoes',
        label: 'Agilidade nas Emissões e Cobranças',
        descricao: 'Faturamento ágil via emissão sistematizada de notas e cobrança automatizada.',
      },
      {
        key: 'csc_relatorio',
        label: 'Relatório de Suporte de Decisões',
        descricao: 'Fornecimento tempestivo dos demonstrativos de resultados para a diretoria.',
      },
    ],
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function calcMedia(values: (number | null)[]): number | null {
  const validos = values.filter((v): v is number => v !== null)
  if (!validos.length) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

function notaLabel(nota: number) {
  if (nota === 1) return 'Insatisfatório'
  if (nota === 2) return 'Precisa Melhorar'
  if (nota === 3) return 'Regular'
  if (nota === 4) return 'Bom'
  return 'Excelente'
}

// ── ScoreButton ──────────────────────────────────────────────────────────────

function ScoreButton({
  value,
  selected,
  onClick,
  disabled,
}: {
  value: 1 | 2 | 3 | 4 | 5
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const base = 'w-8 h-8 rounded text-xs font-bold transition-colors border'
  const colors: Record<number, string> = {
    1: selected
      ? 'bg-red-500 text-white border-red-500'
      : 'bg-background text-red-600 border-red-200 hover:bg-red-50',
    2: selected
      ? 'bg-orange-500 text-white border-orange-500'
      : 'bg-background text-orange-600 border-orange-200 hover:bg-orange-50',
    3: selected
      ? 'bg-yellow-500 text-white border-yellow-500'
      : 'bg-background text-yellow-700 border-yellow-200 hover:bg-yellow-50',
    4: selected
      ? 'bg-lime-600 text-white border-lime-600'
      : 'bg-background text-lime-700 border-lime-200 hover:bg-lime-50',
    5: selected
      ? 'bg-green-600 text-white border-green-600'
      : 'bg-background text-green-700 border-green-200 hover:bg-green-50',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={notaLabel(value)}
      className={cn(base, colors[value], disabled && 'opacity-40 cursor-not-allowed')}
    >
      {value}
    </button>
  )
}

// ── Tipos ────────────────────────────────────────────────────────────────────

type ScoreEntry = { auto: number | null; gestor: number | null; calibragem: number | null }
type ScoresC = Record<string, ScoreEntry>
type ScoresT = Record<string, ScoreEntry & { observacoes: string }>

interface PdiItem {
  id: string
  acao: string
  indicador_sucesso: string | null
  prazo: string | null
  suporte_necessario: string | null
}

interface Avaliacao {
  id: string
  status: string
  vertical: string | null
  revelado?: boolean
  evidencias_culturais: string | null
  observacoes_gerais: string | null
  media_cultural_auto: number | null
  media_cultural_gestor: number | null
  media_cultural_calibragem: number | null
  media_tecnica_auto: number | null
  media_tecnica_gestor: number | null
  media_tecnica_calibragem: number | null
  funcionario?: { full_name: string; cargo?: string | null } | null
  avaliador?: { full_name: string } | null
}

interface Props {
  open: boolean
  avaliacao: Avaliacao | null
  cicloNome: string
  isAdmin: boolean
  onClose: () => void
  onSave: () => void
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ModalAvaliacao({ open, avaliacao, cicloNome, isAdmin, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'cultural' | 'tecnica' | 'pdi'>('cultural')
  const [vertical, setVertical] = useState('')
  const [evidencias, setEvidencias] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [revelado, setRevelado] = useState(false)
  const [scoresC, setScoresC] = useState<ScoresC>({
    '1': { auto: null, gestor: null, calibragem: null },
    '2': { auto: null, gestor: null, calibragem: null },
    '3': { auto: null, gestor: null, calibragem: null },
    '4': { auto: null, gestor: null, calibragem: null },
  })
  const [scoresT, setScoresT] = useState<ScoresT>({})
  const [pdiItems, setPdiItems] = useState<PdiItem[]>([])
  const [newPdi, setNewPdi] = useState({ acao: '', indicador_sucesso: '', prazo: '', suporte_necessario: '' })
  const [showNewPdi, setShowNewPdi] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open && avaliacao) {
      setVertical(avaliacao.vertical ?? '')
      setEvidencias(avaliacao.evidencias_culturais ?? '')
      setObservacoes(avaliacao.observacoes_gerais ?? '')
      setRevelado(avaliacao.revelado ?? false)
      setActiveTab('cultural')
      setErro('')
      loadData(avaliacao.id)
    }
  }, [open, avaliacao?.id])

  async function loadData(avaliacaoId: string) {
    setLoading(true)
    const [cultural, tecnica, pdi] = await Promise.all([
      getAvaliacaoCultural(avaliacaoId),
      getAvaliacaoTecnica(avaliacaoId),
      getPdiItems(avaliacaoId),
    ])

    const newScoresC: ScoresC = {
      '1': { auto: null, gestor: null, calibragem: null },
      '2': { auto: null, gestor: null, calibragem: null },
      '3': { auto: null, gestor: null, calibragem: null },
      '4': { auto: null, gestor: null, calibragem: null },
    }
    cultural.data?.forEach((row) => {
      newScoresC[String(row.pilar)] = { auto: row.nota_auto, gestor: row.nota_gestor, calibragem: row.nota_calibragem }
    })
    setScoresC(newScoresC)

    const newScoresT: ScoresT = {}
    tecnica.data?.forEach((row) => {
      newScoresT[row.criterio_key] = {
        auto: row.nota_auto,
        gestor: row.nota_gestor,
        calibragem: row.nota_calibragem,
        observacoes: row.observacoes ?? '',
      }
    })
    setScoresT(newScoresT)

    setPdiItems((pdi.data ?? []) as PdiItem[])
    setLoading(false)
  }

  function validarCampos(): string[] {
    const faltando: string[] = []

    const pilaresFaltando = [1, 2, 3, 4].some((p) =>
      isAdmin ? scoresC[String(p)]?.gestor == null : scoresC[String(p)]?.auto == null
    )
    if (pilaresFaltando) {
      faltando.push(
        isAdmin
          ? 'nota do gestor em todos os pilares culturais'
          : 'nota de autoavaliação em todos os pilares culturais'
      )
    }

    if (!isAdmin && !evidencias.trim()) {
      faltando.push('evidências e exemplos práticos')
    }
    if (isAdmin && !observacoes.trim()) {
      faltando.push('observações do gestor')
    }

    if (!vertical) {
      faltando.push('vertical de atuação')
    }

    const criteriosAtuais = vertical ? (VERTICAIS_CTZ[vertical]?.criterios ?? []) : []
    if (criteriosAtuais.length) {
      const criteriosFaltando = criteriosAtuais.some((c) =>
        isAdmin ? scoresT[c.key]?.gestor == null : scoresT[c.key]?.auto == null
      )
      if (criteriosFaltando) {
        faltando.push(
          isAdmin
            ? 'nota do gestor em todos os critérios técnicos'
            : 'nota de autoavaliação em todos os critérios técnicos'
        )
      }
    }

    const emEtapaCalibragem = avaliacao ? ['calibragem', 'finalizada'].includes(avaliacao.status) : false
    if (isAdmin && emEtapaCalibragem) {
      const pilaresCalibragemFaltando = [1, 2, 3, 4].some((p) => scoresC[String(p)]?.calibragem == null)
      if (pilaresCalibragemFaltando) {
        faltando.push('nota de calibragem em todos os pilares culturais')
      }
      if (criteriosAtuais.length) {
        const criteriosCalibragemFaltando = criteriosAtuais.some((c) => scoresT[c.key]?.calibragem == null)
        if (criteriosCalibragemFaltando) {
          faltando.push('nota de calibragem em todos os critérios técnicos')
        }
      }
    }

    // PDI é opcional — só pode ser preenchido durante a etapa de Calibragem (ver gate na aba PDI)

    return faltando
  }

  async function persistirCampos(statusExtra?: string): Promise<boolean> {
    if (!avaliacao) return false

    const resultadosC = await Promise.all(
      [1, 2, 3, 4].map((pilar) =>
        upsertAvaliacaoCultural(
          avaliacao.id,
          pilar,
          scoresC[String(pilar)]?.auto ?? null,
          scoresC[String(pilar)]?.gestor ?? null,
          scoresC[String(pilar)]?.calibragem ?? null
        )
      )
    )
    const erroC = resultadosC.find((r) => r.error)?.error
    if (erroC) {
      setErro(erroC.message)
      return false
    }

    const criterios = vertical ? (VERTICAIS_CTZ[vertical]?.criterios ?? []) : []
    if (criterios.length) {
      const resultadosT = await Promise.all(
        criterios.map((c) =>
          upsertAvaliacaoTecnica(
            avaliacao.id,
            c.key,
            scoresT[c.key]?.auto ?? null,
            scoresT[c.key]?.gestor ?? null,
            scoresT[c.key]?.calibragem ?? null,
            scoresT[c.key]?.observacoes || null
          )
        )
      )
      const erroT = resultadosT.find((r) => r.error)?.error
      if (erroT) {
        setErro(erroT.message)
        return false
      }
    }

    const cAuto = calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.auto ?? null))
    const cGestor = calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.gestor ?? null))
    const cCalibragem = calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.calibragem ?? null))
    const tAuto = calcMedia(criterios.map((c) => scoresT[c.key]?.auto ?? null))
    const tGestor = calcMedia(criterios.map((c) => scoresT[c.key]?.gestor ?? null))
    const tCalibragem = calcMedia(criterios.map((c) => scoresT[c.key]?.calibragem ?? null))

    const { error: erroUpdate } = await updateAvaliacao(avaliacao.id, {
      vertical: vertical || null,
      revelado,
      evidencias_culturais: evidencias || null,
      observacoes_gerais: observacoes || null,
      media_cultural_auto: cAuto,
      media_cultural_gestor: cGestor,
      media_cultural_calibragem: cCalibragem,
      media_tecnica_auto: tAuto,
      media_tecnica_gestor: tGestor,
      media_tecnica_calibragem: tCalibragem,
      ...(statusExtra ? { status: statusExtra } : {}),
    })

    if (erroUpdate) {
      setErro(erroUpdate.message)
      return false
    }
    return true
  }

  async function handleSave() {
    if (!avaliacao) return

    const camposFaltando = validarCampos()
    if (camposFaltando.length) {
      setErro(`Preencha antes de salvar: ${camposFaltando.join('; ')}.`)
      return
    }

    setSaving(true)
    setErro('')
    const ok = await persistirCampos()
    setSaving(false)
    if (ok) onSave()
  }

  async function handleAvancarStatus() {
    if (!avaliacao) return
    const proximo: Record<string, string> = {
      pendente: 'auto_concluida',
      auto_concluida: 'gestor_concluida',
      gestor_concluida: 'calibragem',
      calibragem: 'finalizada',
    }
    const next = proximo[avaliacao.status]
    if (!next) return

    const camposFaltando = validarCampos()
    if (camposFaltando.length) {
      setErro(`Preencha e salve antes de avançar de etapa: ${camposFaltando.join('; ')}.`)
      return
    }

    setSaving(true)
    setErro('')
    const ok = await persistirCampos(next)
    setSaving(false)
    if (ok) onSave()
  }

  async function handleAddPdi(e: React.FormEvent) {
    e.preventDefault()
    if (!avaliacao || !newPdi.acao.trim()) return
    setErro('')
    const { data, error } = await createPdiItem({
      avaliacao_id: avaliacao.id,
      acao: newPdi.acao.trim(),
      indicador_sucesso: newPdi.indicador_sucesso || undefined,
      prazo: newPdi.prazo || undefined,
      suporte_necessario: newPdi.suporte_necessario || undefined,
    })
    if (error) {
      setErro(error.message)
      return
    }
    if (data) setPdiItems((prev) => [...prev, data as PdiItem])
    setNewPdi({ acao: '', indicador_sucesso: '', prazo: '', suporte_necessario: '' })
    setShowNewPdi(false)
  }

  async function handleDeletePdi(id: string) {
    setErro('')
    const { error } = await deletePdiItem(id)
    if (error) {
      setErro(error.message)
      return
    }
    setPdiItems((prev) => prev.filter((p) => p.id !== id))
  }

  function setScoreC(pilar: number, tipo: 'auto' | 'gestor' | 'calibragem', valor: number) {
    setScoresC((prev) => ({
      ...prev,
      [String(pilar)]: { ...prev[String(pilar)], [tipo]: valor },
    }))
  }

  function setScoreT(key: string, tipo: 'auto' | 'gestor' | 'calibragem', valor: number) {
    setScoresT((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { auto: null, gestor: null, calibragem: null, observacoes: '' }), [tipo]: valor },
    }))
  }

  if (!open || !avaliacao) return null

  const criterios = vertical ? (VERTICAIS_CTZ[vertical]?.criterios ?? []) : []
  const statusLabel: Record<string, string> = {
    pendente: 'Pendente',
    auto_concluida: 'Autoavaliação Concluída',
    gestor_concluida: 'Avaliação do Gestor Concluída',
    calibragem: 'Em Calibragem',
    finalizada: 'Finalizada',
  }
  const statusColor: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-700',
    auto_concluida: 'bg-blue-100 text-blue-700',
    gestor_concluida: 'bg-purple-100 text-purple-700',
    calibragem: 'bg-orange-100 text-orange-700',
    finalizada: 'bg-green-100 text-green-700',
  }

  const proximoStatusLabel: Record<string, string> = {
    pendente: 'Concluir Autoavaliação',
    auto_concluida: 'Concluir Avaliação do Gestor',
    gestor_concluida: 'Iniciar Calibragem',
    calibragem: 'Finalizar',
  }

  const podeAvancarStatus =
    (!isAdmin && avaliacao.status === 'pendente') ||
    (isAdmin && ['auto_concluida', 'gestor_concluida', 'calibragem'].includes(avaliacao.status))

  const podeEditarPdi = ['calibragem', 'finalizada'].includes(avaliacao.status)

  // Gestor só vê a autoavaliação do colaborador a partir da Calibragem (antes disso avalia às cegas).
  const gestorVeAuto = isAdmin && ['calibragem', 'finalizada'].includes(avaliacao.status)
  // Colaborador só vê a nota do gestor/calibragem e o resultado final depois que o gestor marcar "revelar".
  const colaboradorVeGestor = !isAdmin && revelado
  const podeRevelar = isAdmin && ['calibragem', 'finalizada'].includes(avaliacao.status)
  const podeVerMedias = isAdmin || revelado

  const notaFinalCultural = avaliacao.media_cultural_calibragem ?? avaliacao.media_cultural_gestor
  const notaFinalTecnica = avaliacao.media_tecnica_calibragem ?? avaliacao.media_tecnica_gestor
  const percentualFinal =
    notaFinalCultural !== null && notaFinalTecnica !== null
      ? Math.round(((notaFinalCultural + notaFinalTecnica) / 2 / 5) * 100)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground">{cicloNome}</p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">
              {avaliacao.funcionario?.full_name ?? 'Colaborador'}
            </h2>
            {avaliacao.funcionario?.cargo && (
              <p className="text-xs text-muted-foreground">{avaliacao.funcionario.cargo}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColor[avaliacao.status] ?? 'bg-muted text-muted-foreground')}>
              {statusLabel[avaliacao.status] ?? avaliacao.status}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-1">
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 px-5">
          {(['cultural', 'tecnica', 'pdi'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-2.5 px-4 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'cultural' && 'Alinhamento Cultural (50%)'}
              {tab === 'tecnica' && 'Performance Técnica (50%)'}
              {tab === 'pdi' && 'PDI'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Tab Cultural */}
              {activeTab === 'cultural' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Avalie os 4 pilares fundamentais da cultura. Use a escala: 1 — Insatisfatório · 2 — Precisa Melhorar · 3 — Regular · 4 — Bom · 5 — Excelente
                  </p>
                  {PILARES_CULTURAIS.map((pilar) => {
                    const score = scoresC[String(pilar.numero)]
                    return (
                      <div key={pilar.numero} className="border border-border rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {pilar.numero}. {pilar.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium text-green-600">Como se vive:</span> {pilar.como_se_vive}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium text-red-500">Como não se vive:</span> {pilar.como_nao_se_vive}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Auto</p>
                            {isAdmin && !gestorVeAuto ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a Calibragem</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.auto === v}
                                    onClick={() => setScoreC(pilar.numero, 'auto', v)}
                                    disabled={isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Gestor</p>
                            {!isAdmin && !colaboradorVeGestor ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a revelação</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.gestor === v}
                                    onClick={() => setScoreC(pilar.numero, 'gestor', v)}
                                    disabled={!isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Calibragem</p>
                            {!isAdmin && !colaboradorVeGestor ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a revelação</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.calibragem === v}
                                    onClick={() => setScoreC(pilar.numero, 'calibragem', v)}
                                    disabled={!isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Evidências e Exemplos Práticos {!isAdmin && '*'}
                    </label>
                    {isAdmin && !gestorVeAuto ? (
                      <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
                        Oculto até a etapa de Calibragem.
                      </p>
                    ) : (
                      <textarea
                        value={evidencias}
                        onChange={(e) => setEvidencias(e.target.value)}
                        rows={3}
                        disabled={isAdmin}
                        placeholder="Descreva exemplos concretos que justifiquem as notas..."
                        className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Observações do Gestor {isAdmin && '*'}
                    </label>
                    {!isAdmin && !colaboradorVeGestor ? (
                      <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
                        Oculto até a revelação da avaliação.
                      </p>
                    ) : (
                      <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        rows={3}
                        disabled={!isAdmin}
                        placeholder="Feedback geral sobre o alinhamento cultural..."
                        className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Tab Técnica */}
              {activeTab === 'tecnica' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground">Vertical de atuação *</label>
                    <select
                      value={vertical}
                      onChange={(e) => setVertical(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="">Selecione a vertical...</option>
                      {Object.entries(VERTICAIS_CTZ).map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  {!vertical && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Selecione a vertical para habilitar os critérios.
                    </p>
                  )}

                  {criterios.map((criterio) => {
                    const score = scoresT[criterio.key]
                    return (
                      <div key={criterio.key} className="border border-border rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{criterio.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{criterio.descricao}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Auto</p>
                            {isAdmin && !gestorVeAuto ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a Calibragem</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.auto === v}
                                    onClick={() => setScoreT(criterio.key, 'auto', v)}
                                    disabled={isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Gestor</p>
                            {!isAdmin && !colaboradorVeGestor ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a revelação</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.gestor === v}
                                    onClick={() => setScoreT(criterio.key, 'gestor', v)}
                                    disabled={!isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Calibragem</p>
                            {!isAdmin && !colaboradorVeGestor ? (
                              <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto até a revelação</p>
                            ) : (
                              <div className="flex gap-1">
                                {([1, 2, 3, 4, 5] as const).map((v) => (
                                  <ScoreButton
                                    key={v}
                                    value={v}
                                    selected={score?.calibragem === v}
                                    onClick={() => setScoreT(criterio.key, 'calibragem', v)}
                                    disabled={!isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Evidências e Exemplos Práticos</label>
                          {isAdmin && !gestorVeAuto ? (
                            <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-1.5">
                              Oculto até a Calibragem.
                            </p>
                          ) : !isAdmin && !colaboradorVeGestor ? (
                            <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-1.5">
                              Oculto até a revelação da avaliação.
                            </p>
                          ) : (
                            <input
                              type="text"
                              value={score?.observacoes ?? ''}
                              onChange={(e) =>
                                setScoresT((prev) => ({
                                  ...prev,
                                  [criterio.key]: {
                                    ...(prev[criterio.key] ?? { auto: null, gestor: null, calibragem: null, observacoes: '' }),
                                    observacoes: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Observações..."
                              className="mt-1 w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tab PDI */}
              {activeTab === 'pdi' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Plano de Desenvolvimento Individual (opcional) — defina até 3 ações concretas para os próximos 6 meses. Só pode ser preenchido na etapa de Calibragem.
                  </p>

                  {!podeEditarPdi && pdiItems.length === 0 && (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center">
                      <p className="text-sm text-muted-foreground">O PDI só pode ser preenchido durante a etapa de Calibragem.</p>
                    </div>
                  )}

                  {podeEditarPdi && pdiItems.length === 0 && !showNewPdi && (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma ação de desenvolvimento cadastrada.</p>
                    </div>
                  )}

                  {pdiItems.map((item, index) => (
                    <div key={item.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            <span className="text-muted-foreground mr-1">{index + 1}.</span> {item.acao}
                          </p>
                          {item.indicador_sucesso && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Indicador:</span> {item.indicador_sucesso}
                            </p>
                          )}
                          {item.prazo && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Prazo:</span>{' '}
                              {new Date(item.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          {item.suporte_necessario && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Suporte:</span> {item.suporte_necessario}
                            </p>
                          )}
                        </div>
                        {podeEditarPdi && (
                          <button
                            onClick={() => handleDeletePdi(item.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {podeEditarPdi && showNewPdi && (
                    <form onSubmit={handleAddPdi} className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
                      <p className="text-xs font-medium text-foreground">Nova ação de desenvolvimento</p>
                      <div>
                        <label className="text-xs text-muted-foreground">Ação / Desenvolvimento *</label>
                        <input
                          type="text"
                          value={newPdi.acao}
                          onChange={(e) => setNewPdi((p) => ({ ...p, acao: e.target.value }))}
                          required
                          placeholder="Ex: Melhorar gestão de prazos nas entregas..."
                          className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Indicador de sucesso</label>
                          <input
                            type="text"
                            value={newPdi.indicador_sucesso}
                            onChange={(e) => setNewPdi((p) => ({ ...p, indicador_sucesso: e.target.value }))}
                            placeholder="Como mediremos o sucesso?"
                            className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Prazo limite</label>
                          <input
                            type="date"
                            value={newPdi.prazo}
                            onChange={(e) => setNewPdi((p) => ({ ...p, prazo: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Suporte necessário</label>
                        <input
                          type="text"
                          value={newPdi.suporte_necessario}
                          onChange={(e) => setNewPdi((p) => ({ ...p, suporte_necessario: e.target.value }))}
                          placeholder="Líder / RH / Treinamento..."
                          className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewPdi(false)}
                          className="px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Adicionar
                        </button>
                      </div>
                    </form>
                  )}

                  {podeEditarPdi && !showNewPdi && pdiItems.length < 3 && (
                    <button
                      onClick={() => setShowNewPdi(true)}
                      className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar ação
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {erro && (
          <p className="mx-5 mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 shrink-0">
            {erro}
          </p>
        )}

        {/* Revelar avaliação ao colaborador */}
        {podeRevelar && (
          <label className="flex items-center gap-2 px-5 pt-3 text-xs text-muted-foreground shrink-0">
            <input
              type="checkbox"
              checked={revelado}
              onChange={(e) => setRevelado(e.target.checked)}
              className="rounded border-input"
            />
            Revelar avaliação ao colaborador
          </label>
        )}

        {/* Médias resumo */}
        {podeVerMedias &&
          (avaliacao.media_cultural_gestor !== null ||
            avaliacao.media_tecnica_gestor !== null ||
            avaliacao.media_cultural_calibragem !== null ||
            avaliacao.media_tecnica_calibragem !== null) && (
            <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-wrap gap-4 shrink-0">
              {avaliacao.media_cultural_gestor !== null && (
                <span className="text-xs text-muted-foreground">
                  Média Cultural (Gestor):{' '}
                  <strong className="text-foreground">{avaliacao.media_cultural_gestor.toFixed(1)}</strong>
                </span>
              )}
              {avaliacao.media_tecnica_gestor !== null && (
                <span className="text-xs text-muted-foreground">
                  Média Técnica (Gestor):{' '}
                  <strong className="text-foreground">{avaliacao.media_tecnica_gestor.toFixed(1)}</strong>
                </span>
              )}
              {avaliacao.media_cultural_calibragem !== null && (
                <span className="text-xs text-muted-foreground">
                  Média Cultural (Calibragem):{' '}
                  <strong className="text-foreground">{avaliacao.media_cultural_calibragem.toFixed(1)}</strong>
                </span>
              )}
              {avaliacao.media_tecnica_calibragem !== null && (
                <span className="text-xs text-muted-foreground">
                  Média Técnica (Calibragem):{' '}
                  <strong className="text-foreground">{avaliacao.media_tecnica_calibragem.toFixed(1)}</strong>
                </span>
              )}
              {percentualFinal !== null && (
                <span className="text-xs text-muted-foreground">
                  Resultado Final:{' '}
                  <strong className="text-foreground">{percentualFinal}%</strong>
                </span>
              )}
            </div>
          )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-5 border-t border-border shrink-0">
          <div>
            {podeAvancarStatus && (
              <button
                onClick={handleAvancarStatus}
                disabled={saving}
                className="px-4 py-2 border border-primary text-primary rounded-md text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-60"
              >
                {saving ? 'Salvando...' : proximoStatusLabel[avaliacao.status]}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
