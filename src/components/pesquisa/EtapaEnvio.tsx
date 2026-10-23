'use client'

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Globe, ListChecks, Upload, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CONVITE_ASSUNTO_PADRAO, CONVITE_MENSAGEM_PADRAO, montarConvite, noFiltro,
  type ConfigEnvio, type FiltroPublico, type FuncionarioPublico, type ParticipanteRascunho, type PublicoPesquisa,
} from '@/lib/queries/pesquisas'
import { baixarModeloPlanilha, lerPlanilha, type ResultadoImportacao } from '@/lib/pesquisaImportacao'

// Passo "Envio" do assistente (guia do Miro, etapa 3, M3): quem responde
// (funcionários, lista importada ou link aberto), a quem se aplica (F36–F39),
// o convite (F31) e a repetição (F40).

const inputCls = 'mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

type Dimensao = 'setores' | 'cargos' | 'clientes'
type AplicarPor = 'todos' | Dimensao

const ROTULO_DIMENSAO: Record<Dimensao, string> = { setores: 'Por área', cargos: 'Por cargo', clientes: 'Por cliente' }
const CAMPO_DIMENSAO = { setores: 'setor', cargos: 'cargo', clientes: 'cliente' } as const

export const OPCOES_REPETIR: { valor: number | null; label: string }[] = [
  { valor: null, label: 'Não repetir' },
  { valor: 1, label: 'Todo mês' },
  { valor: 2, label: 'A cada 2 meses' },
  { valor: 3, label: 'A cada 3 meses' },
  { valor: 6, label: 'A cada 6 meses' },
  { valor: 12, label: 'Uma vez por ano' },
]

// Quantas pessoas recebem, com o filtro atual.
export function contarPublico(envio: ConfigEnvio, funcionarios: FuncionarioPublico[], participantes: ParticipanteRascunho[]): number | null {
  if (envio.publico === 'interna') return funcionarios.filter((f) => f.user_id && noFiltro(envio.filtro, f)).length
  if (envio.publico === 'lista') return participantes.filter((p) => noFiltro(envio.filtro, p)).length
  return null
}

function aplicarPorDe(f: FiltroPublico): AplicarPor {
  if (f.setores?.length) return 'setores'
  if (f.cargos?.length) return 'cargos'
  if (f.clientes?.length) return 'clientes'
  return 'todos'
}

function Chips({ opcoes, marcados, onChange }: { opcoes: { valor: string; qtd: number }[]; marcados: string[]; onChange: (v: string[]) => void }) {
  if (!opcoes.length) return <p className="text-xs text-muted-foreground">Nenhum valor preenchido nesta coluna.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map(({ valor, qtd }) => {
        const on = marcados.includes(valor)
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? marcados.filter((m) => m !== valor) : [...marcados, valor])}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-secondary'
            )}
          >
            {valor} <span className={cn('font-mono', on ? 'opacity-80' : 'text-muted-foreground')}>{qtd}</span>
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  envio: ConfigEnvio
  onEnvio: (mudanca: Partial<ConfigEnvio>) => void
  participantes: ParticipanteRascunho[]
  onParticipantes: (p: ParticipanteRascunho[]) => void
  funcionarios: FuncionarioPublico[]
  titulo: string
}

