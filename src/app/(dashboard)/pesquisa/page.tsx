'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MessageSquareHeart, Plus, Link2, Check, Pencil, Send, Lock, RotateCcw, BarChart3, Trash2, Users, Globe, X, CheckCircle2, Copy, LayoutTemplate, Pause, Play, QrCode, ListChecks, Mail, Repeat,
} from 'lucide-react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, isEmpresaCTZ } from '@/lib/utils'
import {
  duplicarPesquisa, excluirPesquisa, filtroVazio, getFuncionariosPublico, getParticipacoes, getParticipantes, getPerguntas, getPesquisas,
  linkPublicoPesquisa, mudarStatusPesquisa, noFiltro, proximaAplicacao,
  perguntasFaltando, responderPesquisaInterna,
  type Participante, type Pergunta, type Pesquisa, type PesquisaComContagem, type Respostas, type StatusPesquisa,
} from '@/lib/queries/pesquisas'
import { NOME_MODELO } from '@/lib/pesquisaModelos'
import ModalEditarPesquisa from '@/components/pesquisa/ModalEditarPesquisa'
import ResultadosPesquisa from '@/components/pesquisa/ResultadosPesquisa'
import FormularioPesquisa from '@/components/pesquisa/FormularioPesquisa'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import ModalQrCode from '@/components/pesquisa/ModalQrCode'
import ListaConvites from '@/components/pesquisa/ListaConvites'

// Módulo de Pesquisa (pedido 05/10/2026, só CTZ). Administrador monta,
// publica e acompanha; qualquer funcionário responde as internas abertas.
// Regras de acesso de verdade: RLS e funções da migration
// PENDENTE_20261005000000_pesquisas.sql.

const STATUS_STYLE: Record<StatusPesquisa, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-700' },
  aberta: { label: 'Aberta', cls: 'bg-emerald-100 text-emerald-700' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-800' },
  encerrada: { label: 'Encerrada', cls: 'bg-rose-100 text-rose-700' },
}

function BotaoAcao({ onClick, icon: Icon, children, destaque, perigo }: {
  onClick: () => void
  icon: typeof Plus
  children: React.ReactNode
  destaque?: boolean
  perigo?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors',
        destaque ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
          : perigo ? 'border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          : 'border-border text-foreground hover:bg-secondary'
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  )
}

