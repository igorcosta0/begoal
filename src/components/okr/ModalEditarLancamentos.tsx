'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Edit2, Check, Trash2, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ModalEditarLancamentosProps {
  open: boolean
  kr: any | null
  onClose: () => void
  onSuccess: () => void
}

export default function ModalEditarLancamentos({
  open,
  kr,
  onClose,
  onSuccess,
}: ModalEditarLancamentosProps) {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formEdicao, setFormEdicao] = useState({
    valor: '',
    data_lancamento: '',
    comentario: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const fetchLancamentos = useCallback(async () => {
    if (!kr) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('kr_lancamentos')
      .select('id, valor, data_lancamento, comentario, created_at, is_final_result')
      .eq('kr_id', kr.id)
      .order('data_lancamento', { ascending: false })
    setLancamentos(data ?? [])
    setLoading(false)
  }, [kr])

  useEffect(() => {
    if (open && kr) fetchLancamentos()
  }, [open, kr, fetchLancamentos])

  function handleIniciarEdicao(lancamento: any) {
    setEditandoId(lancamento.id)
    setFormEdicao({
      valor: String(lancamento.valor ?? ''),
      data_lancamento: lancamento.data_lancamento ?? '',
      comentario: lancamento.comentario ?? '',
    })
  }

  async function handleSalvar(id: string) {
    setSalvando(true)
    const supabase = createClient()
    await supabase
      .from('kr_lancamentos')
      .update({
        valor: parseFloat(formEdicao.valor) || 0,
        data_lancamento: formEdicao.data_lancamento || undefined,
        comentario: formEdicao.comentario || null,
      })
      .eq('id', id)

    // Atualiza valor_atual do KR com o lançamento mais recente
    const { data: ultimo } = await supabase
      .from('kr_lancamentos')
      .select('valor')
      .eq('kr_id', kr.id)
      .order('data_lancamento', { ascending: false })
      .limit(1)
      .single()

    if (ultimo) {
      await supabase
        .from('krs')
        .update({ valor_atual: ultimo.valor })
        .eq('id', kr.id)
    }

    setEditandoId(null)
    setSalvando(false)
    await fetchLancamentos()
    onSuccess()
  }

  async function handleExcluir(id: string) {
    setExcluindo(id)
    const supabase = createClient()
    await supabase.from('kr_lancamentos').delete().eq('id', id)

    // Atualiza valor_atual com o lançamento mais recente restante
    const { data: ultimo } = await supabase
      .from('kr_lancamentos')
      .select('valor')
      .eq('kr_id', kr.id)
      .order('data_lancamento', { ascending: false })
      .limit(1)
      .single()

    await supabase
      .from('krs')
      .update({ valor_atual: ultimo?.valor ?? kr.valor_inicial })
      .eq('id', kr.id)

    setExcluindo(null)
    await fetchLancamentos()
    onSuccess()
  }

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Editar Lançamentos</p>
            <h2 className="text-sm font-semibold text-foreground leading-snug">{kr.titulo}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Nenhum lançamento encontrado</p>
              <p className="text-xs text-muted-foreground">Lance um valor primeiro na página de OKRs.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lancamentos.map((lancamento) => (
                <div key={lancamento.id} className="border border-border rounded-xl overflow-hidden">
                  {editandoId === lancamento.id ? (
                    /* Modo edição */
                    <div className="p-4 bg-accent/20 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</label>
                          <input
                            type="number"
                            value={formEdicao.valor}
                            onChange={(e) => setFormEdicao({ ...formEdicao, valor: e.target.value })}
                            className="mt-1 w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</label>
                          <input
                            type="date"
                            value={formEdicao.data_lancamento}
                            onChange={(e) => setFormEdicao({ ...formEdicao, data_lancamento: e.target.value })}
                            className="mt-1 w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Comentário</label>
                        <input
                          type="text"
                          value={formEdicao.comentario}
                          onChange={(e) => setFormEdicao({ ...formEdicao, comentario: e.target.value })}
                          placeholder="Opcional..."
                          className="mt-1 w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSalvar(lancamento.id)}
                          disabled={salvando}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent"
                        >
                          <X className="w-3 h-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo visualização */
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {Number(lancamento.valor).toLocaleString('pt-BR')}
                          </p>
                          {lancamento.is_final_result && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Final</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            {lancamento.data_lancamento
                              ? new Date(lancamento.data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : '—'
                            }
                          </p>
                          {lancamento.comentario && (
                            <p className="text-[11px] text-muted-foreground truncate">"{lancamento.comentario}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleIniciarEdicao(lancamento)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExcluir(lancamento.id)}
                          disabled={excluindo === lancamento.id}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}