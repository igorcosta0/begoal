'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { getSinaisVitais, deleteSinalVital, getKrsParaVinculo, marcarSinalVitalRemovido, getSeriesSinaisVitais } from '@/lib/queries/sinais-vitais'
import { getSetoresByEmpresa, getObjetivos, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import SvCard from '@/components/sinais-vitais/SvCard'
import ModalCriarSv from '@/components/sinais-vitais/ModalCriarSv'
import ModalEditarSv from '@/components/sinais-vitais/ModalEditarSv'
import ModalLancarSv from '@/components/sinais-vitais/ModalLancarSv'
import ModalHistoricoSv from '@/components/sinais-vitais/ModalHistoricoSv'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { Activity, Plus, Archive, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { mensagemErroExclusao, mensagemErroGravacao, formatValor, formatPercent, getProgressColor, cn } from '@/lib/utils'
import { progressoSinalVital } from '@/lib/okrProgresso'

export default function SinaisVitaisPage() {
  const { empresa } = useEmpresaStore()

  const [svs, setSvs] = useState<any[]>([])
  const [setores, setSetores] = useState<any[]>([])
  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [setorId, setSetorId] = useState<string | null>(null)
  const [objetivoId, setObjetivoId] = useState<string | null>(null)
  const [krId, setKrId] = useState<string | null>(null)
  const [responsavelId, setResponsavelId] = useState<string | null>(null)
  const [removidosAberto, setRemovidosAberto] = useState(false)
  const [movendoId, setMovendoId] = useState<string | null>(null)
  const [erroRemovidos, setErroRemovidos] = useState<string | null>(null)
  // Sem filtro os cards ficam escondidos até clicar em "Ver todos"; com filtro aparecem direto.
  const [verTodos, setVerTodos] = useState(false)

  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalLancar, setModalLancar] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalHistorico, setModalHistorico] = useState<{ open: boolean; sv: any | null }>({ open: false, sv: null })
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; sv: any | null; loading: boolean; erro: string | null }>({ open: false, sv: null, loading: false, erro: null })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const [{ data: svData }, { data: setoresData }, { data: objsData }, { data: krsData }, { data: funcsData }] = await Promise.all([
      getSinaisVitais(empresa.id),
      getSetoresByEmpresa(empresa.id),
      getObjetivos(empresa.id),
      getKrsParaVinculo(empresa.id),
      getFuncionariosByEmpresa(empresa.id),
    ])
    const series = await getSeriesSinaisVitais((svData ?? []).map((sv: any) => sv.id))
    setSvs((svData ?? []).map((sv: any) => ({ ...sv, serie: series[sv.id] ?? [] })))
    setSetores(setoresData ?? [])
    setObjetivos(objsData ?? [])
    setKrs(krsData ?? [])
    setFuncionarios(funcsData ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Removidos (aguardando validação) ficam fora da lista principal e dos filtros.
  const svsRemovidos = svs
    .filter((sv) => sv.removido_em)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))

  const svsFiltrados = svs
    .filter((sv) => !sv.removido_em)
    .filter((sv) => !busca || sv.titulo.toLowerCase().includes(busca.toLowerCase()))
    .filter((sv) => !setorId || sv.setor_id === setorId)
    .filter((sv) => !objetivoId || sv.objetivo_id === objetivoId)
    .filter((sv) => !krId || sv.kr_id === krId)
    .filter((sv) => !responsavelId || sv.responsavel_id === responsavelId)
    .map((sv) => ({
      ...sv,
      responsavel: sv.funcionarios,
      setor: sv.setores ? { name: sv.setores.name } : null,
      objetivo: sv.objetivos ? { titulo: sv.objetivos.titulo } : null,
      kr: sv.krs ? { titulo: sv.krs.titulo } : null,
    }))

  // Resumo geral (sem filtro): na meta, abaixo, sem lançamentos e progresso médio.
  const comLancamento = svsFiltrados.filter((sv) => (sv.serie ?? []).length > 0)
  const naMeta = comLancamento.filter((sv) => progressoSinalVital(sv) >= 100).length
  const mediaProgresso = comLancamento.length
    ? comLancamento.reduce((a, sv) => a + progressoSinalVital(sv), 0) / comLancamento.length
    : null

  // Só KRs ativos do objetivo filtrado (ou de todos, sem filtro de objetivo).
  const krsDoFiltro = krs.filter((k) => !k.concluido && (!objetivoId || k.objetivo_id === objetivoId))

  function limparFiltros() {
    setBusca('')
    setSetorId(null)
    setObjetivoId(null)
    setKrId(null)
    setResponsavelId(null)
  }

  async function handleExcluir() {
    if (!modalExcluir.sv) return
    setModalExcluir((prev) => ({ ...prev, loading: true, erro: null }))
    const { error } = await deleteSinalVital(modalExcluir.sv.id)
    if (error) {
      setModalExcluir((prev) => ({ ...prev, loading: false, erro: mensagemErroExclusao(error, 'lançamentos') }))
      return
    }
    setModalExcluir({ open: false, sv: null, loading: false, erro: null })
    fetchData()
  }

  async function handleMarcarRemovido(sv: any, removido: boolean) {
    setMovendoId(sv.id)
    setErroRemovidos(null)
    const { data, error } = await marcarSinalVitalRemovido(sv.id, removido)
    const erro = mensagemErroGravacao(error, data?.length)
    setMovendoId(null)
    if (erro) {
      setErroRemovidos(erro)
      return
    }
    fetchData()
  }

  const temFiltros = busca || setorId || objetivoId || krId || responsavelId
  const classeFiltro =
    'px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Sinais Vitais</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {empresa?.company_name} — KPIs contínuos da empresa
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Novo Sinal Vital
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar sinal vital..."
          className="w-full max-w-sm px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={objetivoId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null
            setObjetivoId(id)
            // KR filtrado precisa ser do objetivo escolhido.
            if (id && krId && krs.find((k) => k.id === krId)?.objetivo_id !== id) setKrId(null)
          }}
          className={classeFiltro}
        >
          <option value="">Todos os objetivos</option>
          {objetivos.filter((o) => !o.concluido).map((o) => (
            <option key={o.id} value={o.id}>{o.titulo}</option>
          ))}
        </select>
        <select value={krId ?? ''} onChange={(e) => setKrId(e.target.value || null)} className={classeFiltro}>
          <option value="">Todos os KRs</option>
          {krsDoFiltro.map((k) => (
            <option key={k.id} value={k.id}>{k.titulo}</option>
          ))}
        </select>
        <select value={responsavelId ?? ''} onChange={(e) => setResponsavelId(e.target.value || null)} className={classeFiltro}>
          <option value="">Todos os responsáveis</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>{f.full_name}</option>
          ))}
        </select>
        <select value={setorId ?? ''} onChange={(e) => setSetorId(e.target.value || null)} className={classeFiltro}>
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {temFiltros && (
          <button
            onClick={limparFiltros}
            className="px-3 py-2 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : svsFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">
            {temFiltros ? 'Nenhum sinal vital encontrado para este filtro.' : 'Nenhum sinal vital cadastrado ainda.'}
          </p>
          {!temFiltros && (
            <button
              onClick={() => setModalCriar(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" /> Criar primeiro sinal vital
            </button>
          )}
        </div>
      ) : (
        <div data-tour="tour-sv-grid" className="space-y-4">
          {/* Resumo: sem filtro, os cards ficam escondidos até clicar em "Ver todos" */}
          {!temFiltros && (
            <section className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">
                    {svsFiltrados.length} sina{svsFiltrados.length !== 1 ? 'is' : 'l'} vita{svsFiltrados.length !== 1 ? 'is' : 'l'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {comLancamento.length > 0 && (
                      <>
                        <span className="text-emerald-600 font-medium">{naMeta} na meta</span>
                        {comLancamento.length - naMeta > 0 && (
                          <>{' · '}<span className="text-amber-600 font-medium">{comLancamento.length - naMeta} abaixo da meta</span></>
                        )}
                        {svsFiltrados.length - comLancamento.length > 0 && ' · '}
                      </>
                    )}
                    {svsFiltrados.length - comLancamento.length > 0 && `${svsFiltrados.length - comLancamento.length} sem lançamentos`}
                  </p>
                  {!verTodos && (
                    <p className="text-xs text-muted-foreground mt-1.5">Escolha um filtro acima para ver os sinais vitais.</p>
                  )}
                </div>
                <button
                  onClick={() => setVerTodos((v) => !v)}
                  aria-expanded={verTodos}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {verTodos ? 'Ocultar' : 'Ver todos'}
                  {verTodos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso médio</span>
                  <span className="font-medium text-foreground">{mediaProgresso === null ? 'Sem lançamentos' : formatPercent(mediaProgresso)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', mediaProgresso === null ? 'bg-muted' : getProgressColor(mediaProgresso))}
                    style={{ width: `${Math.min(mediaProgresso ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {(temFiltros || verTodos) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {svsFiltrados.map((sv) => (
                <SvCard
                  key={sv.id}
                  sv={sv}
                  onLancar={(sv) => setModalLancar({ open: true, sv })}
                  onEditar={(sv) => setModalEditar({ open: true, sv })}
                  onRemover={(sv) => handleMarcarRemovido(sv, true)}
                  onExcluir={(sv) => setModalExcluir({ open: true, sv, loading: false, erro: null })}
                  onVerHistorico={(sv) => setModalHistorico({ open: true, sv })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Removidos: aguardando validação antes de excluir de vez */}
      {!loading && svsRemovidos.length > 0 && (
        <section className="rounded-2xl border border-dashed border-border bg-card/50">
          <button
            onClick={() => setRemovidosAberto((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Removidos <span className="text-muted-foreground font-normal">· {svsRemovidos.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Aguardando validação. Não aparecem na lista nem na Início; os lançamentos continuam guardados.
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${removidosAberto ? 'rotate-180' : ''}`} />
          </button>
          {removidosAberto && (
            <div className="border-t border-border">
              {erroRemovidos && <p className="px-5 pt-3 text-xs text-destructive">{erroRemovidos}</p>}
              <ul className="divide-y divide-border">
                {svsRemovidos.map((sv) => (
                  <li key={sv.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{sv.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          sv.funcionarios?.full_name,
                          sv.objetivos?.titulo ?? 'Sem objetivo',
                          sv.valor_atual != null ? 'Atual: ' + formatValor(sv.valor_atual, sv.tipo_valor) : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      onClick={() => setModalHistorico({ open: true, sv })}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Histórico
                    </button>
                    <button
                      onClick={() => handleMarcarRemovido(sv, false)}
                      disabled={movendoId === sv.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Modais */}
      <ModalCriarSv
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        onSuccess={fetchData}
      />
      <ModalEditarSv
        open={modalEditar.open}
        sv={modalEditar.sv}
        onClose={() => setModalEditar({ open: false, sv: null })}
        onSuccess={fetchData}
      />
      <ModalLancarSv
        open={modalLancar.open}
        sv={modalLancar.sv}
        onClose={() => setModalLancar({ open: false, sv: null })}
        onSuccess={fetchData}
      />
      <ModalHistoricoSv
        open={modalHistorico.open}
        sv={modalHistorico.sv}
        onClose={() => setModalHistorico({ open: false, sv: null })}
        onLancar={(sv) => setModalLancar({ open: true, sv })}
        onAlterado={fetchData}
      />
      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir Sinal Vital"
        descricao="Todos os lançamentos deste sinal vital também serão excluídos."
        loading={modalExcluir.loading}
        erro={modalExcluir.erro}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, sv: null, loading: false, erro: null })}
      />
    </div>
  )
}