export default function PesquisaPage() {
  const { empresa } = useEmpresaStore()
  const ctz = isEmpresaCTZ(empresa?.company_name)

  const [loading, setLoading] = useState(true)
  const [souAdmin, setSouAdmin] = useState(false)
  const [pesquisas, setPesquisas] = useState<PesquisaComContagem[]>([])
  const [jaRespondi, setJaRespondi] = useState<Set<string>>(new Set())
  // Área e cargo de quem está logado: decidem quais internas são para ele (F37/F38).
  const [meuCadastro, setMeuCadastro] = useState<{ setor: string | null; cargo: string | null }>({ setor: null, cargo: null })
  const [qrCode, setQrCode] = useState<Pesquisa | null>(null)
  const [convites, setConvites] = useState<{ pesquisa: Pesquisa; participantes: Participante[] } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState<string | null>(null)

  const [modalEditar, setModalEditar] = useState<{ open: boolean; pesquisa: Pesquisa | null }>({ open: false, pesquisa: null })
  const [resultados, setResultados] = useState<Pesquisa | null>(null)
  const [excluir, setExcluir] = useState<{ pesquisa: PesquisaComContagem | null; loading: boolean; erro: string | null }>({ pesquisa: null, loading: false, erro: null })

  // Resposta interna
  const [respondendo, setRespondendo] = useState<{ pesquisa: Pesquisa; perguntas: Pergunta[] } | null>(null)
  const [respostas, setRespostas] = useState<Respostas>({})
  const [faltando, setFaltando] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erroResposta, setErroResposta] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!ctz || !empresa) { setLoading(false); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: role }, lista, funcionarios] = await Promise.all([
      supabase.from('user_company_roles').select('permission_level').eq('user_id', user.id).eq('client_id', empresa.id).maybeSingle(),
      getPesquisas(empresa.id),
      getFuncionariosPublico(empresa.id),
    ])
    setSouAdmin(role?.permission_level === 'administrador')
    const eu = funcionarios.find((f) => f.user_id === user.id)
    setMeuCadastro({ setor: eu?.setor ?? null, cargo: eu?.cargo ?? null })
    setPesquisas(lista.data)
    setErro(lista.error)

    const internas = lista.data.filter((p) => p.publico === 'interna' && p.status !== 'rascunho').map((p) => p.id)
    const part = await getParticipacoes(internas)
    setJaRespondi(new Set(Object.entries(part).filter(([, ids]) => ids.includes(user.id)).map(([id]) => id)))
    setLoading(false)
  }, [ctz, empresa])

  useEffect(() => { carregar() }, [carregar])

  async function copiarLink(p: Pesquisa) {
    try {
      await navigator.clipboard.writeText(linkPublicoPesquisa(p.token))
      setLinkCopiado(p.id)
      setTimeout(() => setLinkCopiado((id) => (id === p.id ? null : id)), 2500)
    } catch {
      window.prompt('Copie o link:', linkPublicoPesquisa(p.token))
    }
  }

  async function mudarStatus(p: Pesquisa, status: StatusPesquisa) {
    setAviso(null)
    if (status === 'aberta' && p.status === 'rascunho') {
      const { data } = await getPerguntas(p.id)
      if (!data.length) { setAviso('Adicione pelo menos uma pergunta antes de publicar.'); return }
    }
    const { error } = await mudarStatusPesquisa(p, status)
    if (error) { setAviso(error); return }
    if (status === 'aberta' && p.status === 'rascunho') {
      setAviso(p.publico === 'externa'
        ? 'Pesquisa publicada. Copie o link ou baixe o QR Code no card.'
        : p.publico === 'lista'
          ? 'Pesquisa publicada. Clique em "Convidar" no card para mandar o link de cada pessoa.'
          : 'Pesquisa publicada. Os funcionários já podem responder em Pessoas › Pesquisa.')
    }
    if (status === 'pausada') setAviso('Pesquisa pausada. Ninguém consegue responder até você clicar em "Retomar".')
    carregar()
  }

  async function duplicar(p: Pesquisa, reaplicacao = false) {
    setAviso(null)
    const { error } = await duplicarPesquisa(p, reaplicacao)
    if (error) { setAviso(error); return }
    setAviso(reaplicacao
      ? `Nova aplicação de "${p.titulo}" criada como rascunho, com as mesmas perguntas e o mesmo público. Confira e publique.`
      : `Cópia de "${p.titulo}" criada como rascunho. Ajuste o que precisar e publique.`)
    carregar()
  }

  async function abrirConvites(p: Pesquisa) {
    const { data, error } = await getParticipantes(p.id)
    if (error) { setAviso(error); return }
    setConvites({ pesquisa: p, participantes: data })
  }

  async function confirmarExclusao() {
    if (!excluir.pesquisa) return
    setExcluir((e) => ({ ...e, loading: true, erro: null }))
    const { error } = await excluirPesquisa(excluir.pesquisa.id)
    if (error) { setExcluir((e) => ({ ...e, loading: false, erro: error })); return }
    setExcluir({ pesquisa: null, loading: false, erro: null })
    carregar()
  }

  async function abrirResposta(p: Pesquisa) {
    setErroResposta(null)
    setFaltando([])
    setRespostas({})
    const { data, error } = await getPerguntas(p.id)
    if (error) { setAviso(error); return }
    setRespondendo({ pesquisa: p, perguntas: data })
  }

  async function enviarResposta() {
    if (!respondendo) return
    const falta = perguntasFaltando(respondendo.perguntas, respostas)
    setFaltando(falta)
    if (falta.length) {
      setErroResposta('Responda as perguntas obrigatórias marcadas.')
      document.getElementById(`pergunta-${falta[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    setErroResposta(null)
    const { error } = await responderPesquisaInterna(respondendo.pesquisa.id, respostas)
    setEnviando(false)
    if (error) { setErroResposta(error); return }
    setRespondendo(null)
    setAviso('Obrigado! Sua resposta foi enviada de forma anônima.')
    carregar()
  }

  if (loading) {
    return <div className="h-40 rounded-2xl bg-card/50 border border-border animate-pulse" />
  }

  if (!ctz) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível para esta empresa.</p>
      </div>
    )
  }

  const paraResponder = pesquisas.filter((p) =>
    p.publico === 'interna' && p.status === 'aberta' && !jaRespondi.has(p.id) && noFiltro(p.filtro ?? {}, meuCadastro))
  // F40: reaplicação vencida e ainda sem uma nova aplicação criada a partir desta.
  const reaplicada = new Set(pesquisas.map((p) => p.origem_id).filter(Boolean))
  const hoje = new Date()
  const gerenciaveis = souAdmin ? pesquisas : []

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pesquisa</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Clima, Pulse, NPS, Satisfação e Cultura, com funcionários (anônimas) e com clientes (por link)
            </p>
          </div>
        </div>
        {souAdmin && (
          <button
            onClick={() => setModalEditar({ open: true, pesquisa: null })}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nova pesquisa
          </button>
        )}
      </div>

      {erro && <div className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">{erro}</div>}
      {aviso && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-primary/5 text-foreground border border-primary/20">
          <span>{aviso}</span>
          <button onClick={() => setAviso(null)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar aviso"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Para responder (qualquer funcionário) */}
      {paraResponder.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Para você responder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paraResponder.map((p) => (
              <div key={p.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Anônima · leva poucos minutos</p>
                </div>
                <BotaoAcao onClick={() => abrirResposta(p)} icon={Send} destaque>Responder</BotaoAcao>
              </div>
            ))}
          </div>
        </section>
      )}

      {!souAdmin && paraResponder.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <CheckCircle2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Nenhuma pesquisa esperando sua resposta.</p>
        </div>
      )}

      {/* Gestão (administrador) */}
      {souAdmin && (
        gerenciaveis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma pesquisa criada ainda.</p>
          </div>
        ) : (
          <section className="space-y-3">
            {paraResponder.length > 0 && <h2 className="text-sm font-semibold text-foreground">Todas as pesquisas</h2>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {gerenciaveis.map((p) => {
                const st = STATUS_STYLE[p.status]
                const externa = p.publico === 'externa'
                const proxima = p.status !== 'rascunho' ? proximaAplicacao(p) : null
                const venceu = !!proxima && proxima <= hoje && !reaplicada.has(p.id)
                const filtro = p.filtro ?? {}
                const recorte = filtroVazio(filtro) ? null : [...(filtro.setores ?? []), ...(filtro.cargos ?? []), ...(filtro.clientes ?? [])].join(', ')
                return (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-foreground">{p.titulo}</p>
                        {p.descricao && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{p.descricao}</p>}
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', st.cls)}>{st.label}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <LayoutTemplate className="w-3.5 h-3.5" /> {NOME_MODELO[p.modelo] ?? 'Personalizada'}
                      </span>
                      <span className="flex items-center gap-1">
                        {externa ? <Globe className="w-3.5 h-3.5" /> : p.publico === 'lista' ? <ListChecks className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                        {externa ? (p.pede_identificacao ? 'Link aberto' : 'Link aberto, anônimo') : p.publico === 'lista' ? 'Lista de participantes' : 'Funcionários (anônima)'}
                        {recorte && <span className="text-foreground/80" title={recorte}>· só {recorte.length > 40 ? `${recorte.slice(0, 39)}…` : recorte}</span>}
                      </span>
                      <span className="font-mono">{p.total_respostas} {p.total_respostas === 1 ? 'resposta' : 'respostas'}</span>
                      <span>
                        {p.status === 'rascunho' ? `Criada em ${formatDate(p.created_at)}`
                          : p.status !== 'encerrada' && p.publicada_em ? `Aberta em ${formatDate(p.publicada_em)}`
                          : p.encerrada_em ? `Encerrada em ${formatDate(p.encerrada_em)}` : null}
                      </span>
                    </div>

                    {p.repetir_meses && (
                      venceu ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Repeat className="w-3.5 h-3.5 text-primary" /> Hora de reaplicar (a cada {p.repetir_meses} {p.repetir_meses === 1 ? 'mês' : 'meses'})
                          </span>
                          <button onClick={() => duplicar(p, true)} className="text-xs font-semibold text-primary hover:underline">Reaplicar agora</button>
                        </div>
                      ) : (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Repeat className="w-3.5 h-3.5" /> Repete a cada {p.repetir_meses} {p.repetir_meses === 1 ? 'mês' : 'meses'}
                          {proxima && !reaplicada.has(p.id) && ` · próxima em ${formatDate(proxima.toISOString())}`}
                          {reaplicada.has(p.id) && ' · já reaplicada'}
                        </p>
                      )
                    )}

                    {externa && (p.status === 'aberta' || p.status === 'pausada') && (
                      <div className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground truncate flex-1">{linkPublicoPesquisa(p.token)}</span>
                        <button onClick={() => copiarLink(p)} className="text-xs font-semibold text-primary hover:underline shrink-0 flex items-center gap-1">
                          {linkCopiado === p.id ? <><Check className="w-3.5 h-3.5" /> Copiado</> : 'Copiar'}
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {p.status === 'rascunho' && (
                        <>
                          <BotaoAcao onClick={() => mudarStatus(p, 'aberta')} icon={Send} destaque>Publicar</BotaoAcao>
                          <BotaoAcao onClick={() => setModalEditar({ open: true, pesquisa: p })} icon={Pencil}>Editar</BotaoAcao>
                        </>
                      )}
                      {p.status !== 'rascunho' && (
                        <BotaoAcao onClick={() => setResultados(p)} icon={BarChart3} destaque>Resultados</BotaoAcao>
                      )}
                      {p.publico === 'lista' && (p.status === 'aberta' || p.status === 'pausada') && (
                        <BotaoAcao onClick={() => abrirConvites(p)} icon={Mail}>Convidar</BotaoAcao>
                      )}
                      {externa && (p.status === 'aberta' || p.status === 'pausada') && (
                        <BotaoAcao onClick={() => setQrCode(p)} icon={QrCode}>QR Code</BotaoAcao>
                      )}
                      {p.status === 'aberta' && <BotaoAcao onClick={() => mudarStatus(p, 'pausada')} icon={Pause}>Pausar</BotaoAcao>}
                      {p.status === 'pausada' && <BotaoAcao onClick={() => mudarStatus(p, 'aberta')} icon={Play}>Retomar</BotaoAcao>}
                      {(p.status === 'aberta' || p.status === 'pausada') && <BotaoAcao onClick={() => mudarStatus(p, 'encerrada')} icon={Lock}>Encerrar</BotaoAcao>}
                      {p.status === 'encerrada' && <BotaoAcao onClick={() => mudarStatus(p, 'aberta')} icon={RotateCcw}>Reabrir</BotaoAcao>}
                      <BotaoAcao onClick={() => duplicar(p)} icon={Copy}>Duplicar</BotaoAcao>
                      <BotaoAcao onClick={() => setExcluir({ pesquisa: p, loading: false, erro: null })} icon={Trash2} perigo>Excluir</BotaoAcao>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      )}

      {empresa && (
        <ModalEditarPesquisa
          open={modalEditar.open}
          clientId={empresa.id}
          empresaNome={empresa.company_name}
          pesquisa={modalEditar.pesquisa}
          onClose={() => setModalEditar({ open: false, pesquisa: null })}
          onSuccess={() => { setModalEditar({ open: false, pesquisa: null }); carregar() }}
        />
      )}

      <ResultadosPesquisa pesquisa={resultados} onClose={() => setResultados(null)} />

      {qrCode && <ModalQrCode titulo={qrCode.titulo} link={linkPublicoPesquisa(qrCode.token)} onClose={() => setQrCode(null)} />}

      {convites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConvites(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-base font-semibold text-foreground">Convidar · {convites.pesquisa.titulo}</h2>
              <button onClick={() => setConvites(null)} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Cada pessoa tem um link próprio e responde sem login. &quot;Convidar&quot; abre o seu e-mail com a mensagem pronta;
              para muita gente, baixe a planilha e use a mala direta do Gmail ou do Outlook.
            </p>
            <ListaConvites
              pesquisa={convites.pesquisa}
              participantes={convites.participantes}
              onMudou={async () => {
                const { data } = await getParticipantes(convites.pesquisa.id)
                setConvites((c) => (c ? { ...c, participantes: data } : c))
              }}
            />
          </div>
        </div>
      )}

      <ModalConfirmarExclusao
        open={!!excluir.pesquisa}
        titulo={`Excluir "${excluir.pesquisa?.titulo ?? ''}"?`}
        descricao={excluir.pesquisa?.total_respostas
          ? `As ${excluir.pesquisa.total_respostas} respostas também serão apagadas. Não dá para desfazer.`
          : 'Não dá para desfazer.'}
        loading={excluir.loading}
        erro={excluir.erro}
        onConfirmar={confirmarExclusao}
        onClose={() => setExcluir({ pesquisa: null, loading: false, erro: null })}
      />

      {respondendo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRespondendo(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-lg font-semibold text-foreground">{respondendo.pesquisa.titulo}</h2>
              <button onClick={() => setRespondendo(null)} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            {respondendo.pesquisa.descricao && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{respondendo.pesquisa.descricao}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 mb-4">
              Sua resposta é anônima: quem organiza vê só que você respondeu, não o que respondeu.
            </p>
            <FormularioPesquisa perguntas={respondendo.perguntas} respostas={respostas} onChange={setRespostas} faltando={faltando} />
            {erroResposta && <div className="mt-4 px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erroResposta}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRespondendo(null)} className="px-4 py-2 text-sm rounded-xl border border-border text-foreground hover:bg-secondary">Cancelar</button>
              <button onClick={enviarResposta} disabled={enviando} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60">
                {enviando ? 'Enviando...' : 'Enviar resposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
