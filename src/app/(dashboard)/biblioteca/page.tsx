'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { createClient } from '@/lib/supabase/client'
import {
  getDocumentos, uploadDocumento, getUrlDownload, deleteDocumento,
  CATEGORIAS_BIBLIOTECA, type BibliotecaDocumento,
} from '@/lib/queries/biblioteca'
import ModalConfirmarExclusao from '@/components/okr/ModalConfirmarExclusao'
import { formatDate, formatBytes } from '@/lib/utils'
import { Library, Plus, FileText, Download, Trash2, X, UploadCloud, Check } from 'lucide-react'

const CATEGORIA_COR: Record<string, string> = {
  'Cultura': 'bg-violet-100 text-violet-700',
  'Estratégia': 'bg-blue-100 text-blue-700',
  'Pessoas': 'bg-amber-100 text-amber-700',
  'Financeiro': 'bg-emerald-100 text-emerald-700',
  'Outros': 'bg-gray-100 text-gray-600',
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
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [baixando, setBaixando] = useState<string | null>(null)

  const [modalEnviar, setModalEnviar] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<{ open: boolean; doc: BibliotecaDocumento | null; loading: boolean }>({ open: false, doc: null, loading: false })

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
    setModalExcluir((prev) => ({ ...prev, loading: true }))
    await deleteDocumento(modalExcluir.doc.id, modalExcluir.doc.storage_path)
    setModalExcluir({ open: false, doc: null, loading: false })
    fetchData()
  }

  const categoriasComDocs = CATEGORIAS_BIBLIOTECA.filter((c) => documentos.some((d) => d.categoria === c))
  const documentosFiltrados = documentos.filter((d) => !categoriaFiltro || d.categoria === categoriaFiltro)

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
              {empresa?.company_name} — Código de cultura, materiais de pessoas e outros documentos
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

      {categoriasComDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoriaFiltro('')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${categoriaFiltro === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            Todos ({documentos.length})
          </button>
          {categoriasComDocs.map((c) => (
            <button
              key={c}
              onClick={() => setCategoriaFiltro(c)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${categoriaFiltro === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              {c} ({documentos.filter((d) => d.categoria === c).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Library className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">
            {documentos.length === 0 ? 'Nenhum documento na biblioteca ainda.' : 'Nenhum documento nessa categoria.'}
          </p>
          {podeGerenciar && documentos.length === 0 && (
            <button onClick={() => setModalEnviar(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
              <Plus className="w-4 h-4" /> Enviar primeiro documento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentosFiltrados.map((doc) => (
            <div
              key={doc.id}
              className="group bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2" title={doc.nome}>
                    {doc.nome}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COR[doc.categoria] ?? CATEGORIA_COR['Outros']}`}>
                    {doc.categoria}
                  </span>
                </div>
                {podeGerenciar && (
                  <button
                    onClick={() => setModalExcluir({ open: true, doc, loading: false })}
                    className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatBytes(doc.tamanho_bytes)} · {formatDate(doc.created_at)}</span>
                {doc.autor_nome && <span className="truncate max-w-[40%]">{doc.autor_nome}</span>}
              </div>

              <button
                onClick={() => handleBaixar(doc)}
                disabled={baixando === doc.id}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {baixando === doc.id ? 'Abrindo...' : 'Baixar'}
              </button>
            </div>
          ))}
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
        onConfirmar={handleExcluir}
        onClose={() => setModalExcluir({ open: false, doc: null, loading: false })}
      />
    </div>
  )
}
