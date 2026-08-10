'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import {
  getDocumentos, uploadDocumento, getUrlDownload, deleteDocumento,
  CATEGORIAS_BIBLIOTECA, type BibliotecaDocumento,
} from '@/lib/queries/biblioteca'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { formatDate, formatBytes, mensagemErroExclusao } from '@/lib/utils'
import { Library, Plus, Download, X, UploadCloud, Check, BookOpen, Trash2 } from 'lucide-react'

// ── Estante: paleta e variação por documento ──────────────────────────────
// Cada categoria tem 3 tons (efeito de lombadas variadas) e uma cor de faixa
// decorativa. Largura/altura variam por um hash estável do id do documento,
// pra parecer uma estante real (livros de tamanhos diferentes), sem
// recalcular a cada re-render.

const CATEGORIA_TONS: Record<string, string[]> = {
  'Cultura': ['#4c2f7a', '#5f3f95', '#7550b0'],
  'Estratégia': ['#1c3f70', '#264d8c', '#3160ab'],
  'Pessoas': ['#7a4f18', '#966024', '#b17431'],
  'Financeiro': ['#1c5943', '#237055', '#2c8768'],
  'Outros': ['#3d3935', '#4c4742', '#5c564f'],
}
const CATEGORIA_FAIXA: Record<string, string> = {
  'Cultura': '#c9a9f5',
  'Estratégia': '#9fc4ff',
  'Pessoas': '#f0c987',
  'Financeiro': '#8fe3c3',
  'Outros': '#d8d3ca',
}
const CATEGORIA_COR_CHIP: Record<string, string> = {
  'Cultura': 'bg-violet-100 text-violet-700',
  'Estratégia': 'bg-blue-100 text-blue-700',
  'Pessoas': 'bg-amber-100 text-amber-700',
  'Financeiro': 'bg-emerald-100 text-emerald-700',
  'Outros': 'bg-gray-100 text-gray-600',
}

const LARGURAS = [40, 46, 52, 58]
const ALTURAS = [168, 184, 200]

function hashDoc(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

function extensaoDoc(nome: string) {
  const idx = nome.lastIndexOf('.')
  return idx === -1 ? '' : nome.slice(idx + 1).toUpperCase()
}

function tomDoDocumento(doc: BibliotecaDocumento) {
  const tons = CATEGORIA_TONS[doc.categoria] ?? CATEGORIA_TONS['Outros']
  return tons[hashDoc(doc.id) % tons.length]
}

function LombadaLivro({
  doc, podeGerenciar, baixando, onBaixar, onExcluir, onFoco, onDesfoco,
}: {
  doc: BibliotecaDocumento
  podeGerenciar: boolean
  baixando: string | null
  onBaixar: (doc: BibliotecaDocumento) => void
  onExcluir: (doc: BibliotecaDocumento) => void
  onFoco: (doc: BibliotecaDocumento) => void
  onDesfoco: (doc: BibliotecaDocumento) => void
}) {
  const faixa = CATEGORIA_FAIXA[doc.categoria] ?? CATEGORIA_FAIXA['Outros']
  const tom = tomDoDocumento(doc)
  const largura = LARGURAS[hashDoc(`${doc.id}w`) % LARGURAS.length]
  const altura = ALTURAS[hashDoc(`${doc.id}h`) % ALTURAS.length]
  const ext = extensaoDoc(doc.nome)

  return (
    <div
      className="group/book relative shrink-0 self-end"
      style={{ width: largura, height: altura }}
      onMouseEnter={() => onFoco(doc)}
    >
      {podeGerenciar && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExcluir(doc) }}
          title={`Excluir ${doc.nome}`}
          aria-label={`Excluir ${doc.nome}`}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 flex items-center justify-center opacity-70 group-hover/book:opacity-100 group-focus-within/book:opacity-100 transition-opacity shadow-sm"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onBaixar(doc)}
        onFocus={() => onFoco(doc)}
        onBlur={() => onDesfoco(doc)}
        disabled={baixando === doc.id}
        aria-label={`Baixar ${doc.nome}`}
        className="relative w-full h-full rounded-t-[5px] rounded-b-[2px] flex flex-col items-center overflow-hidden transition-transform duration-200 ease-out group-hover/book:-translate-y-3 focus-visible:-translate-y-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-60"
        style={{
          background: `linear-gradient(90deg, rgba(255,255,255,.24) 0%, transparent 16%, transparent 84%, rgba(0,0,0,.22) 100%), ${tom}`,
          boxShadow: '2px 2px 5px rgba(30,20,10,.28), -1px 0 0 rgba(255,255,255,.10) inset',
        }}
      >
        <span className="w-full h-[3px] mt-3 shrink-0" style={{ background: faixa, opacity: 0.85 }} />
        <span className="flex-1 min-h-0 w-full flex items-center justify-center py-1.5">
          <span
            className="block max-h-full overflow-hidden whitespace-nowrap text-ellipsis text-[10.5px] font-semibold tracking-wide text-white/95"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {doc.nome}
          </span>
        </span>
        <span className="w-full h-[3px] mb-2.5 shrink-0" style={{ background: faixa, opacity: 0.85 }} />
        {ext && <span className="mb-2 text-[7.5px] font-bold tracking-widest text-white/65 shrink-0">{ext}</span>}
      </button>
    </div>
  )
}

