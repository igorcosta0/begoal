'use client'

import { useCallback, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import {
  getMetasDoCiclo,
  createMeta,
  updateMeta,
  deleteMeta,
  LIMITE_METAS_POR_PESSOA,
  type MetaAvaliacao,
} from '@/lib/queries/avaliacao'
import { cn, mensagemErroGravacao } from '@/lib/utils'
import { ChevronRight, Lock, Pencil, Plus, Target, Trash2 } from 'lucide-react'

// ── Metas individuais do ciclo (pedido 21/10/2026) ──────────────────────────
// Usado em dois lugares da tela de Avaliação: na aba "Metas" do ciclo
// (administrador/calibrador, empresa toda) e na seção "Metas dos meus
// liderados" (líder, só quem responde a ele no organograma). Quem pode editar
// cada pessoa segue a mesma regra da RLS (pode_editar_metas): administrador
// até o ciclo encerrar; o gestor no organograma só com o ciclo em rascunho.

export interface PessoaMetas {
  id: string
  full_name: string
  cargo: string | null
  gestor_id?: string | null
}

interface Props {
  ciclo: { id: string; status: 'rascunho' | 'ativo' | 'encerrado' }
  pessoas: PessoaMetas[]
  souAdministrador: boolean
  meuFuncionarioId: string | null
  fotosPorFuncionarioId: Record<string, string>
  /** Avisa a tela quando as metas mudam (ela usa a contagem para travar a ativação). */
  onChange?: (metas: MetaAvaliacao[]) => void
}

// O banco devolve as mensagens dos gatilhos (ex.: limite de 5 metas) com o
// código P0001; as outras passam pela mensagem padrão de gravação.
function mensagemErro(error: { code?: string; message?: string } | null, linhas?: number | null) {
  if (error?.code === 'P0001' && error.message) return error.message
  return mensagemErroGravacao(error, linhas)
}

export default function PainelMetas({ ciclo, pessoas, souAdministrador, meuFuncionarioId, fotosPorFuncionarioId, onChange }: Props) {
  const [metas, setMetas] = useState<MetaAvaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  // Formulário de nova meta / edição: só um aberto por vez.
  const [form, setForm] = useState<{ pessoaId: string; metaId: string | null; titulo: string; descricao: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getMetasDoCiclo(ciclo.id)
    if (error) setErro('Não foi possível carregar as metas.')
    setMetas(data)
    onChange?.(data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclo.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  function podeEditar(p: PessoaMetas) {
    if (ciclo.status === 'encerrado') return false
    if (souAdministrador) return true
    return ciclo.status === 'rascunho' && !!meuFuncionarioId && p.gestor_id === meuFuncionarioId
  }

  function atualizarLista(novas: MetaAvaliacao[]) {
    setMetas(novas)
    onChange?.(novas)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const titulo = form.titulo.trim()
    if (!titulo) {
      setErro('Escreva o título da meta.')
      return
    }
    setSalvando(true)
    setErro('')
    const descricao = form.descricao.trim() || null
    if (form.metaId) {
      const { data, error } = await updateMeta(form.metaId, { titulo, descricao })
      const msg = mensagemErro(error, data?.length)
      if (msg) {
        setErro(msg)
        setSalvando(false)
        return
      }
      atualizarLista(metas.map((m) => (m.id === form.metaId ? { ...m, titulo, descricao } : m)))
    } else {
      const ordem = metas.filter((m) => m.funcionario_id === form.pessoaId).length
      const { data, error } = await createMeta({ ciclo_id: ciclo.id, funcionario_id: form.pessoaId, titulo, descricao, ordem })
      const msg = mensagemErro(error)
      if (msg || !data) {
        setErro(msg ?? 'Não foi possível salvar. Tente novamente.')
        setSalvando(false)
        return
      }
      atualizarLista([...metas, data as MetaAvaliacao])
    }
    setSalvando(false)
    setForm(null)
  }

  async function handleExcluir(meta: MetaAvaliacao) {
    const aviso = ciclo.status === 'rascunho'
      ? `Excluir a meta "${meta.titulo}"?`
      : `Excluir a meta "${meta.titulo}"? As notas já dadas nela também são apagadas.`
    if (!window.confirm(aviso)) return
    setErro('')
    const { data, error } = await deleteMeta(meta.id)
    const msg = mensagemErro(error, data?.length)
    if (msg) {
      setErro(msg)
      return
    }
    atualizarLista(metas.filter((m) => m.id !== meta.id))
  }

  const semMetas = pessoas.filter((p) => !metas.some((m) => m.funcionario_id === p.id))

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        {ciclo.status === 'rascunho' ? (
          <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <p className="text-xs text-muted-foreground">
          {ciclo.status === 'rascunho'
            ? `Cadastre de 1 a ${LIMITE_METAS_POR_PESSOA} metas para cada pessoa. Elas formam a parte de Desempenho (50%) da avaliação; a Cultura continua igual para todos. Quando o ciclo for ativado, as metas travam.`
            : ciclo.status === 'ativo'
              ? 'Ciclo ativo: as metas estão travadas. Só o administrador pode corrigir uma meta.'
              : 'Ciclo encerrado: as metas não mudam mais.'}
        </p>
      </div>

      {!loading && ciclo.status === 'rascunho' && semMetas.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {semMetas.length === 1 ? '1 pessoa ainda está sem metas' : `${semMetas.length} pessoas ainda estão sem metas`}. O ciclo só pode ser ativado quando todo avaliado tiver pelo menos uma.
        </p>
      )}

      {erro && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{erro}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-md bg-secondary animate-pulse" />)}
        </div>
      ) : pessoas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pessoa para cadastrar metas.</p>
      ) : (
        <div className="space-y-2">
          {pessoas.map((p) => {
            const metasDaPessoa = metas.filter((m) => m.funcionario_id === p.id)
            const editavel = podeEditar(p)
            const expandida = aberta === p.id
            return (
              <div key={p.id} className="rounded-md border border-border bg-background">
                <button
                  type="button"
                  onClick={() => { setAberta(expandida ? null : p.id); setForm(null); setErro('') }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', expandida && 'rotate-90')} />
                  <Avatar nome={p.full_name} fotoUrl={fotosPorFuncionarioId[p.id]} sizeClassName="w-8 h-8 text-xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                    {p.cargo && <p className="text-xs text-muted-foreground truncate">{p.cargo}</p>}
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                      metasDaPessoa.length === 0 ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {metasDaPessoa.length === 0 ? 'Sem metas' : metasDaPessoa.length === 1 ? '1 meta' : `${metasDaPessoa.length} metas`}
                  </span>
                </button>

                {expandida && (
                  <div className="border-t border-border p-3 space-y-2">
                    {metasDaPessoa.length === 0 && form?.pessoaId !== p.id && (
                      <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada ainda.</p>
                    )}

                    {metasDaPessoa.map((m, idx) =>
                      form?.metaId === m.id ? (
                        <FormMeta
                          key={m.id}
                          form={form}
                          salvando={salvando}
                          onChange={setForm}
                          onCancelar={() => setForm(null)}
                          onSubmit={handleSalvar}
                        />
                      ) : (
                        <div key={m.id} className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-2">
                          <span className="text-xs font-semibold text-primary mt-0.5 shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{m.titulo}</p>
                            {m.descricao && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{m.descricao}</p>}
                          </div>
                          {editavel && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setForm({ pessoaId: p.id, metaId: m.id, titulo: m.titulo, descricao: m.descricao ?? '' })}
                                title="Editar meta"
                                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluir(m)}
                                title="Excluir meta"
                                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {form?.pessoaId === p.id && !form.metaId && (
                      <FormMeta form={form} salvando={salvando} onChange={setForm} onCancelar={() => setForm(null)} onSubmit={handleSalvar} />
                    )}

                    {editavel && !form && metasDaPessoa.length < LIMITE_METAS_POR_PESSOA && (
                      <button
                        type="button"
                        onClick={() => setForm({ pessoaId: p.id, metaId: null, titulo: '', descricao: '' })}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar meta
                      </button>
                    )}
                    {editavel && metasDaPessoa.length >= LIMITE_METAS_POR_PESSOA && (
                      <p className="text-[11px] text-muted-foreground">Limite de {LIMITE_METAS_POR_PESSOA} metas atingido.</p>
                    )}
                    {!editavel && ciclo.status === 'rascunho' && (
                      <p className="text-[11px] text-muted-foreground">
                        Quem cadastra as metas desta pessoa é o gestor dela no organograma (ou o administrador).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FormMeta({
  form,
  salvando,
  onChange,
  onCancelar,
  onSubmit,
}: {
  form: { pessoaId: string; metaId: string | null; titulo: string; descricao: string }
  salvando: boolean
  onChange: (f: { pessoaId: string; metaId: string | null; titulo: string; descricao: string }) => void
  onCancelar: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div>
        <label className="text-xs font-medium text-foreground">Meta *</label>
        <input
          type="text"
          value={form.titulo}
          onChange={(e) => onChange({ ...form, titulo: e.target.value })}
          placeholder="Ex.: Fechar 6 contratos no semestre"
          maxLength={200}
          autoFocus
          className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground">
          Como vai ser medida <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={form.descricao}
          onChange={(e) => onChange({ ...form, descricao: e.target.value })}
          rows={2}
          placeholder="Ex.: contratos assinados no CRM até 30/06"
          className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : form.metaId ? 'Salvar meta' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
