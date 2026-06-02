'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import {
  getQuemSomos, upsertQuemSomos,
  getCompetencias, addCompetencia, deleteCompetencia,
  getClientesEstrategicos, upsertClienteEstrategico, deleteClienteEstrategico,
  getMercados, upsertMercado, deleteMercado, criarObjetivoDoMercado,
  getICP, upsertICP,
} from '@/lib/queries/estrategia'

// ─── Tipos ────────────────────────────────────────────────────
type QuemSomosData = Record<string, string | string[]>
type Competencia = { id: string; descricao: string }
type ClienteEstrategico = { id: string; nome: string; segmento: string; faturamento_pct: number; tags: string[] }
type Mercado = { id: string; nome: string; potencial: string; prioridade: number }
type ICPData = Record<string, string>

const ABAS = ['Quem Somos', 'Melhores Clientes', 'Mercados Potenciais', 'Mapeamento de Mercados', 'ICP']

const NIVEIS_POTENCIAL = ['Baixo', 'Médio', 'Alto', 'Muito Alto']

// ─── Helpers ──────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  function adicionar() {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionar())}
          placeholder="Digite e pressione Enter"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={adicionar} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-full">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="text-muted-foreground hover:text-foreground">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ArrayInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  function adicionar() {
    const val = input.trim()
    if (val && !values.includes(val)) onChange([...values, val])
    setInput('')
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionar())}
          placeholder="Digite e pressione Enter"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={adicionar} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">+</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-full">
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="text-muted-foreground hover:text-foreground">×</button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Seção: Quem Somos ────────────────────────────────────────
function QuemSomos({ clientId }: { clientId: string }) {
  const [dados, setDados] = useState<QuemSomosData>({})
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [novaComp, setNovaComp] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const [qs, comps] = await Promise.all([getQuemSomos(clientId), getCompetencias(clientId)])
    if (qs) setDados(qs as QuemSomosData)
    setCompetencias(comps as Competencia[])
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const err = await upsertQuemSomos(clientId, dados)
    setMsg(err ? 'Erro ao salvar.' : 'Salvo com sucesso!')
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function adicionarComp() {
    if (!novaComp.trim()) return
    await addCompetencia(clientId, novaComp.trim())
    setNovaComp('')
    carregar()
  }

  async function removerComp(id: string) {
    await deleteCompetencia(id)
    carregar()
  }

  function campo(key: string, label: string, placeholder = '') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <textarea
          rows={2}
          value={(dados[key] as string) ?? ''}
          onChange={e => setDados(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-foreground">Reconhecimento do Negócio</h3>
        {campo('problemas_resolve', 'Que problemas você resolve?', 'Ex: Ajudamos empresas a organizar sua gestão estratégica...')}
        {campo('tarefas_facilita', 'Quais tarefas você facilita?', 'Ex: Planejamento de OKRs, acompanhamento de metas...')}
        {campo('ganhos_gera', 'Quais ganhos você gera?', 'Ex: Clareza estratégica, engajamento do time...')}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-foreground">Competências</h3>
        {campo('o_que_faz', 'O que você faz?', 'Ex: Desenvolvemos software de gestão...')}
        {campo('diferencial', 'Qual seu diferencial?', 'Ex: Simplicidade e foco em resultado...')}
        {campo('por_que_contratam', 'Por que as pessoas te contratam?', 'Ex: Referência no mercado, suporte próximo...')}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Competências-chave</label>
          <div className="flex gap-2">
            <input
              value={novaComp}
              onChange={e => setNovaComp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarComp())}
              placeholder="Ex: Gestão de projetos, UX/UI..."
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={adicionarComp} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {competencias.map(c => (
              <span key={c.id} className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-full">
                {c.descricao}
                <button onClick={() => removerComp(c.id)} className="text-muted-foreground hover:text-foreground">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-foreground">Concorrentes e Referências</h3>
        <ArrayInput
          label="Concorrentes Locais"
          values={(dados.concorrentes_locais as string[]) ?? []}
          onChange={v => setDados(prev => ({ ...prev, concorrentes_locais: v }))}
        />
        <ArrayInput
          label="Concorrentes Nacionais"
          values={(dados.concorrentes_nacionais as string[]) ?? []}
          onChange={v => setDados(prev => ({ ...prev, concorrentes_nacionais: v }))}
        />
        <ArrayInput
          label="Concorrentes Globais"
          values={(dados.concorrentes_globais as string[]) ?? []}
          onChange={v => setDados(prev => ({ ...prev, concorrentes_globais: v }))}
        />
        <ArrayInput
          label="Principais Referências do Mercado"
          values={(dados.referencias_mercado as string[]) ?? []}
          onChange={v => setDados(prev => ({ ...prev, referencias_mercado: v }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}

// ─── Seção: Melhores Clientes ─────────────────────────────────
function MelhoresClientes({ clientId }: { clientId: string }) {
  const [clientes, setClientes] = useState<ClienteEstrategico[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<ClienteEstrategico | null>(null)
  const [form, setForm] = useState({ nome: '', segmento: '', faturamento_pct: '', tags: [] as string[] })
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const data = await getClientesEstrategicos(clientId)
    setClientes(data as ClienteEstrategico[])
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  function abrirModal(cliente?: ClienteEstrategico) {
    if (cliente) {
      setEditando(cliente)
      setForm({ nome: cliente.nome, segmento: cliente.segmento, faturamento_pct: String(cliente.faturamento_pct), tags: cliente.tags ?? [] })
    } else {
      setEditando(null)
      setForm({ nome: '', segmento: '', faturamento_pct: '', tags: [] })
    }
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    await upsertClienteEstrategico(clientId, {
      id: editando?.id,
      nome: form.nome,
      segmento: form.segmento,
      faturamento_pct: parseFloat(form.faturamento_pct) || 0,
      tags: form.tags,
    })
    setSalvando(false)
    setModal(false)
    carregar()
  }

  async function excluir(id: string) {
    await deleteClienteEstrategico(id)
    carregar()
  }

  // Painel de padrões: tags mais frequentes entre top 3 por faturamento
  const top3 = [...clientes].slice(0, 3)
  const todasTags = top3.flatMap(c => c.tags ?? [])
  const frequencia: Record<string, number> = {}
  todasTags.forEach(t => { frequencia[t] = (frequencia[t] ?? 0) + 1 })
  const padroes = Object.entries(frequencia).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cadastre seus clientes atuais e o percentual de faturamento que cada um representa.</p>
        <button onClick={() => abrirModal()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
          + Adicionar Cliente
        </button>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhum cliente cadastrado ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clientes.map((c, i) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 mt-1">#{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground text-sm">{c.nome}</span>
                  {c.segmento && <span className="text-xs text-muted-foreground">{c.segmento}</span>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(c.tags ?? []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-secondary rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-primary">{c.faturamento_pct}%</span>
                <button onClick={() => abrirModal(c)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
                <button onClick={() => excluir(c.id)} className="text-xs text-red-500 hover:text-red-400">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {padroes.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3">
          <h3 className="font-semibold text-foreground text-sm">Padrões dos Top Clientes</h3>
          <p className="text-xs text-muted-foreground">Características mais comuns entre os 3 maiores clientes por faturamento.</p>
          <div className="flex flex-wrap gap-2">
            {padroes.map(([tag, count]) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 text-xs bg-primary/10 text-primary rounded-full font-medium">
                {tag} <span className="text-primary/60">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">{editando ? 'Editar Cliente' : 'Adicionar Cliente'}</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nome</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Segmento</label>
                <input value={form.segmento} onChange={e => setForm(p => ({ ...p, segmento: e.target.value }))}
                  placeholder="Ex: Incorporadoras, Tecnologia..."
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">% do Faturamento</label>
                <input type="number" min="0" max="100" value={form.faturamento_pct} onChange={e => setForm(p => ({ ...p, faturamento_pct: e.target.value }))}
                  placeholder="Ex: 25"
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Características (tags)</label>
                <TagInput tags={form.tags} onChange={tags => setForm(p => ({ ...p, tags }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção: Mercados Potenciais ───────────────────────────────
function MercadosPotenciais({ clientId }: { clientId: string }) {
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [anotacoes, setAnotacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const [comps, qs] = await Promise.all([
      getCompetencias(clientId),
      getQuemSomos(clientId),
    ])
    setCompetencias(comps as Competencia[])
    if (qs) {
      const quemSomosData = qs as Record<string, unknown>
      setAnotacoes((quemSomosData.anotacoes_mercados_potenciais as string) ?? '')
    }
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const err = await upsertQuemSomos(clientId, { anotacoes_mercados_potenciais: anotacoes })
    setMsg(err ? 'Erro ao salvar.' : 'Salvo!')
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-foreground">Competências Atuais</h3>
        <p className="text-sm text-muted-foreground">
          Com base nas suas competências abaixo, pense: para quais mercados você poderia prestar serviço?
        </p>
        {competencias.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma competência cadastrada. Adicione na aba <strong>Quem Somos</strong>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {competencias.map(c => (
              <span key={c.id} className="px-3 py-1 text-sm bg-secondary rounded-full">
                {c.descricao}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-foreground">Anotações Estratégicas</h3>
        <p className="text-sm text-muted-foreground">
          Quais mercados poderiam ser atendidos? Quais produtos/serviços esse perfil consumiria?
        </p>
        <textarea
          rows={6}
          value={anotacoes}
          onChange={e => setAnotacoes(e.target.value)}
          placeholder="Ex: Empresas de loteamento no interior do PR poderiam usar nosso serviço de aprovação..."
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Seção: Mapeamento de Mercados ────────────────────────────
function MapeamentoMercados({ clientId }: { clientId: string }) {
  const [mercados, setMercados] = useState<Mercado[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Mercado | null>(null)
  const [form, setForm] = useState({ nome: '', potencial: '', prioridade: '0' })
  const [salvando, setSalvando] = useState(false)
  const [criandoObj, setCriandoObj] = useState<string | null>(null)
  const [msgObj, setMsgObj] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    const data = await getMercados(clientId)
    setMercados(data as Mercado[])
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  function abrirModal(mercado?: Mercado) {
    if (mercado) {
      setEditando(mercado)
      setForm({ nome: mercado.nome, potencial: mercado.potencial ?? '', prioridade: String(mercado.prioridade ?? 0) })
    } else {
      setEditando(null)
      setForm({ nome: '', potencial: '', prioridade: '0' })
    }
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    await upsertMercado(clientId, {
      id: editando?.id,
      nome: form.nome,
      potencial: form.potencial,
      prioridade: parseInt(form.prioridade) || 0,
    })
    setSalvando(false)
    setModal(false)
    carregar()
  }

  async function excluir(id: string) {
    await deleteMercado(id)
    carregar()
  }

  async function criarObjetivo(mercado: Mercado) {
    setCriandoObj(mercado.id)
    const err = await criarObjetivoDoMercado(clientId, mercado.nome)
    setMsgObj(prev => ({ ...prev, [mercado.id]: err ? 'Erro ao criar objetivo.' : 'Objetivo criado em /okr!' }))
    setCriandoObj(null)
    setTimeout(() => setMsgObj(prev => ({ ...prev, [mercado.id]: '' })), 4000)
  }

  function badgePotencial(p: string) {
    const cores: Record<string, string> = {
      'Muito Alto': 'bg-emerald-500/10 text-emerald-600',
      'Alto': 'bg-blue-500/10 text-blue-600',
      'Médio': 'bg-amber-500/10 text-amber-600',
      'Baixo': 'bg-red-500/10 text-red-500',
    }
    return cores[p] ?? 'bg-secondary text-muted-foreground'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Mapeie os mercados que você atende ou quer atender. Mercados priorizados podem virar objetivos no OKR.</p>
        <button onClick={() => abrirModal()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
          + Adicionar Mercado
        </button>
      </div>

      {mercados.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhum mercado mapeado ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mercados.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground text-sm">{m.nome}</span>
                <div className="flex items-center gap-2">
                  {m.potencial && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badgePotencial(m.potencial)}`}>
                      {m.potencial}
                    </span>
                  )}
                  {m.prioridade > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                      Prioridade {m.prioridade}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {msgObj[m.id] && <span className="text-xs text-muted-foreground">{msgObj[m.id]}</span>}
                {m.prioridade > 0 && (
                  <button
                    onClick={() => criarObjetivo(m)}
                    disabled={criandoObj === m.id}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    {criandoObj === m.id ? 'Criando...' : '+ Criar Objetivo'}
                  </button>
                )}
                <button onClick={() => abrirModal(m)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
                <button onClick={() => excluir(m.id)} className="text-xs text-red-500 hover:text-red-400">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">{editando ? 'Editar Mercado' : 'Adicionar Mercado'}</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nome do Mercado</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Incorporadoras de loteamentos"
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Potencial Estimado</label>
                <select value={form.potencial} onChange={e => setForm(p => ({ ...p, potencial: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecionar...</option>
                  {NIVEIS_POTENCIAL.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Prioridade (0 = sem prioridade)</label>
                <input type="number" min="0" max="10" value={form.prioridade} onChange={e => setForm(p => ({ ...p, prioridade: e.target.value }))}
                  className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção: ICP ───────────────────────────────────────────────
function ICPSection({ clientId }: { clientId: string }) {
  const [dados, setDados] = useState<ICPData>({})
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const data = await getICP(clientId)
    if (data) setDados(data as ICPData)
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const err = await upsertICP(clientId, dados)
    setMsg(err ? 'Erro ao salvar.' : 'ICP salvo com sucesso!')
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function gerarComIA() {
    setGerando(true)
    setMsg('')
    try {
      const [clientes, mercados, competencias, quemSomos] = await Promise.all([
        getClientesEstrategicos(clientId),
        getMercados(clientId),
        getCompetencias(clientId),
        getQuemSomos(clientId),
      ])

      const contexto = {
        clientes_top: (clientes as ClienteEstrategico[]).slice(0, 5).map(c => ({
          nome: c.nome, segmento: c.segmento, faturamento_pct: c.faturamento_pct, tags: c.tags,
        })),
        mercados_priorizados: (mercados as Mercado[]).filter(m => m.prioridade > 0).map(m => m.nome),
        competencias: (competencias as Competencia[]).map(c => c.descricao),
        diferencial: (quemSomos as QuemSomosData)?.diferencial ?? '',
        problemas_resolve: (quemSomos as QuemSomosData)?.problemas_resolve ?? '',
      }

      const res = await fetch('/api/sugerir-icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto }),
      })

      if (!res.ok) throw new Error('Erro na API')
      const sugestao = await res.json()
      setDados(prev => ({ ...prev, ...sugestao }))
      setMsg('Sugestão gerada! Revise e salve.')
    } catch {
      setMsg('Erro ao gerar sugestão. Tente novamente.')
    }
    setGerando(false)
  }

  function campo(key: string, label: string, placeholder = '') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <input
          value={dados[key] ?? ''}
          onChange={e => setDados(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
          className="px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground">Ideal Customer Profile</h3>
            <p className="text-sm text-muted-foreground mt-1">Defina o perfil do cliente ideal com base em tudo que foi preenchido nas abas anteriores.</p>
          </div>
          <button
            onClick={gerarComIA}
            disabled={gerando}
            className="shrink-0 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {gerando ? (
              <><span className="animate-spin">⟳</span> Gerando...</>
            ) : (
              '✦ Sugerir com IA'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campo('segmento', 'Segmento', 'Ex: Incorporadoras de loteamentos')}
          {campo('porte', 'Porte', 'Ex: Médio (5-50 colaboradores)')}
          {campo('regiao', 'Região', 'Ex: Sul e Centro-Oeste')}
          {campo('dor_principal', 'Dor Principal', 'Ex: Aprovação e regularização')}
          {campo('canal', 'Canal de Chegada', 'Ex: Indicação')}
          {campo('ticket_medio', 'Ticket Médio', 'Ex: R$ 50k - R$ 200k')}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar ICP'}
          </button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────
export default function EstrategiaPage() {
  const { empresa } = useEmpresaStore()
  const [abaAtiva, setAbaAtiva] = useState(0)

  if (!empresa) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Selecione uma empresa para continuar.</div>
    )
  }

  const clientId = empresa.id

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estratégia de Mercado</h1>
        <p className="text-sm text-muted-foreground mt-1">Diagnóstico estratégico: melhores clientes, mercados promissores e perfil ideal de cliente.</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {ABAS.map((aba, i) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(i)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              abaAtiva === i
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {aba}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {abaAtiva === 0 && <QuemSomos clientId={clientId} />}
        {abaAtiva === 1 && <MelhoresClientes clientId={clientId} />}
        {abaAtiva === 2 && <MercadosPotenciais clientId={clientId} />}
        {abaAtiva === 3 && <MapeamentoMercados clientId={clientId} />}
        {abaAtiva === 4 && <ICPSection clientId={clientId} />}
      </div>
    </div>
  )
}