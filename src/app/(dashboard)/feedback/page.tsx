'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { souVisualizadorFeedback } from '@/lib/utils'
import FeedbackPrototipo from '@/components/feedback/FeedbackPrototipo'

// Feedback e One on One (pedido 24/10/2026). Por enquanto é só um protótipo
// para apresentar a ideia: dados fictícios, nada é gravado no banco, e só
// Igor e Priscila veem (souVisualizadorFeedback, também usado no menu).
// O módulo de verdade depende das respostas às perguntas de "O que falta decidir".

export default function FeedbackPage() {
  const [acesso, setAcesso] = useState<'carregando' | 'liberado' | 'negado'>('carregando')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setAcesso(souVisualizadorFeedback(user?.email) ? 'liberado' : 'negado')
    })
  }, [])

  if (acesso === 'carregando') return <div className="h-40 rounded-2xl bg-card/50 border border-border animate-pulse" />
  if (acesso === 'negado') {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
        <p className="text-muted-foreground text-sm">Este módulo ainda não está disponível.</p>
      </div>
    )
  }
  return <FeedbackPrototipo />
}
