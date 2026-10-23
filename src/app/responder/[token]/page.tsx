'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, MessageSquareHeart } from 'lucide-react'
import {
  emailJaRespondeu, getPesquisaPublica, perguntasFaltando, responderPesquisaPublica,
  type PesquisaPublica, type Respostas,
} from '@/lib/queries/pesquisas'
import FormularioPesquisa from '@/components/pesquisa/FormularioPesquisa'

// Página pública da pesquisa externa (pedido 05/10/2026). Sem login: quem
// recebe o link informa e-mail, nome completo e empresa para liberar o
// formulário. Tudo passa pelas funções pesquisa_publica_* do banco, que
// conferem o token e validam de novo cada campo.

const inputCls = 'mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Etapa = 'carregando' | 'invalida' | 'pausada' | 'encerrada' | 'identificacao' | 'formulario' | 'enviada'

export default function ResponderPesquisaPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [pesquisa, setPesquisa] = useState<PesquisaPublica | null>(null)

  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [verificando, setVerificando] = useState(false)

  const [respostas, setRespostas] = useState<Respostas>({})
  const [faltando, setFaltando] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    getPesquisaPublica(token).then(({ data }) => {
      if (!data) return setEtapa('invalida')
      setPesquisa(data)
      setEtapa(data.status === 'aberta' ? 'identificacao' : data.status === 'pausada' ? 'pausada' : 'encerrada')
    })
  }, [token])

  async function liberar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const nomeLimpo = nome.trim()
    if (!EMAIL_RE.test(email.trim())) return setErro('Informe um e-mail válido.')
    if (nomeLimpo.length < 3 || !nomeLimpo.includes(' ')) return setErro('Informe o nome completo (nome e sobrenome).')
    if (empresa.trim().length < 2) return setErro('Informe a empresa.')
    setVerificando(true)
    const ja = await emailJaRespondeu(token, email)
    setVerificando(false)
    if (ja) return setErro('Este e-mail já respondeu esta pesquisa. Obrigado!')
    setEtapa('formulario')
    window.scrollTo({ top: 0 })
  }

  async function enviar() {
    if (!pesquisa) return
    const falta = perguntasFaltando(pesquisa.perguntas, respostas)
    setFaltando(falta)
    if (falta.length) {
      setErro('Responda as perguntas obrigatórias marcadas.')
      document.getElementById(`pergunta-${falta[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    setErro(null)
    const { error } = await responderPesquisaPublica({ token, email, nome, empresa, respostas })
    setEnviando(false)
    if (error) return setErro(error)
    setEtapa('enviada')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        {pesquisa && (
          <div className="flex items-center gap-2 mb-6 text-sm font-medium text-muted-foreground">
            <MessageSquareHeart className="w-4 h-4 text-primary" />
            {pesquisa.empresa}
          </div>
        )}

        {etapa === 'carregando' && <div className="h-48 rounded-2xl bg-card/60 border border-border animate-pulse" />}

        {etapa === 'invalida' && (
          <Aviso icone={<Lock className="w-6 h-6 text-muted-foreground" />} titulo="Link inválido">
            Esta pesquisa não existe ou o link está incompleto. Confira o endereço recebido.
          </Aviso>
        )}

        {etapa === 'pausada' && pesquisa && (
          <Aviso icone={<Lock className="w-6 h-6 text-muted-foreground" />} titulo={pesquisa.titulo}>
            Esta pesquisa está pausada no momento. Tente de novo mais tarde, pelo mesmo link.
          </Aviso>
        )}

        {etapa === 'encerrada' && pesquisa && (
          <Aviso icone={<Lock className="w-6 h-6 text-muted-foreground" />} titulo={pesquisa.titulo}>
            Esta pesquisa já foi encerrada e não recebe mais respostas.
          </Aviso>
        )}

        {etapa === 'enviada' && (
          <Aviso icone={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} titulo="Resposta enviada">
            Obrigado, {nome.trim().split(' ')[0]}! Sua opinião ajuda a {pesquisa?.empresa} a melhorar.
          </Aviso>
        )}

        {(etapa === 'identificacao' || etapa === 'formulario') && pesquisa && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{pesquisa.titulo}</h1>
            {pesquisa.descricao && <p className="text-muted-foreground mt-2 whitespace-pre-line">{pesquisa.descricao}</p>}

            {etapa === 'identificacao' ? (
              <form onSubmit={liberar} className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Antes de começar, identifique-se</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Usamos esses dados só para esta pesquisa.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground" htmlFor="email">E-mail *</label>
                  <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="voce@empresa.com.br" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground" htmlFor="nome">Nome completo *</label>
                  <input id="nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Nome e sobrenome" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground" htmlFor="empresa">Empresa *</label>
                  <input id="empresa" autoComplete="organization" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputCls} placeholder="Onde você trabalha" />
                </div>
                {erro && <div className="px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}
                <button type="submit" disabled={verificando} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {verificando ? 'Verificando...' : 'Começar pesquisa'}
                </button>
              </form>
            ) : (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Respondendo como <span className="font-medium text-foreground">{nome.trim()}</span> · {empresa.trim()} ·{' '}
                  <button onClick={() => { setEtapa('identificacao'); setErro(null) }} className="text-primary hover:underline">alterar</button>
                </p>
                <FormularioPesquisa perguntas={pesquisa.perguntas} respostas={respostas} onChange={setRespostas} faltando={faltando} />
                {erro && <div className="mt-4 px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}
                <button onClick={enviar} disabled={enviando} className="mt-5 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {enviando ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-10">Pesquisa feita com Begoal</p>
      </div>
    </div>
  )
}

function Aviso({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <div className="flex justify-center mb-3">{icone}</div>
      <h1 className="text-lg font-semibold text-foreground">{titulo}</h1>
      <p className="text-sm text-muted-foreground mt-1">{children}</p>
    </div>
  )
}
