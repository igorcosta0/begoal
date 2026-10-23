'use client'

import { useMemo, useState } from 'react'
import { Check, Download, Link2, Mail } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { linkConvite, marcarConvidados, montarConvite, noFiltro, type Participante, type Pesquisa } from '@/lib/queries/pesquisas'
import { baixarPlanilhaConvites } from '@/lib/pesquisaImportacao'

// Convites e lembretes da lista de participantes (guia do Miro, etapa 3, F30
// e F56). Sem serviço de e-mail: cada convite abre no e-mail do administrador
// com a mensagem e o link da pessoa, ou sai numa planilha para mala direta
// (Gmail/Outlook). "Convidado em" é marcado quando o administrador abre o
// e-mail ou confirma o envio da mala direta.

type Aba = 'nao_convidados' | 'faltam' | 'todos'

const LIMITE_VISIVEL = 100

interface Props {
  pesquisa: Pesquisa
  participantes: Participante[]
  onMudou: () => void
  abaInicial?: Aba
  somenteLeitura?: boolean // Visualizador: vê a lista e o status, sem enviar nada
}

export default function ListaConvites({ pesquisa, participantes, onMudou, abaInicial = 'nao_convidados', somenteLeitura = false }: Props) {
  const [aba, setAba] = useState<Aba>(abaInicial)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [baixados, setBaixados] = useState<string[] | null>(null)

  const doPublico = useMemo(() => participantes.filter((p) => noFiltro(pesquisa.filtro ?? {}, p)), [participantes, pesquisa.filtro])
  const grupos: Record<Aba, Participante[]> = {
    nao_convidados: doPublico.filter((p) => !p.convidado_em && !p.respondeu_em),
    faltam: doPublico.filter((p) => !p.respondeu_em),
    todos: doPublico,
  }
  const lista = grupos[aba]
  const visiveis = mostrarTodos ? lista : lista.slice(0, LIMITE_VISIVEL)

  async function abrirEmail(p: Participante) {
    const { assunto, mensagem } = montarConvite(pesquisa, p)
    window.location.href = `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`
    if (!p.convidado_em) {
      await marcarConvidados([p.id])
      onMudou()
    }
  }

  async function copiarLink(p: Participante) {
    try {
      await navigator.clipboard.writeText(linkConvite(p.token))
      setCopiado(p.id)
      setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 2000)
    } catch {
      window.prompt('Copie o link:', linkConvite(p.token))
    }
  }

  async function baixarMalaDireta() {
    setAviso(null)
    const nome = `convites-${pesquisa.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase()}.xlsx`
    await baixarPlanilhaConvites(nome, lista.map((p) => {
      const { assunto, mensagem } = montarConvite(pesquisa, p)
      return { nome: p.nome, email: p.email, setor: p.setor, cargo: p.cargo, link: linkConvite(p.token), assunto, mensagem }
    }))
    setBaixados(lista.filter((p) => !p.convidado_em).map((p) => p.id))
  }

  async function confirmarEnvio() {
    if (!baixados?.length) return
    const { error } = await marcarConvidados(baixados)
    if (error) return setAviso(error)
    setAviso(`${baixados.length} ${baixados.length === 1 ? 'pessoa marcada' : 'pessoas marcadas'} como convidadas.`)
    setBaixados(null)
    onMudou()
  }

  const ROTULO: Record<Aba, string> = { nao_convidados: 'Não convidados', faltam: 'Faltam responder', todos: 'Todos' }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-0.5 bg-secondary rounded-lg p-0.5 w-fit">
          {(Object.keys(ROTULO) as Aba[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAba(a); setMostrarTodos(false); setBaixados(null) }}
              aria-pressed={aba === a}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                aba === a ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {ROTULO[a]} <span className="font-mono text-muted-foreground">{grupos[a].length}</span>
            </button>
          ))}
        </div>
        {!somenteLeitura && <button
          type="button"
          onClick={baixarMalaDireta}
          disabled={!lista.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-foreground hover:bg-secondary disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> Planilha para mala direta
        </button>}
      </div>

      {baixados && baixados.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <span>Depois de enviar a mala direta, marque {baixados.length === 1 ? 'a pessoa' : `as ${baixados.length} pessoas`} como convidadas.</span>
          <button type="button" onClick={confirmarEnvio} className="font-semibold text-primary hover:underline">Marcar como convidadas</button>
        </div>
      )}
      {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {aba === 'nao_convidados' ? 'Todo mundo já foi convidado.' : aba === 'faltam' ? 'Todos já responderam.' : 'Ninguém na lista.'}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {visiveis.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{p.nome}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.email}{(p.setor || p.cargo) && ` · ${[p.setor, p.cargo].filter(Boolean).join(' · ')}`}
                </p>
              </div>
              <span
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 hidden sm:inline',
                  p.respondeu_em ? 'bg-emerald-100 text-emerald-700' : p.convidado_em ? 'bg-secondary text-foreground' : 'bg-amber-100 text-amber-800'
                )}
              >
                {p.respondeu_em ? `Respondeu ${formatDate(p.respondeu_em)}` : p.convidado_em ? `Convidado ${formatDate(p.convidado_em)}` : 'Não convidado'}
              </span>
              {!p.respondeu_em && !somenteLeitura && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirEmail(p)}
                    title={p.convidado_em ? 'Lembrar por e-mail' : 'Convidar por e-mail'}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary"
                  >
                    <Mail className="w-3.5 h-3.5" /> {p.convidado_em ? 'Lembrar' : 'Convidar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copiarLink(p)}
                    aria-label={`Copiar o link de ${p.nome}`}
                    title="Copiar link"
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {copiado === p.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!mostrarTodos && lista.length > LIMITE_VISIVEL && (
        <button type="button" onClick={() => setMostrarTodos(true)} className="text-xs font-medium text-primary hover:underline">
          Mostrar todos os {lista.length}
        </button>
      )}
    </div>
  )
}