export default function EtapaEnvio({ envio, onEnvio, participantes, onParticipantes, funcionarios, titulo }: Props) {
  const [aplicarPor, setAplicarPor] = useState<AplicarPor>(() => aplicarPorDe(envio.filtro))
  const [importacao, setImportacao] = useState<Pick<ResultadoImportacao, 'problemas' | 'linhasLidas'> | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const inputArquivo = useRef<HTMLInputElement>(null)

  // Base de pessoas para os filtros: cadastro (interna) ou planilha (lista).
  const pessoas = useMemo(() => (envio.publico === 'interna'
    ? funcionarios.filter((f) => f.user_id).map((f) => ({ setor: f.setor, cargo: f.cargo, cliente: null as string | null }))
    : participantes), [envio.publico, funcionarios, participantes])

  const opcoes = useMemo(() => {
    const contar = (campo: 'setor' | 'cargo' | 'cliente') => {
      const m = new Map<string, number>()
      for (const p of pessoas) { const v = p[campo]; if (v) m.set(v, (m.get(v) ?? 0) + 1) }
      return Array.from(m.entries()).map(([valor, qtd]) => ({ valor, qtd })).sort((a, b) => a.valor.localeCompare(b.valor))
    }
    return { setores: contar('setor'), cargos: contar('cargo'), clientes: contar('cliente') }
  }, [pessoas])

  const dimensoes: Dimensao[] = envio.publico === 'lista' ? ['setores', 'cargos', 'clientes'] : ['setores', 'cargos']
  const total = envio.publico === 'interna' ? pessoas.length : participantes.length
  const noPublico = pessoas.filter((p) => noFiltro(envio.filtro, p)).length

  function escolherPublico(publico: PublicoPesquisa) {
    if (publico === envio.publico) return
    setAplicarPor('todos')
    onEnvio({ publico, filtro: {} })
  }

  function escolherAplicarPor(a: AplicarPor) {
    setAplicarPor(a)
    onEnvio({ filtro: {} })
  }

  async function importar(arquivo: File | undefined) {
    if (!arquivo) return
    setErroArquivo(null)
    setLendo(true)
    try {
      const r = await lerPlanilha(arquivo)
      onParticipantes(r.participantes)
      setImportacao({ problemas: r.problemas, linhasLidas: r.linhasLidas })
      setAplicarPor('todos')
      onEnvio({ filtro: {} })
      if (!r.participantes.length) setErroArquivo('Nenhuma linha válida na planilha. Confira os problemas abaixo.')
    } catch (e) {
      setErroArquivo(e instanceof Error ? e.message : 'Não foi possível ler a planilha.')
    } finally {
      setLendo(false)
      if (inputArquivo.current) inputArquivo.current.value = ''
    }
  }

  const exemplo = participantes.find((p) => noFiltro(envio.filtro, p))
  const previaConvite = exemplo
    ? montarConvite({ titulo, convite_assunto: envio.convite_assunto, convite_mensagem: envio.convite_mensagem }, { nome: exemplo.nome, token: 'link-individual' })
    : null

  return (
    <div className="space-y-6">
      {/* Quem responde */}
      <div>
        <p className="text-sm font-semibold text-foreground">Quem vai responder?</p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            ['interna', Users, 'Funcionários', 'Respondem logados no Begoal. Respostas anônimas.'],
            ['lista', ListChecks, 'Lista de participantes', 'Você importa uma planilha. Cada pessoa recebe um link próprio, sem login.'],
            ['externa', Globe, 'Link aberto', 'Um link e um QR Code para quem você quiser: clientes, eventos, balcão.'],
          ] as const).map(([v, Icon, label, desc]) => (
            <button
              key={v}
              type="button"
              onClick={() => escolherPublico(v)}
              className={cn(
                'flex flex-col text-left rounded-xl border p-3 transition-colors',
                envio.publico === v ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-secondary'
              )}
            >
              <Icon className="w-4 h-4 text-primary mb-1.5" />
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista: importação */}
      {envio.publico === 'lista' && (
        <div className="space-y-3">
          <input
            ref={inputArquivo}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => importar(e.target.files?.[0])}
          />
          {participantes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <FileSpreadsheet className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground mt-2">Importe a planilha de participantes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Colunas obrigatórias: Nome e E-mail. Opcionais: Setor, Cargo, Tempo de empresa, Estado e Cliente.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={lendo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" /> {lendo ? 'Lendo...' : 'Escolher planilha'}
                </button>
                <button
                  type="button"
                  onClick={() => baixarModeloPlanilha()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar modelo
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{participantes.length} {participantes.length === 1 ? 'pessoa' : 'pessoas'}</span> na lista
                  {importacao && importacao.problemas.length > 0 && (
                    <span className="text-amber-700"> · {importacao.problemas.length} {importacao.problemas.length === 1 ? 'linha ficou' : 'linhas ficaram'} de fora</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => inputArquivo.current?.click()}
                  disabled={lendo}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-60"
                >
                  <Upload className="w-3.5 h-3.5" /> {lendo ? 'Lendo...' : 'Trocar planilha'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      {['Nome', 'E-mail', 'Setor', 'Cargo', 'Tempo', 'Estado', 'Cliente'].map((c) => (
                        <th key={c} className="text-left font-medium px-2.5 py-1.5 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participantes.slice(0, 5).map((p) => (
                      <tr key={p.email} className="border-t border-border">
                        {[p.nome, p.email, p.setor, p.cargo, p.tempo_empresa, p.estado, p.cliente].map((v, i) => (
                          <td key={i} className={cn('px-2.5 py-1.5 whitespace-nowrap', v ? 'text-foreground' : 'text-muted-foreground')}>{v ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {participantes.length > 5 && <p className="text-[11px] text-muted-foreground">Mostrando 5 de {participantes.length}.</p>}
            </div>
          )}
          {erroArquivo && <p className="text-xs text-red-600">{erroArquivo}</p>}
          {importacao && importacao.problemas.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <summary className="cursor-pointer font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Ver as linhas que ficaram de fora
              </summary>
              <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto">
                {importacao.problemas.map((p) => <li key={p.linha}>Linha {p.linha}: {p.motivo}</li>)}
              </ul>
              <p className="mt-2">Corrija na planilha e importe de novo, se quiser incluir essas pessoas.</p>
            </details>
          )}
        </div>
      )}

      {/* A quem se aplica */}
      {(envio.publico === 'interna' || (envio.publico === 'lista' && participantes.length > 0)) && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Aplicar a</p>
            <p className="text-xs text-muted-foreground">
              Vai para <span className="font-semibold text-foreground font-mono">{noPublico}</span> de {total} {total === 1 ? 'pessoa' : 'pessoas'}
            </p>
          </div>
          <div className="flex flex-wrap gap-0.5 bg-secondary rounded-lg p-0.5 w-fit">
            {(['todos', ...dimensoes] as AplicarPor[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => escolherAplicarPor(a)}
                aria-pressed={aplicarPor === a}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  aplicarPor === a ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {a === 'todos' ? (envio.publico === 'interna' ? 'Empresa inteira' : 'Todos da lista') : ROTULO_DIMENSAO[a]}
              </button>
            ))}
          </div>
          {aplicarPor !== 'todos' && (
            <Chips
              opcoes={opcoes[aplicarPor]}
              marcados={envio.filtro[aplicarPor] ?? []}
              onChange={(v) => onEnvio({ filtro: v.length ? { [aplicarPor]: v } : {} })}
            />
          )}
          {aplicarPor !== 'todos' && !(envio.filtro[aplicarPor]?.length) && (
            <p className="text-[11px] text-muted-foreground">
              Marque {aplicarPor === 'setores' ? 'as áreas' : aplicarPor === 'cargos' ? 'os cargos' : 'os clientes'} que vão receber a pesquisa.
            </p>
          )}
          {envio.publico === 'interna' && aplicarPor !== 'todos' && pessoas.some((p) => !p[CAMPO_DIMENSAO[aplicarPor]]) && (
            <p className="text-[11px] text-muted-foreground">
              Quem está sem {aplicarPor === 'setores' ? 'área' : 'cargo'} no cadastro não entra quando você escolhe por {aplicarPor === 'setores' ? 'área' : 'cargo'}.
            </p>
          )}
        </div>
      )}

      {/* Convite da lista */}
      {envio.publico === 'lista' && participantes.length > 0 && (
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Convite</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sai do seu e-mail depois de publicar. Use <code className="font-mono">{'{nome}'}</code>, <code className="font-mono">{'{titulo}'}</code> e{' '}
              <code className="font-mono">{'{link}'}</code>: cada pessoa recebe o próprio nome e o próprio link.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Assunto</label>
            <input value={envio.convite_assunto ?? CONVITE_ASSUNTO_PADRAO} onChange={(e) => onEnvio({ convite_assunto: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Mensagem</label>
            <textarea
              value={envio.convite_mensagem ?? CONVITE_MENSAGEM_PADRAO}
              onChange={(e) => onEnvio({ convite_mensagem: e.target.value })}
              rows={6}
              className={cn(inputCls, 'resize-y')}
            />
          </div>
          {previaConvite && exemplo && (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground mb-1">Como {exemplo.nome.split(' ')[0]} vai receber:</p>
              <p className="text-xs font-semibold text-foreground">{previaConvite.assunto}</p>
              <p className="text-xs text-foreground whitespace-pre-line mt-1">{previaConvite.mensagem}</p>
            </div>
          )}
        </div>
      )}

      {/* Link aberto */}
      {envio.publico === 'externa' && (
        <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={envio.pede_identificacao}
            onChange={(e) => onEnvio({ pede_identificacao: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">Pedir e-mail, nome e empresa antes de responder</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              {envio.pede_identificacao
                ? 'Cada e-mail responde uma vez, e você vê quem respondeu.'
                : 'Qualquer pessoa com o link responde, sem se identificar. Não dá para impedir respostas repetidas.'}
            </span>
          </span>
        </label>
      )}

      {/* Repetição */}
      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="repetir">Repetir esta pesquisa</label>
        <select
          id="repetir"
          value={envio.repetir_meses ?? ''}
          onChange={(e) => onEnvio({ repetir_meses: e.target.value ? Number(e.target.value) : null })}
          className="mt-1 block px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {OPCOES_REPETIR.map((o) => <option key={o.label} value={o.valor ?? ''}>{o.label}</option>)}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">
          Quando chegar a data, o card da pesquisa avisa e oferece reaplicar com as mesmas perguntas e o mesmo público.
        </p>
      </div>
    </div>
  )
}
