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
  getVerticalPadrao,
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
  // A vertical Concretize foi dividida em duas equipes com metas próprias
  // (pedido de ago/2026): quem responde pro Felipe Marques (incluindo ele) fica na
  // Equipe Técnica; quem responde pro Felipe Ross (Laura, Jean, Luiz Gazeta) fica na
  // Equipe Comercial. Ver avaliacao/page.tsx → verticalDoFuncionario para o pré-preenchimento.
  concretize_tecnica: {
    label: 'Concretize — Equipe Técnica (Felipe Marques)',
    criterios: [
      {
        key: 'con_engenharia',
        label: 'Eficiência de Engenharia',
        descricao: 'Execução sem retrabalhos e desenvolvimento de projetos executivos.',
      },
      {
        key: 'con_faturamento',
        label: 'Previsibilidade de Faturamento',
        descricao: 'Garantia da linha de faturamento contratado e projetado para os próximos 90 dias da vertical.',
      },
      {
        key: 'con_relacionamento_cliente',
        label: 'Relacionamento com Cliente',
        descricao: 'Garantia de satisfação, com atendimento pontual e gestão para antecipação dos problemas.',
      },
    ],
  },
  concretize_comercial: {
    label: 'Concretize — Equipe Comercial (Felipe Ross)',
    criterios: [
      {
        key: 'con_com_engenharia',
        label: 'Eficiência de Engenharia',
        descricao: 'Execução sem retrabalhos e desenvolvimento de projetos executivos.',
      },
      {
        key: 'con_com_vendas',
        label: 'Previsibilidade de Vendas',
        descricao: 'Garantia da linha de vendas, com gestão eficiente do funil.',
      },
      {
        key: 'con_com_relacionamento',
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
  // Cargo distinto de csc_financeiro — critérios de apoio administrativo à
  // liderança, não financeiros. Baseado na trilha Júnior/Pleno/Senior da
  // planilha "Adm e Finanças" (referências/Pasta1.xlsx).
  secretaria_executiva: {
    label: 'Secretária Executiva',
    criterios: [
      {
        key: 'sec_agenda',
        label: 'Gestão de Agenda, Documentos e Prazos',
        descricao: 'Organização e controle de agendas, documentos e prazos administrativos, com autonomia crescente e apoio direto à liderança.',
      },
      {
        key: 'sec_eventos',
        label: 'Organização de Eventos',
        descricao: 'Planejamento e execução de eventos internos e corporativos, do apoio operacional ao planejamento completo.',
      },
      {
        key: 'sec_viagens',
        label: 'Logística de Viagens',
        descricao: 'Cotação, reserva e gestão de roteiros, custos e fornecedores para viagens da equipe e da liderança.',
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
  if (nota === 1) return 'Raramente alcançado'
  if (nota === 2) return 'Às vezes alcançado'
  if (nota === 3) return 'Consistentemente alcançado'
  if (nota === 4) return 'Frequentemente superado'
  return 'Consistentemente superado'
}

// Régua oficial de avaliação da CTZ (Manual do Avaliador): notas 1 a 4 usam a
// definição literal do documento; a nota 5 foi criada como extensão do nível
// 4 (Excelente/Referência), para um patamar acima do combinado nos dois eixos.
const NOTAS_LEGENDA = [
  {
    valor: 1,
    label: 'Raramente alcançado',
    cor: 'bg-red-50 border-red-200 text-red-700',
    descricao:
      'Não atende ao critério na maior parte das situações. Requer acompanhamento e desenvolvimento frequentes.',
  },
  {
    valor: 2,
    label: 'Às vezes alcançado',
    cor: 'bg-orange-50 border-orange-200 text-orange-700',
    descricao:
      'Atende ao critério em algumas situações, mas apresenta inconsistência e ainda requer acompanhamento.',
  },
  {
    valor: 3,
    label: 'Consistentemente alcançado',
    cor: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    descricao: 'Atende ao critério de forma consistente, conforme o esperado para a função.',
  },
  {
    valor: 4,
    label: 'Frequentemente superado',
    cor: 'bg-lime-50 border-lime-200 text-lime-700',
    descricao:
      'Supera o esperado com frequência, demonstrando um nível de entrega acima do exigido para a função.',
  },
  {
    valor: 5,
    label: 'Consistentemente superado',
    cor: 'bg-green-50 border-green-200 text-green-700',
    descricao:
      'Supera o esperado de forma consistente e é referência nesse critério, contribuindo para elevar o padrão da equipe.',
  },
]

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

// ── LegendaNotas ─────────────────────────────────────────────────────────────

function LegendaNotas() {
  return (
    <div className="border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-3">
        A Avaliação de Desempenho é um ritual de gestão do Grupo CTZ. A nota final é calculada de forma
        equilibrada, com peso de 50% para a aderência aos nossos pilares culturais e 50% para a entrega das
        metas e OKRs específicos de cada vertical. Use a régua a seguir para pontuar as competências e
        resultados:
      </p>
      <p className="text-xs font-medium text-foreground mb-2">O que significa cada nota</p>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {NOTAS_LEGENDA.map((n) => (
          <div key={n.valor} className={cn('rounded-md border p-2', n.cor)}>
            <p className="text-xs font-semibold">
              {n.valor} · {n.label}
            </p>
            <p className="text-[11px] mt-0.5 opacity-90">{n.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tipos ────────────────────────────────────────────────────────────────────

// media_pares (pedido ago/2026): só leitura, calculada no banco (lateral
// join em get_avaliacao_cultural/tecnica) — nunca é definida pelo usuário
// aqui, só populada em loadData() e mostrada ao lado da nota de calibragem.
type ScoreEntry = { auto: number | null; gestor: number | null; media_pares: number | null; calibragem: number | null }
type ScoresC = Record<string, ScoreEntry & { observacoes: string }>
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
  tipo?: 'padrao' | 'pares'
  revelado?: boolean
  // Pedido (ago/2026): só usados pra Avaliação de Pares travar a vertical na
  // da avaliação comum da pessoa (ver useEffect de vertical mais abaixo) —
  // opcionais porque nem todo caller ainda os preenche (ex.: abrirMinhaAvaliacao
  // em avaliacao/page.tsx, que é só autoavaliação padrão e nunca precisa disso).
  funcionario_id?: string
  ciclo_id?: string
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
  // Administrador de verdade da empresa (não confundir com `isAdmin`, que é só
  // o "papel" nesta avaliação específica — avaliador vs avaliado). Só quem tem
  // esse flag enxerga os dois lados sempre; todo o resto (avaliado/avaliador
  // comuns) só vê a nota que ele mesmo deu, nunca a que recebeu — sem exceção
  // de etapa/calibragem nem de "revelar".
  souAdministrador?: boolean
  // Pedido (ago/2026): quem pode ver/editar especificamente o lado de
  // CALIBRAGEM (nesta modal e no Painel de Calibragem) — na CTZ é só Igor,
  // Filippe Réus e Priscila Santos, não mais "qualquer administrador"; nas
  // demais empresas é igual a souAdministrador. Ver avaliacao/page.tsx. Cai
  // pra souAdministrador se não vier informado, só por segurança de chamador
  // antigo — hoje sempre vem preenchido.
  souGestorDaCalibragem?: boolean
  onClose: () => void
  onSave: () => void
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ModalAvaliacao({ open, avaliacao, cicloNome, isAdmin, souAdministrador, souGestorDaCalibragem, onClose, onSave }: Props) {
  const podeCalibrar = souGestorDaCalibragem ?? souAdministrador
  const [activeTab, setActiveTab] = useState<'cultural' | 'tecnica' | 'pdi'>('cultural')
  const [vertical, setVertical] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [scoresC, setScoresC] = useState<ScoresC>({
    '1': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
    '2': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
    '3': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
    '4': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
  })
  const [scoresT, setScoresT] = useState<ScoresT>({})
  const [pdiItems, setPdiItems] = useState<PdiItem[]>([])
  const [newPdi, setNewPdi] = useState({ acao: '', indicador_sucesso: '', prazo: '', suporte_necessario: '' })
  const [showNewPdi, setShowNewPdi] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  // Pedido (ago/2026): quais campos específicos estão faltando na última
  // tentativa de salvar — usado pra desenhar contorno vermelho neles e pra
  // trocar de aba automaticamente, em vez de só uma frase genérica no
  // rodapé (ver validarCampos). Vazio = nenhuma tentativa de salvar falhou
  // ainda (ou a última deu certo).
  const [camposInvalidos, setCamposInvalidos] = useState<{
    pilaresNota: Set<number>
    pilaresEvidencia: Set<number>
    pilaresCalibragem: Set<number>
    criteriosNota: Set<string>
    criteriosCalibragem: Set<string>
    observacoesGerais: boolean
    vertical: boolean
  }>({
    pilaresNota: new Set(),
    pilaresEvidencia: new Set(),
    pilaresCalibragem: new Set(),
    criteriosNota: new Set(),
    criteriosCalibragem: new Set(),
    observacoesGerais: false,
    vertical: false,
  })

  useEffect(() => {
    if (open && avaliacao) {
      setObservacoes(avaliacao.observacoes_gerais ?? '')
      setActiveTab('cultural')
      setErro('')
      setCamposInvalidos({
        pilaresNota: new Set(),
        pilaresEvidencia: new Set(),
        pilaresCalibragem: new Set(),
        criteriosNota: new Set(),
        criteriosCalibragem: new Set(),
        observacoesGerais: false,
        vertical: false,
      })
      loadData(avaliacao.id)

      // Pedido (ago/2026): na Avaliação de Pares, a vertical não fica livre
      // pro par escolher — trava na vertical ATUAL da avaliação comum (tipo
      // 'padrao') dessa pessoa no mesmo ciclo. Sem isso, o par podia
      // preencher critérios de uma vertical diferente da real, e a Média
      // Pares técnica no Painel de Calibragem (que casa nota por
      // criterio_key) nunca bateria com nada. get_vertical_padrao é
      // security definer de propósito: o par muitas vezes não tem RLS pra
      // ler a linha 'padrao' de quem ele avalia, só a vertical dela.
      if (avaliacao.tipo === 'pares' && avaliacao.funcionario_id && avaliacao.ciclo_id) {
        getVerticalPadrao(avaliacao.ciclo_id, avaliacao.funcionario_id).then(({ data }) => {
          setVertical(data ?? avaliacao.vertical ?? '')
        })
      } else {
        setVertical(avaliacao.vertical ?? '')
      }
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
      '1': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
      '2': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
      '3': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
      '4': { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' },
    }
    cultural.data?.forEach((row: { pilar: number; nota_auto: number | null; nota_gestor: number | null; media_pares: number | null; nota_calibragem: number | null; observacoes: string | null }) => {
      newScoresC[String(row.pilar)] = {
        auto: row.nota_auto,
        gestor: row.nota_gestor,
        media_pares: row.media_pares,
        calibragem: row.nota_calibragem,
        observacoes: row.observacoes ?? '',
      }
    })
    setScoresC(newScoresC)

    const newScoresT: ScoresT = {}
    tecnica.data?.forEach((row: { criterio_key: string; nota_auto: number | null; nota_gestor: number | null; media_pares: number | null; nota_calibragem: number | null; observacoes: string | null }) => {
      newScoresT[row.criterio_key] = {
        auto: row.nota_auto,
        gestor: row.nota_gestor,
        media_pares: row.media_pares,
        calibragem: row.nota_calibragem,
        observacoes: row.observacoes ?? '',
      }
    })
    setScoresT(newScoresT)

    setPdiItems((pdi.data ?? []) as PdiItem[])
    setLoading(false)
  }

  // Pedido (ago/2026): o "Salvar" já bloqueava tudo-ou-nada quando faltava
  // algum campo (não é novo), mas o aviso era só uma frase genérica no
  // rodapé — fácil de não notar, e não dizia EM QUAL pilar/critério faltava
  // nota, nem trocava de aba se o problema estivesse na aba que a pessoa não
  // estava vendo. Caso real: avaliação de pares ficou sem nenhuma nota salva
  // porque faltou "observações do avaliador" e a pessoa não percebeu o erro.
  //
  // Agora validarCampos() também preenche camposInvalidos — os pilares/
  // critérios específicos que faltam — pra: 1) trocar automaticamente pra
  // aba com problema (handleSalvarOuConcluir); 2) desenhar contorno
  // vermelho exatamente nos campos vazios, em vez de só uma frase.
  function validarCampos(): { faltando: string[]; invalidos: typeof camposInvalidos } {
    const faltando: string[] = []
    const ehParesForm = avaliacao?.tipo === 'pares'

    const pilaresComNotaFaltando = [1, 2, 3, 4].filter((p) =>
      isAdmin ? scoresC[String(p)]?.gestor == null : scoresC[String(p)]?.auto == null
    )
    if (pilaresComNotaFaltando.length) {
      faltando.push(
        isAdmin
          ? 'nota do gestor em todos os pilares culturais'
          : 'nota de autoavaliação em todos os pilares culturais'
      )
    }

    const pilaresComEvidenciaFaltando = !isAdmin
      ? [1, 2, 3, 4].filter((p) => !scoresC[String(p)]?.observacoes?.trim())
      : []
    if (pilaresComEvidenciaFaltando.length) {
      faltando.push('evidências e exemplos práticos em todos os pilares culturais')
    }
    const observacoesGeraisFaltando = isAdmin && !observacoes.trim()
    if (observacoesGeraisFaltando) {
      faltando.push(ehParesForm ? 'observações do avaliador' : 'observações do gestor')
    }

    const verticalFaltando = !vertical
    if (verticalFaltando) {
      faltando.push('vertical de atuação')
    }

    const criteriosAtuais = vertical ? (VERTICAIS_CTZ[vertical]?.criterios ?? []) : []
    const criteriosComNotaFaltando = criteriosAtuais.length
      ? criteriosAtuais.filter((c) => (isAdmin ? scoresT[c.key]?.gestor == null : scoresT[c.key]?.auto == null)).map((c) => c.key)
      : []
    if (criteriosComNotaFaltando.length) {
      faltando.push(
        isAdmin
          ? 'nota do gestor em todos os critérios técnicos'
          : 'nota de autoavaliação em todos os critérios técnicos'
      )
    }

    const emEtapaCalibragem = avaliacao ? ['calibragem', 'finalizada'].includes(avaliacao.status) : false
    let pilaresCalibragemFaltando: number[] = []
    let criteriosCalibragemFaltando: string[] = []
    if (podeCalibrar && emEtapaCalibragem) {
      pilaresCalibragemFaltando = [1, 2, 3, 4].filter((p) => scoresC[String(p)]?.calibragem == null)
      if (pilaresCalibragemFaltando.length) {
        faltando.push('nota de calibragem em todos os pilares culturais')
      }
      if (criteriosAtuais.length) {
        criteriosCalibragemFaltando = criteriosAtuais.filter((c) => scoresT[c.key]?.calibragem == null).map((c) => c.key)
        if (criteriosCalibragemFaltando.length) {
          faltando.push('nota de calibragem em todos os critérios técnicos')
        }
      }
    }

    // PDI é opcional — só pode ser preenchido durante a etapa de Calibragem (ver gate na aba PDI)

    const invalidos = {
      pilaresNota: new Set(pilaresComNotaFaltando),
      pilaresEvidencia: new Set(pilaresComEvidenciaFaltando),
      pilaresCalibragem: new Set(pilaresCalibragemFaltando),
      criteriosNota: new Set(criteriosComNotaFaltando),
      criteriosCalibragem: new Set(criteriosCalibragemFaltando),
      observacoesGerais: observacoesGeraisFaltando,
      vertical: verticalFaltando,
    }
    // Guarda no state pra desenhar o contorno vermelho nos campos (o render
    // só reflete esse valor no próximo ciclo — por isso handleSalvarOuConcluir
    // usa o `invalidos` retornado aqui, não o state, pra decidir a aba).
    setCamposInvalidos(invalidos)

    return { faltando, invalidos }
  }

  async function persistirCampos(statusExtra?: string): Promise<boolean> {
    if (!avaliacao) return false

    // Cada upsert manda só os campos do lado de quem está salvando (auto +
    // evidências pro avaliado, gestor pro avaliador, calibragem só quando
    // for administrador de verdade) — ver comentário em
    // upsertAvaliacaoCultural/Tecnica: mandar campo que a pessoa não pode
    // ver reescreve ele com null, já que a leitura vem mascarada (migration
    // 20260821_avaliacao_mascara_notas). Isso vale também pra calibragem: um
    // avaliador comum reabrindo a própria avaliação depois que o admin já
    // começou a calibrar SEMPRE tinha scoresC[...].calibragem = null (nunca
    // consegue ler), e antes disso ia junto no payload — bastava ele clicar
    // "Salvar" pra apagar a calibragem que o admin já tinha feito.
    const resultadosC = await Promise.all(
      [1, 2, 3, 4].map((pilar) => {
        const score = scoresC[String(pilar)]
        return upsertAvaliacaoCultural(
          avaliacao.id,
          pilar,
          isAdmin
            ? {
                nota_gestor: score?.gestor ?? null,
                ...(podeCalibrar ? { nota_calibragem: score?.calibragem ?? null } : {}),
              }
            : { nota_auto: score?.auto ?? null, observacoes: score?.observacoes || null }
        )
      })
    )
    const erroC = resultadosC.find((r) => r.error)?.error
    if (erroC) {
      setErro(erroC.message)
      return false
    }

    const criterios = vertical ? (VERTICAIS_CTZ[vertical]?.criterios ?? []) : []
    if (criterios.length) {
      const resultadosT = await Promise.all(
        criterios.map((c) => {
          const score = scoresT[c.key]
          return upsertAvaliacaoTecnica(
            avaliacao.id,
            c.key,
            isAdmin
              ? {
                  nota_gestor: score?.gestor ?? null,
                  ...(podeCalibrar ? { nota_calibragem: score?.calibragem ?? null } : {}),
                }
              : { nota_auto: score?.auto ?? null, observacoes: score?.observacoes || null }
          )
        })
      )
      const erroT = resultadosT.find((r) => r.error)?.error
      if (erroT) {
        setErro(erroT.message)
        return false
      }
    }

    // Mesma lógica na linha-pai: só manda o lado de quem está salvando, pra
    // não sobrescrever a média do outro lado com null. media_*_calibragem só
    // entra quando podeCalibrar (Igor/Filippe/Priscila na CTZ, administrador
    // nas demais empresas) — mesmo raciocínio do upsert acima.
    const payloadBase = {
      vertical: vertical || null,
      ...(statusExtra ? { status: statusExtra } : {}),
    }
    const payloadLado = isAdmin
      ? {
          observacoes_gerais: observacoes || null,
          media_cultural_gestor: calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.gestor ?? null)),
          media_tecnica_gestor: calcMedia(criterios.map((c) => scoresT[c.key]?.gestor ?? null)),
          ...(podeCalibrar
            ? {
                media_cultural_calibragem: calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.calibragem ?? null)),
                media_tecnica_calibragem: calcMedia(criterios.map((c) => scoresT[c.key]?.calibragem ?? null)),
              }
            : {}),
        }
      : {
          media_cultural_auto: calcMedia([1, 2, 3, 4].map((p) => scoresC[String(p)]?.auto ?? null)),
          media_tecnica_auto: calcMedia(criterios.map((c) => scoresT[c.key]?.auto ?? null)),
        }

    const { error: erroUpdate } = await updateAvaliacao(avaliacao.id, { ...payloadBase, ...payloadLado })

    if (erroUpdate) {
      setErro(erroUpdate.message)
      return false
    }
    return true
  }

  // Botão único (pedido ago/2026): "Salvar" e "Concluir [etapa]" eram duas
  // ações separadas — isso já causou confusão real (gente preenchia tudo,
  // clicava só "Salvar", nunca clicava "Concluir", e depois achava que tinha
  // perdido o trabalho porque a avaliação não aparecia como concluída). Como
  // validarCampos() já bloqueia o "Salvar" se faltar qualquer campo — ou
  // seja, um salvamento bem-sucedido já implica que está tudo completo —, não
  // existe um caso real de "salvar rascunho incompleto" sendo perdido ao
  // unificar: o botão único conclui a etapa sempre que o salvamento for
  // bem-sucedido E a pessoa tiver uma etapa pra avançar; senão só salva,
  // igual antes.
  //
  // gestor_concluida→calibragem e calibragem→finalizada continuam de fora
  // daqui — isso é ação em lote do administrador, na tela do ciclo (ver
  // avaliacao/page.tsx: "Iniciar Calibragem"/"Finalizar Calibragem"), não
  // avaliação por avaliação.
  async function handleSalvarOuConcluir() {
    if (!avaliacao) return
    const ehParesForm = avaliacao.tipo === 'pares'

    // Mesma condição de podeAvancarStatus (computada mais abaixo pro rótulo
    // do botão) — decide se este clique também avança a etapa, além de
    // salvar. Pares só avança pelo avaliador partindo de "pendente";
    // avaliação comum avança pelo avaliado partindo de "pendente" (auto) ou
    // pelo avaliador partindo de "auto_concluida" (gestor).
    const podeAvancar = ehParesForm
      ? isAdmin && avaliacao.status === 'pendente'
      : (!isAdmin && avaliacao.status === 'pendente') || (isAdmin && avaliacao.status === 'auto_concluida')

    const proximo: Record<string, string> = ehParesForm
      ? { pendente: 'gestor_concluida' }
      : { pendente: 'auto_concluida', auto_concluida: 'gestor_concluida' }
    const next = podeAvancar ? proximo[avaliacao.status] : undefined

    const { faltando: camposFaltando, invalidos } = validarCampos()
    if (camposFaltando.length) {
      setErro(`Preencha antes de ${next ? 'concluir' : 'salvar'}: ${camposFaltando.join('; ')}. Os campos em vermelho abaixo indicam exatamente o que falta.`)
      // Leva a pessoa direto pra aba com o problema, em vez de deixar ela
      // procurar — cultural tem prioridade porque aparece primeiro no fluxo.
      if (invalidos.pilaresNota.size || invalidos.pilaresEvidencia.size || invalidos.pilaresCalibragem.size || invalidos.observacoesGerais) {
        setActiveTab('cultural')
      } else if (invalidos.vertical || invalidos.criteriosNota.size || invalidos.criteriosCalibragem.size) {
        setActiveTab('tecnica')
      }
      return
    }

    setSaving(true)
    setErro('')
    const ok = await persistirCampos(next)
    setSaving(false)
    if (ok) {
      setCamposInvalidos(invalidos) // vazio (todos os Sets ficam vazios quando faltando.length === 0)
      onSave()
    }
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
      [key]: { ...(prev[key] ?? { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' }), [tipo]: valor },
    }))
  }

  if (!open || !avaliacao) return null

  // Avaliação de pares (líder avaliando líder) pedido ago/2026: ganhou aba de
  // Performance Técnica igual à avaliação comum (antes era só cultural, pela
  // lógica de que um colega de outra vertical raramente teria visibilidade
  // das metas específicas de quem está avaliando — decisão revertida a
  // pedido). Calibragem continua fora (pares nunca entra em
  // iniciarCalibragemCiclo/finalizarCalibragemCiclo, filtro tipo='padrao').
  const ehPares = avaliacao.tipo === 'pares'
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

  // Avaliação de pares não tem "Autoavaliação" — pendente já vira "Concluir
  // Avaliação" direto, empurrado pelo avaliador.
  const proximoStatusLabel: Record<string, string> = ehPares
    ? { pendente: 'Concluir Avaliação' }
    : { pendente: 'Concluir Autoavaliação', auto_concluida: 'Concluir Avaliação do Gestor' }

  // Calibragem (pedido ago/2026): virou etapa ciclo-inteira, disparada em
  // lote pelo administrador na tela do ciclo ("Iniciar Calibragem"/
  // "Finalizar Calibragem" — ver avaliacao/page.tsx), não mais avaliação por
  // avaliação daqui de dentro. Por isso esse botão só cobre mais
  // pendente→auto_concluida (avaliado) e auto_concluida→gestor_concluida
  // (avaliador) — gestor_concluida→calibragem e calibragem→finalizada saíram
  // daqui.
  //
  // Avaliação de pares não tem etapa de avaliado (ele nunca abre a própria
  // linha) — então quem empurra o "pendente" é sempre o avaliador
  // (isAdmin), não o "!isAdmin" que a avaliação comum usa.
  const podeAvancarStatus = ehPares
    ? (isAdmin && avaliacao.status === 'pendente')
    : (!isAdmin && avaliacao.status === 'pendente') || (isAdmin && avaliacao.status === 'auto_concluida')

  const podeEditarPdi = ['calibragem', 'finalizada'].includes(avaliacao.status)

  // Cada usuário só vê a nota que ELE deu, nunca a que recebeu — sem exceção
  // de etapa/calibragem nem de "revelar" (isso existia antes e foi removido de
  // propósito). Só administrador de verdade da empresa (souAdministrador, não
  // confundir com `isAdmin` = papel de avaliador nesta avaliação) enxerga os
  // dois lados sempre, como auditor.
  const gestorVeAuto = !!souAdministrador
  const colaboradorVeGestor = !!souAdministrador
  const podeVerMedias = isAdmin || !!souAdministrador

  // Calibragem (pedido ago/2026): não é mais "o mesmo avaliador, numa etapa
  // posterior" — é exclusiva de quem tem podeCalibrar (na CTZ: só Igor,
  // Filippe Réus e Priscila Santos; nas demais empresas: administrador de
  // verdade). Nem o
  // avaliador original que preencheu a nota do gestor enxerga a nota de
  // calibragem agora. calibragemLiberada continua controlando SÓ o "ainda
  // não chegou a etapa" — pra qualquer outra pessoa a seção de calibragem
  // fica oculta, ponto.
  const calibragemLiberada = ['calibragem', 'finalizada'].includes(avaliacao.status)
  const podeEditarCalibragem = !!podeCalibrar && avaliacao.status === 'calibragem'

  const notaFinalCultural = avaliacao.media_cultural_calibragem ?? avaliacao.media_cultural_gestor
  const notaFinalTecnica = avaliacao.media_tecnica_calibragem ?? avaliacao.media_tecnica_gestor
  const percentualFinal =
    notaFinalCultural !== null && notaFinalTecnica !== null
      ? Math.round(((notaFinalCultural + notaFinalTecnica) / 2 / 5) * 100)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <p className="text-xs text-muted-foreground">{cicloNome}</p>
          <div className="flex items-center gap-2">
            {ehPares && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-violet-100 text-violet-700">
                Avaliação de Pares
              </span>
            )}
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusColor[avaliacao.status] ?? 'bg-muted text-muted-foreground')}>
              {ehPares && avaliacao.status === 'gestor_concluida' ? 'Concluída' : statusLabel[avaliacao.status] ?? avaliacao.status}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-1">
              ×
            </button>
          </div>
        </div>

        {/* Detalhamento do colaborador */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
            {(avaliacao.funcionario?.full_name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {avaliacao.funcionario?.full_name ?? 'Colaborador'}
            </p>
            {avaliacao.funcionario?.cargo && (
              <p className="text-xs text-muted-foreground">{avaliacao.funcionario.cargo}</p>
            )}
            {avaliacao.avaliador?.full_name && (
              <p className="text-[11px] text-muted-foreground mt-0.5">Avaliador: {avaliacao.avaliador.full_name}</p>
            )}
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
          {/* Legenda das notas */}
          <div className="mb-4">
            <LegendaNotas />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Tab Cultural */}
              {activeTab === 'cultural' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Avalie os 4 pilares fundamentais da cultura, usando a régua de notas acima.
                  </p>

                  {PILARES_CULTURAIS.map((pilar) => {
                    const score = scoresC[String(pilar.numero)]
                    return (
                      <div key={pilar.numero} className="space-y-3">
                        <div className="border border-border rounded-lg p-4 space-y-3">
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
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Evidências e Exemplos Práticos {!isAdmin && '*'}
                            </label>
                            {isAdmin && !gestorVeAuto ? (
                              <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-1.5">
                                Oculto — autoavaliação é exclusiva de quem preencheu.
                              </p>
                            ) : (
                              <textarea
                                value={score?.observacoes ?? ''}
                                onChange={(e) =>
                                  setScoresC((prev) => ({
                                    ...prev,
                                    [String(pilar.numero)]: {
                                      ...(prev[String(pilar.numero)] ?? { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' }),
                                      observacoes: e.target.value,
                                    },
                                  }))
                                }
                                rows={2}
                                disabled={isAdmin}
                                placeholder="Descreva exemplos concretos que justifiquem as notas..."
                                className={cn(
                                  'mt-1 w-full px-3 py-1.5 text-xs rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60',
                                  !isAdmin && camposInvalidos.pilaresEvidencia.has(pilar.numero) ? 'border-destructive' : 'border-input'
                                )}
                              />
                            )}
                          </div>
                        </div>
                        <div className="border border-border rounded-lg p-4">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Auto</p>
                              {isAdmin && !gestorVeAuto ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem preencheu</p>
                              ) : (
                                <div className={cn('flex gap-1 p-0.5 rounded-md', !isAdmin && camposInvalidos.pilaresNota.has(pilar.numero) && 'ring-2 ring-destructive')}>
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
                              <p className="text-xs text-muted-foreground mb-1.5">Avaliador</p>
                              {!isAdmin && !colaboradorVeGestor ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem preencheu</p>
                              ) : (
                                <div className={cn('flex gap-1 p-0.5 rounded-md', isAdmin && camposInvalidos.pilaresNota.has(pilar.numero) && 'ring-2 ring-destructive')}>
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
                              <p className="text-xs text-muted-foreground mb-1.5">Média Pares</p>
                              {ehPares ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Não se aplica a pares</p>
                              ) : !podeCalibrar ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem calibra</p>
                              ) : (
                                <p className={cn('h-8 flex items-center text-sm font-medium', score?.media_pares == null && 'text-muted-foreground/50')}>
                                  {score?.media_pares ?? '—'}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Calibragem</p>
                              {ehPares ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Não se aplica a pares</p>
                              ) : !podeCalibrar ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem calibra</p>
                              ) : !calibragemLiberada ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Disponível na etapa de Calibragem</p>
                              ) : (
                                <div className="flex gap-1">
                                  {([1, 2, 3, 4, 5] as const).map((v) => (
                                    <ScoreButton
                                      key={v}
                                      value={v}
                                      selected={score?.calibragem === v}
                                      onClick={() => setScoreC(pilar.numero, 'calibragem', v)}
                                      disabled={!podeEditarCalibragem}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div>
                    <label className="text-xs font-medium text-foreground">
                      {ehPares ? 'Observações do Avaliador' : 'Observações do Gestor'} {isAdmin && '*'}
                    </label>
                    {!isAdmin && !colaboradorVeGestor ? (
                      <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
                        Oculto — nota do avaliador é exclusiva de quem preencheu.
                      </p>
                    ) : (
                      <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        rows={3}
                        disabled={!isAdmin}
                        placeholder="Feedback geral sobre a avaliação..."
                        className={cn(
                          'mt-1 w-full px-3 py-2 text-sm rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60',
                          isAdmin && camposInvalidos.observacoesGerais ? 'border-destructive' : 'border-input'
                        )}
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
                      disabled={ehPares}
                      className={cn(
                        'mt-1 w-full px-3 py-2 text-sm rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60',
                        camposInvalidos.vertical ? 'border-destructive' : 'border-input'
                      )}
                    >
                      <option value="">Selecione a vertical...</option>
                      {Object.entries(VERTICAIS_CTZ).map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                      ))}
                    </select>
                    {ehPares && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {vertical
                          ? 'Travada na vertical da avaliação comum desta pessoa — não dá pra trocar aqui.'
                          : 'A pessoa avaliada ainda não tem vertical definida na avaliação comum dela — defina lá primeiro.'}
                      </p>
                    )}
                  </div>

                  {!vertical && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Selecione a vertical para habilitar os critérios.
                    </p>
                  )}

                  {criterios.map((criterio) => {
                    const score = scoresT[criterio.key]
                    return (
                      <div key={criterio.key} className="space-y-3">
                        <div className="border border-border rounded-lg p-4 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{criterio.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{criterio.descricao}</p>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Evidências e Exemplos Práticos</label>
                            {isAdmin && !gestorVeAuto ? (
                              <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-1.5">
                                Oculto — autoavaliação é exclusiva de quem preencheu.
                              </p>
                            ) : !isAdmin && !colaboradorVeGestor ? (
                              <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-1.5">
                                Oculto — nota do avaliador é exclusiva de quem preencheu.
                              </p>
                            ) : (
                              <textarea
                                value={score?.observacoes ?? ''}
                                onChange={(e) =>
                                  setScoresT((prev) => ({
                                    ...prev,
                                    [criterio.key]: {
                                      ...(prev[criterio.key] ?? { auto: null, gestor: null, media_pares: null, calibragem: null, observacoes: '' }),
                                      observacoes: e.target.value,
                                    },
                                  }))
                                }
                                rows={2}
                                disabled={isAdmin}
                                placeholder="Descreva exemplos concretos que justifiquem as notas..."
                                className="mt-1 w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                              />
                            )}
                          </div>
                        </div>
                        <div className="border border-border rounded-lg p-4">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Auto</p>
                              {isAdmin && !gestorVeAuto ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem preencheu</p>
                              ) : (
                                <div className={cn('flex gap-1 p-0.5 rounded-md', !isAdmin && camposInvalidos.criteriosNota.has(criterio.key) && 'ring-2 ring-destructive')}>
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
                              <p className="text-xs text-muted-foreground mb-1.5">Avaliador</p>
                              {!isAdmin && !colaboradorVeGestor ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem preencheu</p>
                              ) : (
                                <div className={cn('flex gap-1 p-0.5 rounded-md', isAdmin && camposInvalidos.criteriosNota.has(criterio.key) && 'ring-2 ring-destructive')}>
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
                              <p className="text-xs text-muted-foreground mb-1.5">Média Pares</p>
                              {ehPares ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Não se aplica a pares</p>
                              ) : !podeCalibrar ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem calibra</p>
                              ) : (
                                <p className={cn('h-8 flex items-center text-sm font-medium', score?.media_pares == null && 'text-muted-foreground/50')}>
                                  {score?.media_pares ?? '—'}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Calibragem</p>
                              {ehPares ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Não se aplica a pares</p>
                              ) : !podeCalibrar ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Oculto — exclusivo de quem calibra</p>
                              ) : !calibragemLiberada ? (
                                <p className="h-8 flex items-center text-[11px] text-muted-foreground italic">Disponível na etapa de Calibragem</p>
                              ) : (
                                <div className="flex gap-1">
                                  {([1, 2, 3, 4, 5] as const).map((v) => (
                                    <ScoreButton
                                      key={v}
                                      value={v}
                                      selected={score?.calibragem === v}
                                      onClick={() => setScoreT(criterio.key, 'calibragem', v)}
                                      disabled={!podeEditarCalibragem}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Observações do Gestor {isAdmin && '*'}
                    </label>
                    {!isAdmin && !colaboradorVeGestor ? (
                      <p className="mt-1 text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-2">
                        Oculto — nota do avaliador é exclusiva de quem preencheu.
                      </p>
                    ) : (
                      <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        rows={3}
                        disabled={!isAdmin}
                        placeholder="Feedback geral sobre a avaliação..."
                        className={cn(
                          'mt-1 w-full px-3 py-2 text-sm rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60',
                          isAdmin && camposInvalidos.observacoesGerais ? 'border-destructive' : 'border-input'
                        )}
                      />
                    )}
                  </div>
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
                          className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                            className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Prazo limite</label>
                          <input
                            type="date"
                            value={newPdi.prazo}
                            onChange={(e) => setNewPdi((p) => ({ ...p, prazo: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                          className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

        {/* Footer — botão único: conclui a etapa quando aplicável, senão só salva */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleSalvarOuConcluir}
            disabled={saving}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            {saving ? 'Salvando...' : podeAvancarStatus ? proximoStatusLabel[avaliacao.status] : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