function Prateleira({ categoria, documentos, podeGerenciar, baixando, onBaixar, onExcluir, onFoco, onDesfoco }: {
  categoria: string
  documentos: BibliotecaDocumento[]
  podeGerenciar: boolean
  baixando: string | null
  onBaixar: (doc: BibliotecaDocumento) => void
  onExcluir: (doc: BibliotecaDocumento) => void
  onFoco: (doc: BibliotecaDocumento) => void
  onDesfoco: (doc: BibliotecaDocumento) => void
}) {
  return (
    <section id={`estante-${categoria}`} className="scroll-mt-4">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">{categoria}</h2>
        <span className="text-[11px] text-muted-foreground">
          {documentos.length} documento{documentos.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1 px-1 pt-3">
          {documentos.map((doc) => (
            <LombadaLivro
              key={doc.id}
              doc={doc}
              podeGerenciar={podeGerenciar}
              baixando={baixando}
              onBaixar={onBaixar}
              onExcluir={onExcluir}
              onFoco={onFoco}
              onDesfoco={onDesfoco}
            />
          ))}
        </div>
        {/* Tábua da prateleira */}
        <div
          className="h-3 rounded-[3px] mx-1"
          style={{
            background: 'linear-gradient(180deg, #b98653 0%, #96683c 55%, #74502c 100%)',
            boxShadow: '0 8px 12px -6px rgba(59,33,14,.5), inset 0 1px 0 rgba(255,255,255,.3)',
          }}
        />
        <div className="h-2 mx-2 rounded-b-[3px] opacity-40" style={{ background: 'linear-gradient(180deg, rgba(59,33,14,.35), transparent)' }} />
      </div>
    </section>
  )
}

function ModalEnviarDocumento({
  open, categorias, onClose, onSuccess, clientId, autorNome, userId,
}: {
  open: boolean; categorias: string[]; onClose: () => void; onSuccess: () => void
  clientId: string; autorNome: string; userId: string
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [categoria, setCategoria] = useState(categorias[0] ?? 'Outros')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function handleFechar() {
    setArquivo(null)
    setErro('')
    onClose()
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    setEnviando(true)
    setErro('')
    const { error } = await uploadDocumento({ clientId, file: arquivo, categoria, autorNome, userId })
    setEnviando(false)
    if (error) {
      setErro('Erro ao enviar o documento. Tente novamente.')
      return
    }
    setArquivo(null)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleFechar} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Enviar documento</h2>
        <form onSubmit={handleEnviar} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Arquivo</label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl border border-dashed border-border bg-background hover:border-primary/40 hover:bg-accent/30 transition-colors text-left"
            >
              <UploadCloud className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="min-w-0 flex-1 truncate text-foreground">
                {arquivo ? arquivo.name : 'Escolher arquivo...'}
              </span>
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={handleFechar}
              className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!arquivo || enviando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {enviando ? 'Enviando...' : <><Check className="w-3.5 h-3.5" /> Enviar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BibliotecaPage() {
  const { empresa } = useEmpresaStore()

  const [documentos, setDocumentos] = useState<BibliotecaDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [podeGerenciar, setPodeGerenciar] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [userId, setUserId] = useState('')
  const [baixando, setBaixando] = useState<string | null>(null)
  const [docEmFoco, setDocEmFoco] = useState<BibliotecaDocumento | null>(null)

  const [modalEnviar, setModalEnviar] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; doc: BibliotecaDocumento | null; loading: boolean; erro: string | null }>({ open: false, doc: null, loading: false, erro: null })

  const fetchData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const { data } = await getDocumentos(empresa.id)
    setDocumentos(data ?? [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!empresa) return
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: role }, { data: func }] = await Promise.all([
        supabase.from('user_company_roles').select('permission_level').eq('user_id', user.id).eq('client_id', empresa!.id).maybeSingle(),
        supabase.from('funcionarios').select('full_name').eq('user_id', user.id).maybeSingle(),
      ])
      setPodeGerenciar(role?.permission_level === 'administrador' || role?.permission_level === 'gestor')
      if (func) setNomeUsuario(func.full_name?.split(' ')[0] ?? '')
    }
    init()
  }, [empresa])

  async function handleBaixar(doc: BibliotecaDocumento) {
    setBaixando(doc.id)
    const { url } = await getUrlDownload(doc.storage_path)
    setBaixando(null)
    if (url) window.open(url, '_blank')
  }

  async function handleExcluir() {
    if (!modalExcluir.doc) return
    setModalExcluir((prev) => ({ ...prev, loading: true, erro: null }))
    const { error } = await deleteDocumento(modalExcluir.doc.id, modalExcluir.doc.storage_path)
    if (error) {
      setModalExcluir((prev) => ({ ...prev, loading: false, erro: mensagemErroExclusao(error, 'registros') }))
      return
    }
    setModalExcluir({ open: false, doc: null, loading: false, erro: null })
    fetchData()
  }

  const categoriasComDocs = CATEGORIAS_BIBLIOTECA.filter((c) => documentos.some((d) => d.categoria === c))

  function handlePular(categoria: string) {
    document.getElementById(`estante-${categoria}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleDesfoco(doc: BibliotecaDocumento) {
    setDocEmFoco((atual) => (atual?.id === doc.id ? null : atual))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Biblioteca</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {empresa?.company_name} — {documentos.length > 0
                ? `${documentos.length} documento${documentos.length !== 1 ? 's' : ''} em ${categoriasComDocs.length} estante${categoriasComDocs.length !== 1 ? 's' : ''}`
                : 'código de cultura, materiais de pessoas e outros documentos'}
            </p>
          </div>
        </div>
        {podeGerenciar && (
          <button
            onClick={() => setModalEnviar(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" /> Enviar documento
          </button>
        )}
      </div>

      {categoriasComDocs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categoriasComDocs.map((c) => (
            <button
              key={c}
              onClick={() => handlePular(c)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${CATEGORIA_COR_CHIP[c] ?? CATEGORIA_COR_CHIP['Outros']} hover:opacity-80`}
            >
              {c} ({documentos.filter((d) => d.categoria === c).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-44 rounded-2xl bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">Nenhum documento na biblioteca ainda.</p>
          {podeGerenciar && (
            <button onClick={() => setModalEnviar(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
              <Plus className="w-4 h-4" /> Enviar primeiro documento
            </button>
          )}
        </div>
      ) : (
        <div
          data-tour="tour-biblioteca"
          className="rounded-3xl border border-border bg-gradient-to-b from-amber-50/50 to-transparent p-5 md:p-7 space-y-6"
          onMouseLeave={() => setDocEmFoco(null)}
        >
          {/* Painel de detalhes — mostra o título por extenso (na horizontal, sem
              corte) do livro em foco, já que na lombada ele vai vertical e apertado. */}
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3 min-h-[60px]">
            {docEmFoco ? (
              <>
                <div
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold text-white/90"
                  style={{ background: tomDoDocumento(docEmFoco) }}
                >
                  {extensaoDoc(docEmFoco.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2" title={docEmFoco.nome}>
                    {docEmFoco.nome}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {docEmFoco.categoria} · {formatBytes(docEmFoco.tamanho_bytes)} · {formatDate(docEmFoco.created_at)}
                    {docEmFoco.autor_nome ? ` · enviado por ${docEmFoco.autor_nome}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleBaixar(docEmFoco)}
                    disabled={baixando === docEmFoco.id}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {baixando === docEmFoco.id ? 'Abrindo...' : 'Baixar'}
                  </button>
                  {podeGerenciar && (
                    <button
                      onClick={() => setModalExcluir({ open: true, doc: docEmFoco, loading: false, erro: null })}
                      className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title={`Excluir ${docEmFoco.nome}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="w-4 h-4 shrink-0" /> Passe o mouse (ou navegue com Tab) sobre um livro pra ver o título completo aqui. Clique nele pra baixar.
              </p>
            )}
          </div>

          <div className="space-y-9">
            {categoriasComDocs.map((categoria) => (
              <Prateleira
                key={categoria}
                categoria={categoria}
                documentos={documentos.filter((d) => d.categoria === categoria)}
                podeGerenciar={podeGerenciar}
                baixando={baixando}
                onBaixar={handleBaixar}
                onExcluir={(doc) => setModalExcluir({ open: true, doc, loading: false, erro: null })}
                onFoco={setDocEmFoco}
                onDesfoco={handleDesfoco}
              />
            ))}
          </div>
        </div>
      )}

      <ModalEnviarDocumento
        open={modalEnviar}
        categorias={CATEGORIAS_BIBLIOTECA}
        clientId={empresa?.id ?? ''}
        autorNome={nomeUsuario}
        userId={userId}
        onClose={() => setModalEnviar(false)}
        onSuccess={fetchData}
      />

      <ModalConfirmarExclusao
        open={modalExcluir.open}
        titulo="Excluir documento"
        descricao="Esta ação não pode ser desfeita."
        loading={modalExcluir.loading}
        erro={modalExcluir.erro}
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, doc: null, loading: false, erro: null })}
      />
    </div>
  )
}
