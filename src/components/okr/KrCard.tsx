'use client'

import { useState } from 'react'
import { cn, formatPercent, formatNumber, formatValor, getProgressColor, getProgressStatus, paraData } from '@/lib/utils'
import { MoreHorizontal, TrendingUp, User, Building2, Calendar, Zap, ClipboardList, CheckCircle2, Activity } from 'lucide-react'
import { ROTULO_APURACAO, type ApuracaoKr, type DirecaoKr, type MetaMensalKr, type PontoSerie } from '@/lib/okrProgresso'
import MiniGrafico, { Tendencia } from './MiniGrafico'

interface KrCardProps {
  kr: {
    id: string
    titulo: string
    valor_atual?: number
    meta?: number
    valor_inicial?: number
    progresso?: number | null // null = sem lançamentos
    valor_apurado?: number | null
    binario?: boolean
    apuracao?: string
    direcao_efetiva?: DirecaoKr
    serie?: PontoSerie[]
    metas_mensais?: MetaMensalKr[]
    tipo_valor?: string
    end_date?: string
    data_ultimo_lancamento?: string | null
    responsavel?: { full_name: string }
    setor?: { nome?: string; name?: string }
    objetivo?: { titulo: string }
    concluido?: boolean
    sinais_vitais_count?: number
  }
  onLancar?: (kr: any) => void
  onEditar?: (kr: any) => void
  onFinalizar?: (kr: any) => void
  onExcluir?: (kr: any) => void
  onVerGrafico?: (kr: any) => void
  onReativar?: (kr: any) => void
  onVerTaticas?: (kr: any) => void
  onEditarLancamentos?: (kr: any) => void
  onVerSinaisVitais?: (kr: any) => void
}

export default function KrCard({
  kr,
  onLancar,
  onEditar,
  onFinalizar,
  onExcluir,
  onVerGrafico,
  onReativar,
  onVerTaticas,
  onEditarLancamentos,
  onVerSinaisVitais,
}: KrCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const semDados = kr.progresso === null || kr.progresso === undefined
  const progresso = kr.progresso ?? 0
  const apuracao: ApuracaoKr = kr.apuracao === 'soma' || kr.apuracao === 'media' ? kr.apuracao : 'ultimo'
  const serie = kr.serie ?? []
  const barColor = kr.concluido
    ? 'bg-gray-400'
    : semDados
    ? 'bg-muted'
    : progresso >= 70
    ? 'bg-green-500'
    : progresso >= 40
    ? 'bg-yellow-500'
    : 'bg-red-500'
  const setorNome = kr.setor?.nome ?? kr.setor?.name
  const endDate = kr.end_date
    ? paraData(kr.end_date).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    : null

  const dataUltimoLancamento = kr.data_ultimo_lancamento
    ? new Date(kr.data_ultimo_lancamento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null

  return (
    <div className="relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-snug flex-1">
          {kr.titulo}
        </p>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />}
          {menuOpen && (
            <div className="absolute right-0 top-7 bg-popover border border-border rounded-xl shadow-lg z-20 min-w-40 py-1">
              <button
                onClick={() => { onVerGrafico?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-3 h-3" />
                Ver gráfico
              </button>
              <button
                onClick={() => { onVerTaticas?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Zap className="w-3 h-3" />
                Táticas
              </button>
              {onVerSinaisVitais && (
                <button
                  onClick={() => { onVerSinaisVitais(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <Activity className="w-3 h-3" />
                  Sinais vitais
                </button>
              )}
              <button
                onClick={() => { onEditarLancamentos?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2"
              >
                <ClipboardList className="w-3 h-3" />
                Editar lançamentos
              </button>
              <button
                onClick={() => { onEditar?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
              >
                Editar KR
              </button>
              {!kr.concluido ? (
                <button
                  onClick={() => { onFinalizar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-blue-600"
                >
                  Finalizar KR
                </button>
              ) : (
                <button
                  onClick={() => { onReativar?.(kr); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-green-600"
                >
                  Reativar KR
                </button>
              )}
              <button
                onClick={() => { onExcluir?.(kr); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors text-destructive"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Progresso
            {kr.direcao_efetiva === 'menor' && <span className="ml-1 text-[10px]">(quanto menor, melhor)</span>}
          </span>
          <span className="font-semibold text-foreground">
            {semDados
              ? 'Sem lançamentos'
              : kr.binario
              ? progresso >= 100 ? 'Dentro da meta' : 'Fora da meta'
              : formatPercent(progresso)}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Valor Inicial</p>
          <p className="text-sm font-semibold text-foreground">
            {formatValor(kr.valor_inicial ?? 0, kr.tipo_valor)}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">{ROTULO_APURACAO[apuracao]}</p>
          <p className="text-sm font-semibold text-foreground">
            {semDados ? '—' : formatValor(kr.valor_apurado ?? 0, kr.tipo_valor)}
          </p>
          {dataUltimoLancamento && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {dataUltimoLancamento}
            </p>
          )}
        </div>
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
          <p className="text-sm font-semibold text-foreground">
            {formatValor(kr.meta ?? 0, kr.tipo_valor)}
          </p>
        </div>
      </div>

      {/* Série de lançamentos + variação em relação ao lançamento anterior */}
      {serie.length >= 1 && (
        <div className="space-y-1.5">
          <MiniGrafico
            serie={serie}
            meta={kr.meta}
            metasMensais={kr.metas_mensais}
            acumular={apuracao === 'soma'}
            direcao={kr.direcao_efetiva ?? 'maior'}
            tipoValor={kr.tipo_valor}
            onAbrir={onVerGrafico ? () => onVerGrafico(kr) : undefined}
          />
          <div className="flex items-center justify-between gap-2">
          <Tendencia serie={serie} direcao={kr.direcao_efetiva ?? 'maior'} tipoValor={kr.tipo_valor} />
          {onVerGrafico && (
            <button
              onClick={() => onVerGrafico(kr)}
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <TrendingUp className="w-3 h-3" />
              Gráfico completo
            </button>
          )}
          </div>
        </div>
      )}

      {/* Responsável, Setor e Data */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {kr.responsavel && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            {kr.responsavel.full_name}
          </span>
        )}
        {setorNome && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 shrink-0" />
            {setorNome}
          </span>
        )}
        {endDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            Referente à {endDate}
          </span>
        )}
      </div>

      {/* Sinais vitais ligados ao KR (só aparece quando há algum) */}
      {onVerSinaisVitais && (kr.sinais_vitais_count ?? 0) > 0 && (
        <button
          onClick={() => onVerSinaisVitais(kr)}
          className="w-full py-2 px-4 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5 text-primary" />
          Sinais vitais
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
            {kr.sinais_vitais_count}
          </span>
        </button>
      )}

      {/* Ação */}
      {kr.concluido ? (
        <div className="w-full py-2 px-4 bg-secondary text-muted-foreground rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> KR Finalizado
        </div>
      ) : (
        <button
          onClick={() => onLancar?.(kr)}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity mt-1"
        >
          Lançar valor
        </button>
      )}
    </div>
  )
}