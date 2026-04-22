'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-senha/confirmar`,
      }
    )

    if (resetError) {
      setError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 px-8 text-center">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-semibold text-foreground">
            E-mail enviado!
          </h2>
          <p className="text-sm text-muted-foreground">
            Verifique sua caixa de entrada e siga as instruções para
            redefinir sua senha.
          </p>
          
          <a
            href="/login"
            className="inline-block text-sm text-primary hover:underline"
          >
            Voltar para o login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-8">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Recuperar senha
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Lembrou a senha?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Voltar para o login
          </a>
        </p>

      </div>
    </div>
  )
}