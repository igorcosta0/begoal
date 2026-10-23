'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, MessageSquareHeart } from 'lucide-react'
import {
  getConvite, perguntasFaltando, responderConvite,
  type ConvitePesquisa, type Respostas,
} from '@/lib/queries/pesquisas'
import FormularioPesquisa from '@/components/pesquisa/FormularioPesquisa'

// Link individual da lista de participantes (guia do Miro, etapa 3, F32):
// a pessoa responde sem login e sem se identificar de novo. O token vale uma
// resposta; tudo passa pelas funções pesquisa_convite_* do banco.

type Etapa = 'carregando' | 'invalido' | 'fora' | 'ja' | 'pausada' | 'encerrada' | 'formulario' | 'enviada'

export default function ResponderConvitePage({ params }: { params: { token: string } }) {
  const { token } = params
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [convite, setConvite] = useState<ConvitePesquisa | null>(null)
  const [respostas, setRespostas] = useState<Respostas>({})
  const [faltando, setFaltando] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    getConvite(token).then(({ data }) => {
      if (!data) return setEtapa('invalido')
      setConvite(data)
      setEtapa(
        data.ja_respondeu ? 'ja'
          : !data.no_publico ? 'fora'
          : data.status === 'pausada' ? 'pausada'
          : data.status === 'encerrada' ? 'encerrada'
          : 'formulario'
      )
    })
  }, [token])

  async function enviar() {
    if (!convite) return
    const falta = perguntasFaltando(convite.perguntas, respostas)
    setFaltando(falta)
    if (falta.length) {
      setErro('Responda as perguntas obrigatórias marcadas.')
      document.getElementById(`pergunta-${falta[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    setErro(null)
    const { error } = await responderConvite(token, respostas)
    setEnviando(false)
    if (error) return setErro(error)
    setEtapa('enviada')
    window.scrollTo({ top: 0 })
  }

  const icone = <Lock className="w-6 h-6 text-muted-foreground" />

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="max-w-2xl mx-auto">
        {convite && (
          <div className="flex items-center gap-2 mb-6 text-sm font-medium text-muted-foreground">
            <MessageSquareHeart className="w-4 h-4 text-primary" />
            {convite.empresa}
          </div>
        )}

        {etapa === 'carregando' && <div className="h-48 rounded-2xl bg-card/60 border border-border animate-pulse" />}

        {etapa === 'invalido' && (
          <Aviso icone={icone} titulo="Link inválido">
            Este convite não existe ou o link está incompleto. Confira o endereço recebido.
          </Aviso>
        )}
        {etapa === 'fora' && convite && (
          <Aviso icone={icone} titulo={convite.titulo}>Este convite não faz parte do público desta pesquisa.</Aviso>
        )}
        {etapa === 'ja' && convite && (
          <Aviso icone={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} titulo={convite.titulo}>
            Você já respondeu esta pesquisa. Obrigado!
          </Aviso>
        )}
        {etapa === 'pausada' && convite && (
          <Aviso icone={icone} titulo={convite.titulo}>
            Esta pesquisa está pausada no momento. Tente de novo mais tarde, pelo mesmo link.
          </Aviso>
        )}
        {etapa === 'encerrada' && convite && (
          <Aviso icone={icone} titulo={convite.titulo}>Esta pesquisa já foi encerrada e não recebe mais respostas.</Aviso>
        )}
        {etapa === 'enviada' && convite && (
          <Aviso icone={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} titulo="Resposta enviada">
            Obrigado, {convite.nome}! Sua opinião ajuda a {convite.empresa} a melhorar.
          </Aviso>
        )}

        {etapa === 'formulario' && convite && (
          <>
            <p className="text-sm text-muted-foreground">Olá, {convite.nome}!</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1">{convite.titulo}</h1>
            {convite.descricao && <p className="text-muted-foreground mt-2 whitespace-pre-line">{convite.descricao}</p>}
            <div className="mt-6">
              <FormularioPesquisa perguntas={convite.perguntas} respostas={respostas} onChange={setRespostas} faltando={faltando} />
              {erro && <div className="mt-4 px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}
              <button onClick={enviar} disabled={enviando} className="mt-5 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {enviando ? 'Enviando...' : 'Enviar resposta'}
              </button>
            </div>
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
