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
import { Sparkles, Loader2, ChevronDown, ChevronRight, Wand2, MessageCircle } from 'lucide-react'
import Conversa from '@/components/autoconhecimento/Conversa'
import {
  CabecalhoMapa,
  PerfilMapaDeSi,
  ComposicaoTime,
  SeletorPessoas,
  formatarSequencia,
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

// Moldura da conversa com o assistente (cabeçalho + conteúdo). Fechada até a
// pessoa abrir; fechar só esconde (hidden), a conversa continua guardada.
function BlocoAssistente({ titulo, descricao, children, id }: { titulo: string; descricao: string; children: React.ReactNode; id?: string }) {
  const [aberto, setAberto] = useState(false)
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

// Bloco da simulação de administrador (só Igor/Priscila veem).
function BlocoSimulacao({ descricao, children }: { descricao: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          Simulação (visão de administrador) — só você/Priscila veem este bloco
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
      </div>
      {children}
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
  // Mapa 1 (pedido 14/09/2026): a análise cargo x Eneagrama que o admin
  // piloto gera em "Perfis da equipe" (dicas_texto) também vai aparecer pra
  // cada pessoa sobre si mesma aqui — a RLS já libera a própria linha pra
  // QUALQUER usuário desde 01/09 (não é trava técnica). Mas o Igor pediu
  // (mesmo dia) pra manter a EXIBIÇÃO restrita só a ele/Priscila por
  // enquanto, pra validar o tom do texto antes de abrir geral — por isso
  // este flag é mais estreito que souAdminPiloto (que já inclui a Letícia).
  const [souVeDicaMapa1, setSouVeDicaMapa1] = useState(false)
  const [minhaDica, setMinhaDica] = useState<{ texto: string; geradoEm: string; cargo: string | null } | null>(null)

  // Mapa 2 "Liderando o time": só aparece pra quem tem liderado direto no
  // organograma (funcionarios.gestor_id) — ver sou_lider_de_alguem() no
  // banco (migration PENDENTE_20260910010000). Fala do tipo de OUTRA
  // pessoa (o liderado), então só é carregado/mostrado pra quem também é
  // souAdminPiloto (ver decisão abaixo).
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

  // Visão de administrador do PROTÓTIPO — controla 2 coisas diferentes desde
  // 10/09/2026: (1) a tabela "Perfis da equipe"/cruzamento cargo x Eneagrama
  // de sempre, e (2) agora também os Mapas 2 e 3 (que falam do tipo de OUTRA
  // pessoa, não só de quem pergunta). O Mapa 1 já graduou pra CTZ inteira —
  // só ele não depende desta flag. Decisão do Igor: mesmo com a trava técnica
  // funcionando (o tipo de terceiros nunca é devolvido ao navegador), abrir
  // 2 e 3 geral ainda não foi testado com uso real de mais gente, então
  // ficam junto do piloto por enquanto.
  const [souAdminPiloto, setSouAdminPiloto] = useState(false)
  const [todosPerfis, setTodosPerfis] = useState<PerfilEneagramaComNome[]>([])
  const [cargosPerfil, setCargosPerfil] = useState<Record<string, FuncionarioCargoPerfil>>({})
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [erroGeracao, setErroGeracao] = useState<string | null>(null)

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

      const { perfil, error } = await getMeuPerfilEneagrama()
      if (error) setErroPerfil(error)
      else if (perfil) {
        setTipoNumero(perfil.tipo)
        setSubtipoSequencia(perfil.subtipo_sequencia)
      }

      if (veDicaMapa1) {
        getMinhaDicaCargo().then(({ dicas }) => setMinhaDica(dicas))
      }

      // Mapas 2 e 3 falam do tipo de OUTRA pessoa (não só de quem pergunta,
      // como o Mapa 1) — pedido explícito do Igor (10/09/2026) pra manter
      // isso restrito a Igor/Priscila por enquanto, mesmo com a trava
      // técnica funcionando (a rede de segurança do prompt nunca foi testada
      // com uso real de mais gente). Por isso só busca colegas/liderados
      // quando é piloto — pra qualquer outra pessoa nem vale disparar a
      // chamada, já que as rotas de API dos Mapas 2/3 também recusam
      // (403) quem não é piloto.
      if (piloto) {
        const [{ souLider: liderDeAlguem }, { colegas: colegasMapeados }, { perfis, error: erroTodos }, { mapa }] = await Promise.all([
          getSouLiderDeAlguem(),
          getColegasComPerfilMapeado(empresa.id),
          getTodosPerfisEneagrama(empresa.id),
          getTodosCargosPerfil(empresa.id),
        ])
        setSouLider(liderDeAlguem)
        setColegas(colegasMapeados)
        if (liderDeAlguem) {
          getMeusLideradosComPerfilMapeado().then(({ liderados: l }) => setLiderados(l))
          getResumoTimeLiderado().then(({ resumo }) => setResumoTime(resumo))
        }
        if (!erroTodos) setTodosPerfis(perfis)
        setCargosPerfil(mapa)
        if (veDicaMapa1) {
          getOrganogramaEmpresa(empresa.id).then(({ organograma: o }) => setOrganograma(o))
        }
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
  // só lá). Graduou de "só piloto" pra "toda a CTZ" em 10/09/2026 — a visão
  // de administrador do protótipo (Perfis da equipe/cruzamento cargo)
  // continua restrita mais abaixo, dentro da própria página.
  if (!ctz) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  const tipo = tipoNumero ? TIPOS_ENEAGRAMA[tipoNumero] : null

  // Simulação de administrador (pedido 14/09/2026): como os mapas apareceriam
  // pro Felipe Marques Santos, sem logar como ele — só com os dados que a
  // visão de admin ("Perfis da equipe") já carregou, nenhuma query nova.
  const felipe = souVeDicaMapa1 ? todosPerfis.find((p) => p.full_name === 'Felipe Marques Santos') : undefined

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

      {/* Atalhos entre as partes da página. */}
      <nav className="sticky top-[76px] z-30 -mx-1 px-1 py-2 bg-background/85 backdrop-blur flex gap-2 overflow-x-auto text-xs font-semibold -mt-6">
        <a href="#mapa-de-si" className="shrink-0 px-3 py-1.5 rounded-full bg-primary text-primary-foreground">1 · Mapa de si</a>
        {(tipo || colegas.length > 0) && (
          <a href="#assistente" className="shrink-0 px-3 py-1.5 rounded-full bg-card border border-border text-foreground hover:border-primary/40 transition-colors">Conversar com o assistente</a>
        )}
        {souAdminPiloto && (
          <a href="#mapa-do-time" className="shrink-0 px-3 py-1.5 rounded-full bg-card border border-border text-foreground hover:border-amber-500/50 transition-colors">2 · Mapa do time</a>
        )}
      </nav>

      {erroPerfil && (
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

        {tipo ? (
          <PerfilMapaDeSi tipo={tipo} subtipoSequencia={subtipoSequencia} dica={souVeDicaMapa1 ? minhaDica : null} cargo={minhaDica?.cargo} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {souAdminPiloto
                ? 'Você não tem um perfil de Eneagrama próprio mapeado — normal pra quem administra o sistema. Confira abaixo o perfil de toda a equipe.'
                : 'Seu perfil de Eneagrama ainda não foi mapeado. Fale com a liderança/RH pra ser incluído no Programa Foco — assim que seu tipo for cadastrado, este mapa e o assistente abaixo aparecem automaticamente.'}
            </p>
          </div>
        )}

        {/* Aparece se há tipo próprio OU colega pra conversar (achado 14/09/2026). */}
        {(tipo || colegas.length > 0) && (
          <BlocoAssistente
            id="assistente"
            titulo="Conversar com o assistente"
            descricao={
              tipo
                ? 'Traga uma dificuldade real. O assistente pergunta primeiro para entender a situação e só depois sugere, a partir do seu jeito de funcionar.'
                : 'Você não tem tipo próprio mapeado, mas pode escolher um colega para saber a melhor forma de conduzir uma conversa com ele, sem nunca revelar o tipo comportamental dele.'
            }
          >
            <ConversaMapaDeSi colegas={colegas} permiteSobreSiMesmo={!!tipo} />
          </BlocoAssistente>
        )}

        {/* Simulação (pedido 14/09/2026): a análise de cargo x Eneagrama ainda é
            restrita a Igor/Priscila (souVeDicaMapa1); este bloco mostra como a
            tela ficaria pro Felipe Marques Santos. */}
        {souVeDicaMapa1 && (() => {
          const felipeTipo = felipe ? TIPOS_ENEAGRAMA[felipe.tipo] : null
          const felipeCargo = felipe ? cargosPerfil[felipe.funcionario_id] : undefined
          const felipeDica = felipeCargo?.dicas_texto && felipeCargo.dicas_gerado_em
            ? { texto: felipeCargo.dicas_texto, geradoEm: felipeCargo.dicas_gerado_em }
            : null
          return (
            <BlocoSimulacao descricao="Como o Mapa de si apareceria pro Felipe Marques Santos, se ele abrisse a própria tela agora — pra validar o tom da análise antes de abrir esse recurso pra CTZ inteira.">
              {felipeTipo ? (
                <PerfilMapaDeSi tipo={felipeTipo} subtipoSequencia={felipe!.subtipo_sequencia} dica={felipeDica} cargo={felipeCargo?.cargo_perfil?.cargo_base} />
              ) : (
                <p className="text-xs text-muted-foreground">Felipe Marques Santos não apareceu nos perfis carregados — confira &quot;Perfis da equipe&quot; mais abaixo.</p>
              )}
            </BlocoSimulacao>
          )
        })()}
      </section>

      {/* Mapa do time. Fala do tipo de OUTRA pessoa (o liderado), por isso o
          Igor pediu (10/09/2026) pra manter restrito a Igor/Priscila por
          enquanto, além de exigir liderado. O cabeçalho sempre aparece pra
          piloto; sem liderado, só o conteúdo some, com o motivo (14/09/2026). */}
      {souAdminPiloto && (
        <section id="mapa-do-time" className="space-y-5 scroll-mt-32">
          <CabecalhoMapa
            numero={2}
            tom="amber"
            titulo="Mapa do time"
            descricao="Seu time em conjunto (nunca o tipo de cada pessoa) e orientação para liderar cada liderado direto."
          />
          {souLider ? (
            <>
              <div className="glass-panel rounded-2xl p-5 md:p-6">
                <ComposicaoTime resumo={resumoTime} />
              </div>
              <BlocoAssistente
                titulo="Conversar sobre um liderado"
                descricao="Escolha um liderado direto e conte a situação. O assistente pergunta primeiro e depois orienta como delegar, dar feedback, desenvolver ou conduzir um conflito com essa pessoa, considerando também o seu jeito de liderar. O tipo dela nunca é revelado."
              >
                {liderados.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum dos seus liderados diretos tem tipo mapeado ainda.</p>
                ) : (
                  <ConversaLiderado pessoas={liderados} endpoint="/api/liderar-liderado" />
                )}
              </BlocoAssistente>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-muted-foreground text-sm">
                Este mapa só aparece pra quem tem pelo menos 1 liderado direto no organograma — você não lidera
                ninguém em nenhuma empresa hoje, por isso não há nada pra mostrar aqui.
              </p>
            </div>
          )}

          {/* Simulação (pedido 14/09/2026): organograma + todosPerfis (já
              carregados) pra achar os liderados do Felipe Marques e montar o
              mesmo resumo agregado — nenhuma RPC nova. */}
          {souVeDicaMapa1 && (() => {
            if (!felipe) {
              return (
                <BlocoSimulacao descricao="Felipe Marques Santos não apareceu nos perfis carregados — confira &quot;Perfis da equipe&quot; mais abaixo.">
                  {null}
                </BlocoSimulacao>
              )
            }
            const idsLiderados = organograma.filter((o) => o.gestor_id === felipe.funcionario_id).map((o) => o.funcionario_id)
            const perfisLiderados = todosPerfis.filter((p) => idsLiderados.includes(p.funcionario_id))
            const resumoSimulado: ResumoTime = {
              instintivo: perfisLiderados.filter((p) => [8, 9, 1].includes(p.tipo)).length,
              emocional: perfisLiderados.filter((p) => [2, 3, 4].includes(p.tipo)).length,
              racional: perfisLiderados.filter((p) => [5, 6, 7].includes(p.tipo)).length,
              totalLiderados: idsLiderados.length,
              totalMapeados: perfisLiderados.length,
            }
            return (
              <BlocoSimulacao descricao="Como o Mapa do time apareceria pro Felipe Marques Santos — resumo do time e a conversa de verdade, sem precisar logar como ele.">
                <div className="space-y-4">
                  <ComposicaoTime resumo={resumoSimulado} />
                  {perfisLiderados.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum liderado do Felipe Marques tem tipo mapeado ainda.</p>
                  ) : (
                    <ConversaLiderado
                      pessoas={perfisLiderados}
                      endpoint="/api/simular-liderar-liderado"
                      corpoExtra={{ liderFuncionarioId: felipe.funcionario_id }}
                    />
                  )}
                </div>
              </BlocoSimulacao>
            )
          })()}
        </section>
      )}

      {/* Visão de administrador do protótipo — só Igor/Priscila, ver
          souAdminPiloto acima. Não faz parte dos 3 mapas do pedido, é a
          ferramenta de conferência de mapeamento que já existia. */}
      {souAdminPiloto && todosPerfis.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-foreground">Perfis da equipe (visão de administrador)</h2>
          <p className="text-xs text-muted-foreground">
            Clique numa linha pra ver o cruzamento com o perfil de cargo (competências exigidas e o que o Eneagrama ajuda/atrapalha).
          </p>
          {erroGeracao && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
              {erroGeracao}
            </div>
          )}
          {/* Lista em vez de tabela (achado 14/09/2026): com 4 colunas de
              texto (nome/tipo/sequência de instintos/cargo), uma tabela
              exigia rolagem horizontal pra ler em qualquer tela mais estreita
              que o conteúdo — aqui os campos quebram linha naturalmente
              (flex-wrap) em vez de forçar nowrap. */}
          <div className="divide-y divide-border/50">
            {todosPerfis.map((p) => {
              const cargoInfo = cargosPerfil[p.funcionario_id]
              const cp = cargoInfo?.cargo_perfil
              const aberto = expandidoId === p.funcionario_id
              return (
                <div key={p.funcionario_id}>
                  <button
                    type="button"
                    onClick={() => setExpandidoId(aberto ? null : p.funcionario_id)}
                    className="w-full flex items-start gap-2 py-2.5 text-left hover:bg-accent/50 rounded-lg px-1.5 -mx-1.5 transition-colors"
                  >
                    <span className="text-muted-foreground mt-0.5 shrink-0">
                      {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm text-foreground font-medium">{p.full_name}</span>
                        <span className="text-xs text-muted-foreground">Tipo {p.tipo}</span>
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span>{p.subtipo_sequencia ? formatarSequencia(p.subtipo_sequencia) : '—'}</span>
                        <span>{cp ? `${cp.cargo_base}${cp.nivel ? ` (${cp.nivel})` : ''}` : 'sem perfil de cargo mapeado'}</span>
                      </span>
                    </span>
                  </button>
                  {aberto && (
                    <div className="pb-4 px-1.5">
                      <div className="bg-secondary/30 rounded-xl p-4">
                        {!cp ? (
                              <p className="text-xs text-muted-foreground">
                                Essa pessoa ainda não tem perfil de cargo mapeado (cargo dela não bate com nenhuma linha
                                preenchida na planilha de cargos, ou é um cargo composto de sócio/CEO) — só o tipo de
                                Eneagrama está disponível.
                              </p>
                            ) : (
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Sumário do cargo</p>
                                    <p className="text-foreground">{cp.sumario}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Autonomia esperada</p>
                                    <p className="text-foreground">{cp.autonomia ?? '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Competências técnicas</p>
                                    <p className="text-foreground whitespace-pre-line">{cp.competencias_tecnicas ?? '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Competências comportamentais</p>
                                    <p className="text-foreground whitespace-pre-line">{cp.competencias_comportamentais ?? '—'}</p>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-border/50">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                      Análise do Eneagrama para este cargo
                                    </p>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); gerarDica(p.funcionario_id) }}
                                      disabled={gerandoId === p.funcionario_id}
                                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                                    >
                                      {gerandoId === p.funcionario_id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Wand2 className="w-3.5 h-3.5" />}
                                      {cargoInfo?.dicas_texto ? 'Atualizar análise' : 'Gerar análise'}
                                    </button>
                                  </div>
                                  {cargoInfo?.dicas_texto ? (
                                    <>
                                      <p className="text-foreground whitespace-pre-line">{cargoInfo.dicas_texto}</p>
                                      {cargoInfo.dicas_gerado_em && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Gerado em {new Date(cargoInfo.dicas_gerado_em).toLocaleString('pt-BR')}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Ainda não gerada — clique em "Gerar análise".</p>
                                  )}
                                </div>
                              </div>
                            )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
