'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useEmpresaStore } from '@/store/useEmpresaStore'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setRole } = useAuthStore()
  const { setEmpresa } = useEmpresaStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email!,
      })

      // Buscar perfil e empresas do usuário
      const { data: profile } = await supabase
        .rpc('who_am_i')

      if (profile) {
        setRole(profile.role)
      }

      // Buscar empresas vinculadas
      const { data: empresas } = await supabase
        .from('user_company_roles')
        .select('clients(*)')
        .eq('user_id', data.user.id)

      if (empresas && empresas.length === 1) {
        const empresa = empresas[0].clients as any
        setEmpresa({
          id: empresa.id,
          company_name: empresa.company_name,
          logo_url: empresa.logo_url,
        })
        router.push('/okr')
      } else {
        router.push('/selecao-empresa')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-8">

        {/* Logo / Título */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Begoal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestão de OKRs — faça login para continuar
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
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

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
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
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Link recuperar senha */}
        <p className="text-center text-sm text-muted-foreground">
          Esqueceu a senha?{' '}
          
            href="/reset-senha"
            className="text-primary hover:underline font-medium"
          >
            Recuperar acesso
          </a>
        </p>

      </div>
    </div>
  )
}