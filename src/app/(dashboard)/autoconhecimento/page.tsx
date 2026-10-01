'use client'

import { useEffect, useState } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import {
  getMeuPerfilEneagrama,
  getTodosPerfisEneagrama,
  getSouLiderDeAlguem,
  getColegasComPerfilMapeado,
  getMeusLideradosComPerfilMapeado,
  getResumoTimeLiderado,
  getOrganogramaEmpresa,
  type PerfilEneagramaComNome,
  type ColegaComPerfilMapeado,
  type ResumoTime,
  type FuncionarioOrganograma,
} from '@/lib/queries/eneagrama'
import { getTodosCargosPerfil, getMinhaDicaCargo, type FuncionarioCargoPerfil } from '@/lib/queries/cargosPerfil'
import { TIPOS_ENEAGRAMA } from '@/lib/eneagrama/tipos'
import { Sparkles, Loader2, ChevronDown, Wand2, MessageCircle } from 'lucide-react'
import Conversa from '@/components/autoconhecimento/Conversa'
import {
  CabecalhoMapa,
  PerfilMapaDeSi,
  ComposicaoTime,
  SeletorPessoas,
} from '@/components/autoconhecimento/Mapas'

const PERGUNTAS_SUGERIDAS = [
  'Tenho dificuldade de dar feedback para o meu time.',
  'Travo quando preciso tomar uma decisão difícil.',
  'Fico irritado quando as coisas saem do meu controle.',
  'Não consigo dizer não e acabo sobrecarregado.',
]

// Situações de exemplo pra conversa sobre um colega — só ilustram o tipo de
// pergunta; o campo já vem preenchido e a pessoa ajusta antes de mandar.
const SITUACOES_SUGERIDAS = [
  'Preciso dar um feedback sobre um atraso recorrente em entregas.',
  'Preciso pedir pra essa pessoa assumir uma responsabilidade nova.',
  'Preciso alinhar uma expectativa que não está sendo cumprida.',
  'A comunicação entre nós anda tensa e não sei por quê.',
]

// Mesma ideia, com o vocabulário de quem lidera (delegação, desenvolvimento, decisão).
const SITUACOES_SUGERIDAS_LIDERANCA = [
  'Preciso delegar uma responsabilidade nova pra essa pessoa.',
  'Preciso dar um feedback de desenvolvimento, não só de desempenho.',
  'Como conduzo uma decisão que essa pessoa provavelmente não vai gostar?',
  'Essa pessoa está desmotivada e não sei o motivo.',
]

