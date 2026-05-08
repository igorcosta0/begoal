'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, User, Building2, Calendar, X, Zap } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ModalTaticasKrProps {
  open: boolean
  kr: any | null
  onClose: () => void
}

const statusColor = (status: string) => {
  if (status === 'Concluído') return 'bg-green-100 text-green-700'
  if (status === 'Em Andamento') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

export default function ModalTaticasKr({ open, kr, onClose }: ModalTaticasKrProps) {
  const [taticas, setTaticas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !kr) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('taticas')
      .select(`
        id, descricao, concluida, prazo, Status,
        funcionarios!responsavel_id(full_name),
        setores!setor_id(name)
      `)
      .eq('kr_id', kr.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: any }) => {
        setTaticas(data ?? [])
        setLoading(false)
      })
  }, [open, kr])

  if (!open || !kr) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Táticas do KR</p>
              <h2 className="text-sm font-semibold text-foreground leading-snug">{kr.titulo}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : taticas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhuma tática vinculada</p>
              <p className="text-xs text-muted-foreground">Adicione táticas a este KR na página de Táticas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Resumo */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/50 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{taticas.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-emerald-600">{taticas.filter(t => t.concluida).length}</p>
                  <p className="text-[10px] text-muted-foreground">Concluídas</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-amber-600">{taticas.filter(t => !t.concluida).length}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
              </div>

              {/* Lista */}
              {taticas.map((tatica) => (
                <div
                  key={tatica.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border border-border hover:shadow-sm transition-shadow ${tatica.concluida ? 'opacity-60' : ''}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {tatica.concluida
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <Circle className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium text-foreground leading-snug ${tatica.concluida ? 'line-through' : ''}`}>
                      {tatica.descricao}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                      {tatica.funcionarios && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tatica.funcionarios.full_name}
                        </span>
                      )}
                      {tatica.setores && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {tatica.setores.name}
                        </span>
                      )}
                      {tatica.prazo && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tatica.prazo)}
                        </span>
                      )}
                    </div>
                  </div>
                  {tatica.Status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(tatica.Status)}`}>
                      {tatica.Status}
                    </span>
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