// Conversa do Mapa de si. Desde 14/09/2026 a conversa sobre um colega (antigo
// Mapa 3) é um modo desta mesma conversa: "Sobre mim" chama
// /api/assistente-eneagrama; "Sobre um colega" chama /api/como-abordar-colega
// (só aparece quando `colegas` não está vazia — hoje só pra souAdminPiloto).
// Quem não tem tipo próprio (ex.: administrador do sistema) não tem a opção
// "Sobre mim", que daria erro na rota (ela exige tipo próprio).
function ConversaMapaDeSi({
  colegas,
  permiteSobreSiMesmo,
}: {
  colegas: ColegaComPerfilMapeado[]
  permiteSobreSiMesmo: boolean
}) {
  const [modoColega, setModoColega] = useState(!permiteSobreSiMesmo)
  const [alvoId, setAlvoId] = useState('')
  const podeConversar = (permiteSobreSiMesmo && !modoColega) || !!alvoId

  return (
    <div className="space-y-3">
      {colegas.length > 0 && permiteSobreSiMesmo && (
        <div className="inline-flex p-1 rounded-xl bg-secondary text-xs font-semibold">
          {[{ colega: false, rotulo: 'Sobre mim' }, { colega: true, rotulo: 'Sobre um colega' }].map((aba) => (
            <button
              key={aba.rotulo}
              type="button"
              onClick={() => { setModoColega(aba.colega); setAlvoId('') }}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-colors',
                modoColega === aba.colega ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>
      )}
      {colegas.length > 0 && modoColega && (
        <select
          value={alvoId}
          onChange={(e) => setAlvoId(e.target.value)}
          className="w-full sm:max-w-sm px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Selecione um colega...</option>
          {[...colegas]
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((p) => (
              <option key={p.funcionario_id} value={p.funcionario_id}>{p.full_name}</option>
            ))}
        </select>
      )}

      {podeConversar ? (
        <Conversa
          key={alvoId || 'eu'}
          endpoint={alvoId ? '/api/como-abordar-colega' : '/api/assistente-eneagrama'}
          montarCorpo={(msg, historico) =>
            alvoId
              ? { funcionarioAlvoId: alvoId, situacao: msg, historico }
              : { pergunta: msg, historico }
          }
          sugestoes={alvoId ? SITUACOES_SUGERIDAS : PERGUNTAS_SUGERIDAS}
          placeholder={alvoId ? 'Descreva a situação com essa pessoa...' : 'O que está difícil para você agora?'}
        />
      ) : (
        <p className="text-xs text-muted-foreground">Selecione um colega acima para começar.</p>
      )}
    </div>
  )
}

// Conversa do Mapa do time: escolhe um liderado direto e descreve a situação.
// `corpoExtra` só é usado pela simulação de administrador (pedido 14/09/2026),
// que informa QUAL líder está sendo simulado — /api/simular-liderar-liderado
// não resolve isso pela sessão (quem está logado é o admin, não o líder).
function ConversaLiderado({
  pessoas,
  endpoint,
  corpoExtra,
}: {
  pessoas: ColegaComPerfilMapeado[]
  endpoint: string
  corpoExtra?: Record<string, string>
}) {
  const [alvoId, setAlvoId] = useState('')
  return (
    <div className="space-y-3">
      <SeletorPessoas pessoas={pessoas} selecionada={alvoId} onSelecionar={setAlvoId} />
      {alvoId ? (
        <Conversa
          key={alvoId}
          endpoint={endpoint}
          montarCorpo={(msg, historico) => ({ funcionarioAlvoId: alvoId, situacao: msg, historico, ...corpoExtra })}
          sugestoes={SITUACOES_SUGERIDAS_LIDERANCA}
          placeholder="Descreva a situação com essa pessoa..."
        />
      ) : (
        <p className="text-xs text-muted-foreground">Escolha um liderado acima para começar.</p>
      )}
    </div>
  )
}

const EVENTO_ABRIR_BLOCO = 'autoconhecimento:abrir-bloco'

// Moldura da conversa com o assistente (cabeçalho + conteúdo). Fechada até a
// pessoa abrir; fechar só esconde (hidden), a conversa continua guardada.
function BlocoAssistente({ titulo, descricao, children, id }: { titulo: string; descricao: string; children: React.ReactNode; id?: string }) {
  const [aberto, setAberto] = useState(false)

  // Atalho do topo da página (ou link com #id) abre a conversa já aberta.
  useEffect(() => {
    if (!id) return
    if (window.location.hash === `#${id}`) setAberto(true)
    const abrir = (e: Event) => { if ((e as CustomEvent<string>).detail === id) setAberto(true) }
    window.addEventListener(EVENTO_ABRIR_BLOCO, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_BLOCO, abrir)
  }, [id])

  return (
    <div id={id} className="glass-panel rounded-2xl p-5 md:p-6 space-y-4 scroll-mt-32">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="w-full flex items-start gap-3 text-left">
        <span className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 grid place-items-center shrink-0">
          <MessageCircle className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-bold text-foreground">{titulo}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{descricao}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground mt-1">
          {aberto ? 'Ocultar' : 'Abrir conversa'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', aberto && 'rotate-180')} />
        </span>
      </button>
      <div className={cn(!aberto && 'hidden')}>{children}</div>
    </div>
  )
}

export default function AutoconhecimentoPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  const [loading, setLoading] = useState(true)
  const [tipoNumero, setTipoNumero] = useState<number | null>(null)
  const [subtipoSequencia, setSubtipoSequencia] = useState<string | null>(null)
  const [erroPerfil, setErroPerfil] = useState<string | null>(null)
  // Igor/Priscila: a página inteira vira a simulação do Felipe Marques
  // (01/10/2026). A análise de cargo própria (minhaDica) aparece pros líderes.
  const [souVeDicaMapa1, setSouVeDicaMapa1] = useState(false)
  const [minhaDica, setMinhaDica] = useState<{ texto: string; geradoEm: string; cargo: string | null } | null>(null)

  // Mapa 2 "Liderando o time": só aparece pra quem tem liderado direto no
  // organograma (funcionarios.gestor_id) — ver sou_lider_de_alguem() no
  // banco (migration PENDENTE_20260910010000). Aberto aos líderes em
  // 01/10/2026; o tipo do liderado nunca chega ao navegador.
  const [souLider, setSouLider] = useState(false)
  const [liderados, setLiderados] = useState<ColegaComPerfilMapeado[]>([])
  // Resumo do time (pedido 14/09/2026) — agregado, nunca tipo individual
  // (ver resumo_time_liderado(), migration PENDENTE_20260914030000).
  const [resumoTime, setResumoTime] = useState<ResumoTime | null>(null)
  // Colegas de QUALQUER pessoa (não só liderado direto) — desde 14/09/2026
  // isso deixou de ser "Mapa 3" separado e virou um modo do chat do Mapa 1
  // (ChatMapa1Unificado). Mesmo raciocínio de acesso — só carregado/mostrado
  // pra souAdminPiloto.
  const [colegas, setColegas] = useState<ColegaComPerfilMapeado[]>([])
  // Organograma da empresa inteira (id + gestor_id) — só pra simulação de
  // administrador (souVeDicaMapa1, mais abaixo), pra achar os liderados do
  // Felipe Marques sem precisar de RPC nova (a RLS de leitura de
  // `funcionarios` já libera qualquer membro da mesma empresa).
  const [organograma, setOrganograma] = useState<FuncionarioOrganograma[]>([])

  // Piloto do protótipo (Igor/Priscila/Letícia/Eduardo): só a conversa sobre
  // um colega. A lista "Perfis da equipe" saiu da página em 01/10/2026.
  const [souAdminPiloto, setSouAdminPiloto] = useState(false)
  const [todosPerfis, setTodosPerfis] = useState<PerfilEneagramaComNome[]>([])
  const [cargosPerfil, setCargosPerfil] = useState<Record<string, FuncionarioCargoPerfil>>({})
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [erroGeracao, setErroGeracao] = useState<string | null>(null)
  const [acessoLiberado, setAcessoLiberado] = useState(false)

  useEffect(() => {
    if (!ctz) {
      setLoading(false)
      return
    }
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !empresa) {
        setLoading(false)
        return
      }
      const piloto = souPilotoAutoconhecimento(user.email)
      setSouAdminPiloto(piloto)
      const emailAtual = user.email?.toLowerCase() ?? ''
      const veDicaMapa1 = ['igorecosta1@gmail.com', 'priscila.santos@behive.net.br'].includes(emailAtual)
      setSouVeDicaMapa1(veDicaMapa1)

      // Líderes (01/10/2026): quem tem liderado direto no organograma vê o
      // Mapa do time. Quem tem "Líder" no cargo do cadastro (Jean, Guilherme:
      // líderes sem liderado no organograma) também é líder aqui.
      // Mesma regra de podeVerAutoconhecimento (menu e Início).
      const [{ souLider: liderDeAlguem }, { data: meuCadastro }] = await Promise.all([
        getSouLiderDeAlguem(),
        supabase.from('funcionarios').select('cargo').eq('user_id', user.id).eq('client_id', empresa.id).maybeSingle(),
      ])
      setSouLider(liderDeAlguem)
      const liderPeloCargo = /l[ií]der/i.test(meuCadastro?.cargo ?? '')

      // Liderado não vê o módulo (01/10/2026): só líderes e piloto.
      const acesso = piloto || liderDeAlguem || liderPeloCargo
      setAcessoLiberado(acesso)
      if (!acesso) {
        setLoading(false)
        return
      }

      const { perfil, error } = await getMeuPerfilEneagrama()
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }
      if (liderDeAlguem) {
        getMeusLideradosComPerfilMapeado().then(({ liderados: l }) => setLiderados(l))
        getResumoTimeLiderado().then(({ resumo }) => setResumoTime(resumo))
      }
      if (liderDeAlguem || liderPeloCargo) {
        getMinhaDicaCargo().then(({ dicas }) => setMinhaDica(dicas))
      }

      // Conversa sobre um colega continua só do piloto (10/09/2026).
      if (piloto) {
        getColegasComPerfilMapeado(empresa.id).then(({ colegas: c }) => setColegas(c))
      }

      // Simulação do Felipe Marques (Igor/Priscila): perfis, cargos e
      // organograma ficam só em memória pra montar a simulação — a lista de
      // perfis da equipe saiu da página em 01/10/2026 e ninguém mais a vê.
      if (veDicaMapa1) {
        const [{ perfis, error: erroTodos }, { mapa }, { organograma: o }] = await Promise.all([
          getTodosPerfisEneagrama(empresa.id),
          getTodosCargosPerfil(empresa.id),
          getOrganogramaEmpresa(empresa.id),
        ])
        if (!erroTodos) setTodosPerfis(perfis)
        setCargosPerfil(mapa)
        setOrganograma(o)
      }
      setLoading(false)
    }
    carregar()
  }, [ctz, empresa?.id])

  async function gerarDica(funcionarioId: string) {
    setErroGeracao(null)
    setGerandoId(funcionarioId)
    try {
      const res = await fetch('/api/gerar-dica-cargo-eneagrama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionarioId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Erro ao gerar análise.')
      setCargosPerfil((prev) => ({
        ...prev,
        [funcionarioId]: {
          ...prev[funcionarioId],
          dicas_texto: body.dicas,
          dicas_gerado_em: new Date().toISOString(),
        },
      }))
    } catch (err) {
      setErroGeracao(err instanceof Error ? err.message : 'Erro ao gerar análise.')
    } finally {
      setGerandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-secondary" />
        <div className="h-40 rounded-2xl bg-secondary" />
      </div>
    )
  }

  // Módulo construído só pra CTZ (fonte é o Programa Foco da BeHive, aplicado
  // só lá). Desde 01/10/2026, só líderes e piloto — liderado vê a mesma
  // mensagem genérica, sem pista de que é uma restrição.
  if (!ctz || !acessoLiberado) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  const tipo = tipoNumero ? TIPOS_ENEAGRAMA[tipoNumero] : null

  // Igor/Priscila (souVeDicaMapa1) veem a página inteira como o Felipe Marques
  // Santos veria (pedido 01/10/2026) — eles não têm tipo nem liderados
  // próprios. Usa os dados que já foram carregados pra isso, nenhuma query nova.
  const felipe = souVeDicaMapa1 ? todosPerfis.find((p) => p.full_name === 'Felipe Marques Santos') : undefined
  const simulando = !!felipe
  const felipeCargo = felipe ? cargosPerfil[felipe.funcionario_id] : undefined

  const tipoExibido = felipe ? TIPOS_ENEAGRAMA[felipe.tipo] ?? null : tipo
  const subtipoExibido = felipe ? felipe.subtipo_sequencia : subtipoSequencia
  const dicaExibida = felipe
    ? (felipeCargo?.dicas_texto && felipeCargo.dicas_gerado_em ? { texto: felipeCargo.dicas_texto, geradoEm: felipeCargo.dicas_gerado_em } : null)
    : minhaDica
  const cargoExibido = felipe ? felipeCargo?.cargo_perfil?.cargo_base ?? null : minhaDica?.cargo

  // Time do Felipe na simulação: organograma + perfis já carregados.
  const idsLideradosFelipe = felipe ? organograma.filter((o) => o.gestor_id === felipe.funcionario_id).map((o) => o.funcionario_id) : []
  const perfisLideradosFelipe = todosPerfis.filter((p) => idsLideradosFelipe.includes(p.funcionario_id))
  const resumoExibido: ResumoTime | null = felipe
    ? {
        instintivo: perfisLideradosFelipe.filter((p) => [8, 9, 1].includes(p.tipo)).length,
        emocional: perfisLideradosFelipe.filter((p) => [2, 3, 4].includes(p.tipo)).length,
        racional: perfisLideradosFelipe.filter((p) => [5, 6, 7].includes(p.tipo)).length,
        totalLiderados: idsLideradosFelipe.length,
        totalMapeados: perfisLideradosFelipe.length,
      }
    : resumoTime
  const lideradosExibidos: ColegaComPerfilMapeado[] = felipe ? perfisLideradosFelipe : liderados
  const lideraExibido = felipe ? idsLideradosFelipe.length > 0 : souLider

  // Mapa do time: líderes (01/10/2026), a simulação e o piloto (Letícia/
  // Eduardo veem o motivo de estar vazio).
  const mostraMapaDoTime = simulando || souLider || souAdminPiloto
  // Conversa sobre colega continua só do piloto; na simulação some, porque o
  // Felipe não teria essa opção.
  const colegasConversa = simulando ? [] : colegas

  return (
    <div className="max-w-6xl space-y-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Autoconhecimento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Programa Foco · como você funciona e como liderar e se relacionar melhor
          </p>
        </div>
      </div>

      {simulando && (
        <div className="-mt-6 rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Simulação · você está vendo a página como Felipe Marques Santos
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada líder vê a própria página, com o próprio perfil e o próprio time. Só você e a Priscila veem esta simulação.
          </p>
        </div>
      )}

      {/* Atalhos entre as partes da página. */}
      <nav className="sticky top-[76px] z-30 -mx-1 px-1 py-2 bg-background/85 backdrop-blur flex gap-2 overflow-x-auto text-xs font-semibold -mt-6">
        <a href="#mapa-de-si" className="shrink-0 px-3 py-1.5 rounded-full bg-primary text-primary-foreground">1 · Mapa de si</a>
        {(tipoExibido || colegasConversa.length > 0) && (
          <a
            href="#assistente"
            onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_BLOCO, { detail: 'assistente' }))}
            className="shrink-0 px-3 py-1.5 rounded-full bg-card border border-border text-foreground hover:border-primary/40 transition-colors">Conversar com o assistente</a>
        )}
        {mostraMapaDoTime && (
          <a href="#mapa-do-time" className="shrink-0 px-3 py-1.5 rounded-full bg-card border border-border text-foreground hover:border-amber-500/50 transition-colors">2 · Mapa do time</a>
        )}
      </nav>

      {erroPerfil && !simulando && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {erroPerfil}
        </div>
      )}

      {/* Mapa de si (todos da CTZ com tipo mapeado). */}
      <section id="mapa-de-si" className="space-y-5 scroll-mt-32">
        <CabecalhoMapa
          numero={1}
          tom="primary"
          titulo="Mapa de si"
          descricao="Como você funciona, onde brilha e onde vale ficar de olho."
        />

        {tipoExibido ? (
          <PerfilMapaDeSi tipo={tipoExibido} subtipoSequencia={subtipoExibido} dica={dicaExibida} cargo={cargoExibido} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {souAdminPiloto
                ? 'Você não tem um perfil de Eneagrama próprio mapeado — normal pra quem administra o sistema.'
                : 'Seu perfil de Eneagrama ainda não foi mapeado. Fale com a liderança/RH pra ser incluído no Programa Foco — assim que seu tipo for cadastrado, este mapa e o assistente abaixo aparecem automaticamente.'}
            </p>
          </div>
        )}

        {/* Simulação: gerar/atualizar a análise de cargo do Felipe (antes isso
            ficava na lista "Perfis da equipe", removida em 01/10/2026). */}
        {felipe && felipeCargo?.cargo_perfil && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => gerarDica(felipe.funcionario_id)}
              disabled={gerandoId === felipe.funcionario_id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-amber-500/50 text-foreground hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              {gerandoId === felipe.funcionario_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {dicaExibida ? 'Atualizar análise do cargo (simulação)' : 'Gerar análise do cargo (simulação)'}
            </button>
            {erroGeracao && <span className="text-xs text-red-600">{erroGeracao}</span>}
          </div>
        )}

        {(tipoExibido || colegasConversa.length > 0) && (
          <BlocoAssistente
            id="assistente"
            titulo="Conversar com o assistente"
            descricao={
              tipoExibido
                ? 'Traga uma dificuldade real. O assistente pergunta primeiro para entender a situação e só depois sugere, a partir do seu jeito de funcionar.'
                : 'Você não tem tipo próprio mapeado, mas pode escolher um colega para saber a melhor forma de conduzir uma conversa com ele, sem nunca revelar o tipo comportamental dele.'
            }
          >
            {felipe ? (
              <Conversa
                endpoint="/api/assistente-eneagrama"
                montarCorpo={(msg, historico) => ({ pergunta: msg, historico, simularFuncionarioId: felipe.funcionario_id })}
                sugestoes={PERGUNTAS_SUGERIDAS}
                placeholder="O que está difícil para você agora?"
              />
            ) : (
              <ConversaMapaDeSi colegas={colegasConversa} permiteSobreSiMesmo={!!tipo} />
            )}
          </BlocoAssistente>
        )}
      </section>

      {/* Mapa do time. Aberto aos líderes (quem tem liderado direto no
          organograma) em 01/10/2026 — antes só Igor/Priscila. O tipo de cada
          liderado nunca é mostrado, só o resumo do time. */}
      {mostraMapaDoTime && (
        <section id="mapa-do-time" className="space-y-5 scroll-mt-32">
          <CabecalhoMapa
            numero={2}
            tom="amber"
            titulo="Mapa do time"
            descricao="Seu time em conjunto (nunca o tipo de cada pessoa) e orientação para liderar cada liderado direto."
          />
          {lideraExibido ? (
            <>
              <div className="glass-panel rounded-2xl p-5 md:p-6">
                <ComposicaoTime resumo={resumoExibido} />
              </div>
              <BlocoAssistente
                titulo="Conversar sobre um liderado"
                descricao="Escolha um liderado direto e conte a situação. O assistente pergunta primeiro e depois orienta como delegar, dar feedback, desenvolver ou conduzir um conflito com essa pessoa, considerando também o seu jeito de liderar. O tipo dela nunca é revelado."
              >
                {lideradosExibidos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum dos seus liderados diretos tem tipo mapeado ainda.</p>
                ) : felipe ? (
                  <ConversaLiderado
                    pessoas={lideradosExibidos}
                    endpoint="/api/simular-liderar-liderado"
                    corpoExtra={{ liderFuncionarioId: felipe.funcionario_id }}
                  />
                ) : (
                  <ConversaLiderado pessoas={lideradosExibidos} endpoint="/api/liderar-liderado" />
                )}
              </BlocoAssistente>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-muted-foreground text-sm">
                Este mapa só aparece pra quem tem pelo menos 1 liderado direto no organograma — você não lidera
                ninguém hoje, por isso não há nada pra mostrar aqui.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
